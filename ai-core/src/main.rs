mod ollama_client;
mod system_prompt;

use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use message_models::{Envelope, MessageContent};
use mqtt_client::{ClientConfig, MqttClient, QoS};
use ollama_client::OllamaClient;
use serde::{Deserialize, Serialize};
use std::io;
use std::sync::Arc;
use system_prompt::SessionStore;
use tokio::sync::{mpsc, RwLock};

/// 健康检查响应结构
#[derive(Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    message: String,
    version: String,
}

/// 健康检查接口
/// GET /health
#[get("/health")]
async fn health_check() -> impl Responder {
    let response = HealthResponse {
        status: "ok".to_string(),
        message: "CozyMind AI-Core is running".to_string(),
        version: "0.1.0".to_string(),
    };
    
    HttpResponse::Ok().json(response)
}

/// 根路径接口
#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "service": "CozyMind AI-Core",
        "version": "0.1.0",
        "status": "running",
        "features": ["health_check", "ai_services", "mqtt_client"]
    }))
}


/// 处理用户消息并发送给 Ollama
/// 
/// 这是一个独立的异步函数，用于处理从 MQTT 接收的用户消息
async fn handle_user_message(payload: Vec<u8>, ollama_client: OllamaClient) {
    // 解析 MQTT 消息
    match String::from_utf8(payload) {
        Ok(json_str) => {
            log::debug!("📝 解析用户消息: {}", json_str);
            
            // 尝试解析为 Envelope
            match Envelope::from_json(&json_str) {
                Ok(envelope) => {
                    // 提取消息内容
                    let user_prompt = match envelope.content {
                        MessageContent::Text(text) => text,
                        _ => {
                            log::warn!("⚠️  非文本消息，跳过");
                            return;
                        }
                    };
                    
                    log::info!("💬 用户提问: {}", user_prompt);
                    
                    // 调用 Ollama
                    match ollama_client.ask(&user_prompt, "gpt-oss:20b", false).await {
                        Ok(response) => {
                            log::info!("✅ Ollama 响应: {}", response);
                            // TODO: 将响应发送回 MQTT 或其他处理
                        }
                        Err(e) => {
                            log::error!("❌ Ollama 请求失败: {}", e);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("⚠️  消息解析失败，尝试作为纯文本处理: {}", e);
                    
                    // 作为纯文本处理
                    log::info!("💬 用户提问（纯文本）: {}", json_str);
                    
                    match ollama_client.ask(&json_str, "gpt-oss:20b", false).await {
                        Ok(response) => {
                            log::info!("✅ Ollama 响应: {}", response);
                        }
                        Err(e) => {
                            log::error!("❌ Ollama 请求失败: {}", e);
                        }
                    }
                }
            }
        }
        Err(e) => {
            log::error!("❌ 消息 UTF-8 解析失败: {}", e);
        }
    }
}



#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 加载环境变量
    dotenvy::dotenv().ok();
    
    // 初始化日志 - 强制使用 info 级别，不受环境变量影响
    env_logger::Builder::new()
        .filter_level(log::LevelFilter::Info)
        .init();

    // 从环境变量读取配置，如果未设置则使用默认值
    let host = std::env::var("AI_CORE_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port: u16 = std::env::var("AI_CORE_PORT")
        .unwrap_or_else(|_| "9800".to_string())
        .parse()
        .unwrap_or(9800);

    log::info!("🚀 Starting CozyMind AI-Core server...");
    log::info!("📡 Server listening on http://{}:{}", host, port);
    log::info!("🏥 Health check endpoint: http://{}:{}/health", host, port);
    log::info!("🧠 System prompt API: http://{}:{}/api/system-prompt", host, port);

    let (tx, mut rx) = mpsc::unbounded_channel();

    // 从环境变量创建 MQTT 配置
    let mqtt_config = ClientConfig::from_env(
        "AI_CORE_MQTT_CLIENT_ID",
        "BROKER_MQTT_V5_HOST",
        "BROKER_MQTT_V5_PORT",
        "MQTT_KEEP_ALIVE",
    );

    let mut mqtt_client = MqttClient::new(mqtt_config, tx);

    // 创建 Ollama 客户端（需要在 spawn 之前创建以便在异步任务中使用）
    let ollama_client_for_mqtt = OllamaClient::from_env();
    log::info!("🧠 Ollama client initialized");

    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            log::info!("📨 Received MQTT message: {:?}", message);
            match message.topic.as_str() {
                "/ai-core/from-user/message" => {
                    log::info!("📨 Received MQTT message from user");
                    
                    // 发起独立的异步任务处理用户消息
                    let payload = message.payload.clone();
                    let ollama_client = ollama_client_for_mqtt.clone();
                    
                    tokio::spawn(async move {
                        handle_user_message(payload, ollama_client).await;
                    });
                }
                "/ai-core/from-module/message" => {
                    log::info!("📨 Received MQTT message from module: {:?}", message);
                }
                _ => {
                    log::info!("📨 Received MQTT message from unknown topic: {:?}", message);
                }
            }
        }
    });

    mqtt_client.connect().await.unwrap();

    if let Some(client) = mqtt_client.client.as_ref() {
        client.subscribe("/ai-core/from-user/message", QoS::AtLeastOnce).await?;
        client.subscribe("/ai-core/from-module/message", QoS::AtLeastOnce).await?;
        // client.subscribe("topic", QoS::AtLeastOnce).await?;
    }

    // 创建 Ollama 客户端（用于 web API）
    let ollama_client = OllamaClient::from_env();
    log::info!("🧠 Ollama web client initialized");

    // 创建会话存储
    let session_store = Arc::new(SessionStore::new());
    log::info!("💾 Session store initialized");
    
    start_web(mqtt_client, ollama_client, session_store, host, port).await?;
    Ok(())
    
}

async fn start_web(
    mqtt_client: MqttClient,
    ollama_client: OllamaClient,
    session_store: Arc<SessionStore>,
    host: String,
    port: u16,
) -> io::Result<()> {
    // 创建共享状态
    let mqtt_client = Arc::new(RwLock::new(Some(mqtt_client)));
    let ollama_client = Arc::new(ollama_client);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(mqtt_client.clone()))
            .app_data(web::Data::new(ollama_client.clone()))
            .app_data(web::Data::new(session_store.clone()))
            .service(index)
            .service(health_check)
            .service(system_prompt::set_system_prompt)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
