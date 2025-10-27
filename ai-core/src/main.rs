mod ollama_client;
mod system_prompt;

use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
// use message_models::{Envelope, MessageContent};
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
async fn handle_user_message(
    payload: Vec<u8>, 
    ollama_client: OllamaClient,
    mqtt_client: Arc<RwLock<Option<MqttClient>>>,
    _client_id: String,
) {  
    // 解析 MQTT 消息
    match String::from_utf8(payload) {
        Ok(json_str) => {
            log::debug!("📝 解析用户消息: {}", json_str);
            
            // 解析用户消息，提取消息内容和客户端ID
            let user_message: Result<serde_json::Value, _> = serde_json::from_str(&json_str);
            let (message_content, user_client_id) = match user_message {
                Ok(msg) => {
                    let content = msg.get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&json_str)
                        .to_string();
                    let client_id = msg.get("client_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    (content, client_id)
                }
                Err(_) => {
                    // 如果解析失败，直接使用原始字符串
                    (json_str, "unknown".to_string())
                }
            };
            
            log::info!("📨 处理用户消息 - 客户端ID: {}, 内容: {}", user_client_id, message_content);
            
            // 调用 Ollama 处理消息
            match ollama_client.ask(&message_content, "gpt-oss:20b", false).await {
                Ok(response) => {
                    log::info!("✅ Ollama 响应: {}", response);
                    
                    // 构造回复消息
                    let reply_message = serde_json::json!({
                        "message": response,
                        "client_id": user_client_id,
                        "timestamp": chrono::Utc::now().to_rfc3339(),
                        "role": "assistant"
                    });
                    
                    // 构造回复的 topic，格式为 user/message/{client_id}
                    let reply_topic = format!("user/message/{}", user_client_id);
                    
                    // 通过 MQTT 发送回复消息
                    if let Some(client) = mqtt_client.read().await.as_ref() {
                        match client.publish_json(
                            &reply_topic,
                            &reply_message,
                            QoS::AtLeastOnce,
                            false,
                        ).await {
                            Ok(_) => {
                                log::info!("✅ 回复消息已发送到 topic: {}", reply_topic);
                            }
                            Err(e) => {
                                log::error!("❌ 发送回复消息失败: {}", e);
                            }
                        }
                    } else {
                        log::error!("❌ MQTT 客户端未连接，无法发送回复");
                    }
                }
                Err(e) => {
                    log::error!("❌ Ollama 请求失败: {}", e);
                    
                    // 发送错误回复
                    let error_message = serde_json::json!({
                        "message": format!("抱歉，处理您的消息时出现错误: {}", e),
                        "client_id": user_client_id,
                        "timestamp": chrono::Utc::now().to_rfc3339(),
                        "role": "assistant",
                        "error": true
                    });
                    
                    let reply_topic = format!("user/message/{}", user_client_id);
                    
                    if let Some(client) = mqtt_client.read().await.as_ref() {
                        if let Err(e) = client.publish_json(
                            &reply_topic,
                            &error_message,
                            QoS::AtLeastOnce,
                            false,
                        ).await {
                            log::error!("❌ 发送错误回复失败: {}", e);
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
        .format(|buf, record| {
            use std::io::Write;
            writeln!(
                buf,
                "[{} {} {}:{}] {}",
                chrono::Local::now().format("%Y-%m-%dT%H:%M:%S"),
                record.level(),
                record.file().unwrap_or("unknown"),
                record.line().unwrap_or(0),
                record.args()
            )
        })
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

    let mqtt_client = MqttClient::new(mqtt_config, tx);

    // 创建 Ollama 客户端（需要在 spawn 之前创建以便在异步任务中使用）
    let ollama_client_for_mqtt = OllamaClient::from_env();
    log::info!("🧠 Ollama client initialized");

    // 创建共享的 MQTT 客户端引用
    let mqtt_client_shared = Arc::new(RwLock::new(Some(mqtt_client)));

    // 连接MQTT客户端
    {
        let mut mqtt_client_guard = mqtt_client_shared.write().await;
        if let Some(ref mut client) = mqtt_client_guard.as_mut() {
            client.connect().await.unwrap();
            
            if let Some(client_ref) = client.client.as_ref() {
                client_ref.subscribe("/ai-core/from-user/message", QoS::AtLeastOnce).await?;
                client_ref.subscribe("/ai-core/from-module/message", QoS::AtLeastOnce).await?;
                log::info!("✅ MQTT 订阅已设置");
            }
        }
    }

    // 克隆引用用于异步任务
    let mqtt_client_for_task = mqtt_client_shared.clone();
    
    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            log::info!("📨 Received MQTT message: {:?}", message);
            match message.topic.as_str() {
                "/ai-core/from-user/message" => {
                    log::info!("📨 Received MQTT message from user");
                    
                    // 发起独立的异步任务处理用户消息
                    let payload = message.payload.clone();
                    let ollama_client = ollama_client_for_mqtt.clone();
                    let mqtt_client = mqtt_client_for_task.clone();
                    let client_id = "ai-core".to_string();
                    
                    tokio::spawn(async move {
                        handle_user_message(payload, ollama_client, mqtt_client, client_id).await;
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

    // 创建 Ollama 客户端（用于 web API）
    let ollama_client = OllamaClient::from_env();
    log::info!("🧠 Ollama web client initialized");

    // 创建会话存储
    let session_store = Arc::new(SessionStore::new());
    log::info!("💾 Session store initialized");
    
    start_web(mqtt_client_shared, ollama_client, session_store, host, port).await?;
    Ok(())
    
}

async fn start_web(
    mqtt_client: Arc<RwLock<Option<MqttClient>>>,
    ollama_client: OllamaClient,
    session_store: Arc<SessionStore>,
    host: String,
    port: u16,
) -> io::Result<()> {
    // 创建共享状态
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
