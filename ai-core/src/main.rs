use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::io;
use std::sync::Arc;
use tokio::sync::RwLock;

mod mqtt;
use mqtt::{MqttBroker, MqttConfig};

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
        "features": ["mqtt_broker", "health_check"]
    }))
}

/// MQTT Broker 状态
#[get("/mqtt/status")]
async fn mqtt_status(broker: web::Data<Arc<RwLock<Option<MqttBroker>>>>) -> impl Responder {
    let broker_guard = broker.read().await;
    if let Some(broker) = broker_guard.as_ref() {
        let stats = broker.get_stats().await;
        HttpResponse::Ok().json(serde_json::json!({
            "status": "running",
            "stats": stats
        }))
    } else {
        HttpResponse::Ok().json(serde_json::json!({
            "status": "stopped",
            "message": "MQTT Broker is not running"
        }))
    }
}

/// 启动 MQTT Broker
#[post("/mqtt/start")]
async fn mqtt_start(
    broker: web::Data<Arc<RwLock<Option<MqttBroker>>>>,
    config: web::Json<MqttConfig>,
) -> impl Responder {
    let mut broker_guard = broker.write().await;
    
    if broker_guard.is_some() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT Broker is already running"
        }));
    }

    let mut new_broker = MqttBroker::new(config.into_inner());
    match new_broker.start().await {
        Ok(_) => {
            *broker_guard = Some(new_broker);
            HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "message": "MQTT Broker started successfully"
            }))
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to start MQTT Broker: {}", e)
            }))
        }
    }
}

/// 停止 MQTT Broker
#[post("/mqtt/stop")]
async fn mqtt_stop(broker: web::Data<Arc<RwLock<Option<MqttBroker>>>>) -> impl Responder {
    let mut broker_guard = broker.write().await;
    
    if let Some(mut broker) = broker_guard.take() {
        match broker.stop().await {
            Ok(_) => {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "success",
                    "message": "MQTT Broker stopped successfully"
                }))
            }
            Err(e) => {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to stop MQTT Broker: {}", e)
                }))
            }
        }
    } else {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT Broker is not running"
        }))
    }
}

/// 发布 MQTT 消息
#[post("/mqtt/publish")]
async fn mqtt_publish(
    broker: web::Data<Arc<RwLock<Option<MqttBroker>>>>,
    request: web::Json<PublishRequest>,
) -> impl Responder {
    let broker_guard = broker.read().await;
    
    if let Some(broker) = broker_guard.as_ref() {
        match broker.publish(
            request.topic.clone(),
            request.payload.clone(),
            request.qos.unwrap_or(0),
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
            "error": "MQTT Broker is not running"
        }))
    }
}

/// 发布请求结构
#[derive(Deserialize)]
struct PublishRequest {
    topic: String,
    payload: Vec<u8>,
    qos: Option<u8>,
}

/// 获取连接的客户端列表
#[get("/mqtt/clients")]
async fn mqtt_clients(broker: web::Data<Arc<RwLock<Option<MqttBroker>>>>) -> impl Responder {
    let broker_guard = broker.read().await;
    
    if let Some(broker) = broker_guard.as_ref() {
        let clients = broker.get_connected_clients().await;
        HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "clients": clients
        }))
    } else {
        HttpResponse::BadRequest().json(serde_json::json!({
            "error": "MQTT Broker is not running"
        }))
    }
}

#[actix_web::main]
async fn main() -> io::Result<()> {
    // 初始化日志
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let port = 9800;
    let host = "127.0.0.1";

    log::info!("🚀 Starting CozyMind AI-Core server...");
    log::info!("📡 Server listening on http://{}:{}", host, port);
    log::info!("🏥 Health check endpoint: http://{}:{}/health", host, port);
    log::info!("🔌 MQTT Broker endpoints: http://{}:{}/mqtt/*", host, port);

    // 创建MQTT Broker共享状态
    let mqtt_broker = Arc::new(RwLock::new(None::<MqttBroker>));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(mqtt_broker.clone()))
            .service(index)
            .service(health_check)
            .service(mqtt_status)
            .service(mqtt_start)
            .service(mqtt_stop)
            .service(mqtt_publish)
            .service(mqtt_clients)
    })
    .bind((host, port))?
    .run()
    .await
}
