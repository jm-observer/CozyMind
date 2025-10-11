use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use mqtt_client::{ClientConfig, MqttClient, QoS};
use serde::{Deserialize, Serialize};
use std::io;
use std::sync::Arc;
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

/// MQTT 客户端状态
#[get("/mqtt/status")]
async fn mqtt_status(client: web::Data<Arc<RwLock<Option<MqttClient>>>>) -> impl Responder {
    let client_guard = client.read().await;
    if let Some(client) = client_guard.as_ref() {
        let info = client.get_client_info();
        HttpResponse::Ok().json(serde_json::json!({
            "status": "connected",
            "client_info": info
        }))
    } else {
        HttpResponse::Ok().json(serde_json::json!({
            "status": "disconnected",
            "message": "MQTT client is not connected"
        }))
    }
}


/// 断开 MQTT 连接
#[post("/mqtt/disconnect")]
async fn mqtt_disconnect(client: web::Data<Arc<RwLock<Option<MqttClient>>>>) -> impl Responder {
    let mut client_guard = client.write().await;
    
    if let Some(mut client) = client_guard.take() {
        match client.disconnect().await {
            Ok(_) => {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "success",
                    "message": "MQTT client disconnected successfully"
                }))
            }
            Err(e) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to disconnect MQTT client: {}", e)
                }))
            }
        }
    } else {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT client is not connected"
        }))
    }
}

/// 订阅主题
#[post("/mqtt/subscribe")]
async fn mqtt_subscribe(
    client: web::Data<Arc<RwLock<Option<MqttClient>>>>,
    request: web::Json<SubscribeRequest>,
) -> impl Responder {
    let client_guard = client.read().await;
    
    if let Some(client) = client_guard.as_ref() {
        let qos = match request.qos {
            0 => QoS::AtMostOnce,
            1 => QoS::AtLeastOnce,
            2 => QoS::ExactlyOnce,
            _ => QoS::AtMostOnce,
        };
        
        match client.subscribe(&request.topic, qos).await {
            Ok(_) => {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "success",
                    "message": format!("Subscribed to topic: {}", request.topic)
                }))
            }
            Err(e) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to subscribe to topic: {}", e)
                }))
            }
        }
    } else {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT client is not connected"
        }))
    }
}

/// 取消订阅主题
#[post("/mqtt/unsubscribe")]
async fn mqtt_unsubscribe(
    client: web::Data<Arc<RwLock<Option<MqttClient>>>>,
    request: web::Json<UnsubscribeRequest>,
) -> impl Responder {
    let client_guard = client.read().await;
    
    if let Some(client) = client_guard.as_ref() {
        match client.unsubscribe(&request.topic).await {
            Ok(_) => {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "success",
                    "message": format!("Unsubscribed from topic: {}", request.topic)
                }))
            }
            Err(e) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to unsubscribe from topic: {}", e)
                }))
            }
        }
    } else {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT client is not connected"
        }))
    }
}

/// 发布消息
#[post("/mqtt/publish")]
async fn mqtt_publish(
    client: web::Data<Arc<RwLock<Option<MqttClient>>>>,
    request: web::Json<PublishRequest>,
) -> impl Responder {
    let client_guard = client.read().await;
    
    if let Some(client) = client_guard.as_ref() {
        let qos = match request.qos.unwrap_or(0) {
            0 => QoS::AtMostOnce,
            1 => QoS::AtLeastOnce,
            2 => QoS::ExactlyOnce,
            _ => QoS::AtMostOnce,
        };
        
        match client.publish(
            &request.topic,
            &request.payload,
            qos,
            request.retain.unwrap_or(false),
        ).await {
            Ok(_) => {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "success",
                    "message": "Message published successfully"
                }))
            }
            Err(e) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to publish message: {}", e)
                }))
            }
        }
    } else {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT client is not connected"
        }))
    }
}

/// 订阅请求结构
#[derive(Deserialize)]
struct SubscribeRequest {
    topic: String,
    qos: u8,
}

/// 取消订阅请求结构
#[derive(Deserialize)]
struct UnsubscribeRequest {
    topic: String,
}

/// 发布请求结构
#[derive(Deserialize)]
struct PublishRequest {
    topic: String,
    payload: Vec<u8>,
    qos: Option<u8>,
    retain: Option<bool>,
}


#[actix_web::main]
async fn main() -> io::Result<()> {
    // 加载环境变量
    dotenvy::dotenv().ok();
    
    // 初始化日志
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    // 从环境变量读取配置，如果未设置则使用默认值
    let host = std::env::var("AI_CORE_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port: u16 = std::env::var("AI_CORE_PORT")
        .unwrap_or_else(|_| "9800".to_string())
        .parse()
        .unwrap_or(9800);

    log::info!("🚀 Starting CozyMind AI-Core server...");
    log::info!("📡 Server listening on http://{}:{}", host, port);
    log::info!("🏥 Health check endpoint: http://{}:{}/health", host, port);
    log::info!("🤖 AI services endpoints: http://{}:{}/ai/*", host, port);
    log::info!("🔌 MQTT client endpoints: http://{}:{}/mqtt/*", host, port);

    let (tx, mut rx) = mpsc::unbounded_channel();

    // 从环境变量创建 MQTT 配置
    let mqtt_config = ClientConfig::from_env(
        "AI_CORE_MQTT_CLIENT_ID",
        "BROKER_MQTT_V5_HOST",
        "BROKER_MQTT_V5_PORT",
        "MQTT_KEEP_ALIVE",
    );

    let mut mqtt_client = MqttClient::new(mqtt_config, tx);

    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            log::info!("📨 Received MQTT message: {:?}", message);
        }
    });

    mqtt_client.connect().await.unwrap();



    // 创建MQTT客户端共享状态
    let mqtt_client = Arc::new(RwLock::new(Some(mqtt_client)));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(mqtt_client.clone()))
            .service(index)
            .service(health_check)
            .service(mqtt_status)
            .service(mqtt_disconnect)
            .service(mqtt_subscribe)
            .service(mqtt_unsubscribe)
            .service(mqtt_publish)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
