use actix_web::{get, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::io;

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
        "status": "running"
    }))
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

    HttpServer::new(|| {
        App::new()
            .service(index)
            .service(health_check)
    })
    .bind((host, port))?
    .run()
    .await
}
