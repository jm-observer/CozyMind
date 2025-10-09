use actix_web::{web, App, HttpServer};
use actix_files as fs;
use actix_cors::Cors;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::fs as std_fs;

mod models;
mod handlers;
mod mqtt_client;

use models::*;

/// 应用状态
#[derive(Clone)]
pub struct AppState {
    pub ai_cores: Arc<RwLock<Vec<AICoreConfig>>>,
    pub ollama_configs: Arc<RwLock<Vec<OllamaConfig>>>,
    pub message_presets: Arc<RwLock<Vec<MessagePreset>>>,
    pub next_core_id: Arc<RwLock<i32>>,
    pub next_ollama_id: Arc<RwLock<i32>>,
    pub next_message_id: Arc<RwLock<i32>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            ai_cores: Arc::new(RwLock::new(Vec::new())),
            ollama_configs: Arc::new(RwLock::new(Vec::new())),
            message_presets: Arc::new(RwLock::new(Vec::new())),
            next_core_id: Arc::new(RwLock::new(1)),
            next_ollama_id: Arc::new(RwLock::new(1)),
            next_message_id: Arc::new(RwLock::new(1)),
        }
    }

    pub async fn load_data(&self) {
        // 加载 AI-Core 数据
        if let Ok(data) = std_fs::read_to_string("ai-core-data.json") {
            if let Ok(cores) = serde_json::from_str::<Vec<AICoreConfig>>(&data) {
                let mut ai_cores = self.ai_cores.write().await;
                *ai_cores = cores.clone();
                
                let max_id = cores.iter().map(|c| c.id).max().unwrap_or(0);
                let mut next_id = self.next_core_id.write().await;
                *next_id = max_id + 1;
            }
        }

        // 加载 Ollama 数据
        if let Ok(data) = std_fs::read_to_string("ollama-data.json") {
            if let Ok(configs) = serde_json::from_str::<Vec<OllamaConfig>>(&data) {
                let mut ollama_configs = self.ollama_configs.write().await;
                *ollama_configs = configs.clone();
                
                let max_id = configs.iter().map(|c| c.id).max().unwrap_or(0);
                let mut next_id = self.next_ollama_id.write().await;
                *next_id = max_id + 1;
            }
        }

        // 加载消息预设数据
        if let Ok(data) = std_fs::read_to_string("msg-pre-data.json") {
            if let Ok(presets) = serde_json::from_str::<Vec<MessagePreset>>(&data) {
                let mut message_presets = self.message_presets.write().await;
                *message_presets = presets.clone();
                
                let max_id = presets.iter().map(|m| m.id).max().unwrap_or(0);
                let mut next_id = self.next_message_id.write().await;
                *next_id = max_id + 1;
            }
        }
    }

    pub async fn save_ai_cores(&self) {
        let ai_cores = self.ai_cores.read().await;
        if let Ok(json) = serde_json::to_string_pretty(&*ai_cores) {
            let _ = std_fs::write("ai-core-data.json", json);
        }
    }

    pub async fn save_ollama_configs(&self) {
        let ollama_configs = self.ollama_configs.read().await;
        if let Ok(json) = serde_json::to_string_pretty(&*ollama_configs) {
            let _ = std_fs::write("ollama-data.json", json);
        }
    }

    pub async fn save_message_presets(&self) {
        let message_presets = self.message_presets.read().await;
        if let Ok(json) = serde_json::to_string_pretty(&*message_presets) {
            let _ = std_fs::write("msg-pre-data.json", json);
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let port = 3000;
    let host = "127.0.0.1";

    // 创建应用状态
    let state = AppState::new();
    state.load_data().await;

    let ai_cores_count = state.ai_cores.read().await.len();
    let ollama_count = state.ollama_configs.read().await.len();
    let messages_count = state.message_presets.read().await.len();

    log::info!("🚀 CozyMind API Server started");
    log::info!("📡 API Server running at http://{}:{}", host, port);
    log::info!("🔗 Monitoring {} AI-Core services", ai_cores_count);
    log::info!("🤖 Configured {} Ollama instances", ollama_count);
    log::info!("💬 Loaded {} message presets", messages_count);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(state.clone()))
            // AI-Core APIs
            .service(handlers::get_ai_cores)
            .service(handlers::add_ai_core)
            .service(handlers::update_ai_core)
            .service(handlers::delete_ai_core)
            .service(handlers::check_connection)
            .service(handlers::check_all_connections)
            .service(handlers::get_ai_core_info)
            // Ollama APIs
            .service(handlers::get_ollama_configs)
            .service(handlers::add_ollama_config)
            .service(handlers::update_ollama_config)
            .service(handlers::delete_ollama_config)
            .service(handlers::check_ollama_status)
            .service(handlers::test_ollama)
            .service(handlers::check_all_ollama)
            // Message Presets APIs
            .service(handlers::get_messages)
            .service(handlers::add_message)
            .service(handlers::update_message)
            .service(handlers::delete_message)
            // 静态文件服务
            .service(fs::Files::new("/", "./public").index_file("index.html"))
    })
    .bind((host, port))?
    .run()
    .await
}
