use actix_cors::Cors;
use actix_files as fs;
use actix_web::{web, App, HttpServer};
use mqtt_client::MqttClient;
use std::fs as std_fs;
use std::sync::Arc;
use tokio::sync::RwLock;

mod handlers;
mod models;

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
    pub mqtt_client: Arc<RwLock<Option<MqttClient>>>,
    pub mqtt_messages: Arc<RwLock<Vec<models::MqttMessage>>>,
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
            mqtt_client: Arc::new(RwLock::new(None)),
            mqtt_messages: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn load_data(&self) {
        // 加载 AI-Core 数据
        if let Ok(data) = std_fs::read_to_string("resources/ai-core-data.json") {
            if let Ok(cores) = serde_json::from_str::<Vec<AICoreConfig>>(&data) {
                let mut ai_cores = self.ai_cores.write().await;
                *ai_cores = cores.clone();

                let max_id = cores.iter().map(|c| c.id).max().unwrap_or(0);
                let mut next_id = self.next_core_id.write().await;
                *next_id = max_id + 1;
                log::info!("✅ 成功加载 {} 个 AI-Core 配置", cores.len());
            } else {
                log::error!("❌ 解析 AI-Core 配置 JSON 失败");
            }
        } else {
            log::warn!("⚠️ 无法读取 AI-Core 配置文件 ai-core-data.json");
        }

        // 加载 Ollama 数据
        if let Ok(data) = std_fs::read_to_string("resources/ollama-data.json") {
            if let Ok(configs) = serde_json::from_str::<Vec<OllamaConfig>>(&data) {
                let mut ollama_configs = self.ollama_configs.write().await;
                *ollama_configs = configs.clone();

                let max_id = configs.iter().map(|c| c.id).max().unwrap_or(0);
                let mut next_id = self.next_ollama_id.write().await;
                *next_id = max_id + 1;
                log::info!("✅ 成功加载 {} 个 Ollama 配置", configs.len());
            } else {
                log::error!("❌ 解析 Ollama 配置 JSON 失败");
            }
        } else {
            log::warn!("⚠️ 无法读取 Ollama 配置文件 ollama-data.json");
        }

        // 加载消息预设数据
        if let Ok(data) = std_fs::read_to_string("resources/msg-pre-data.json") {
            log::info!("📄 读取到消息预设文件，大小: {} 字节", data.len());
            if let Ok(presets) = serde_json::from_str::<Vec<MessagePreset>>(&data) {
                log::info!("✅ 成功解析 {} 个消息预设", presets.len());
                let mut message_presets = self.message_presets.write().await;
                *message_presets = presets.clone();

                let max_id = presets.iter().map(|m| m.id).max().unwrap_or(0);
                let mut next_id = self.next_message_id.write().await;
                *next_id = max_id + 1;
                log::info!("🆔 设置下一个消息ID为: {}", *next_id);
            } else {
                log::error!("❌ 解析消息预设JSON失败");
            }
        } else {
            log::warn!("⚠️ 无法读取消息预设文件 msg-pre-data.json");
        }
    }

    pub async fn save_ai_cores(&self) {
        let ai_cores = self.ai_cores.read().await;
        if let Ok(json) = serde_json::to_string_pretty(&*ai_cores) {
            match std_fs::write("resources/ai-core-data.json", json) {
                Ok(_) => log::info!("💾 已保存 {} 个 AI-Core 配置", ai_cores.len()),
                Err(e) => log::error!("❌ 保存 AI-Core 配置失败: {}", e),
            }
        } else {
            log::error!("❌ 序列化 AI-Core 配置失败");
        }
    }

    pub async fn save_ollama_configs(&self) {
        let ollama_configs = self.ollama_configs.read().await;
        if let Ok(json) = serde_json::to_string_pretty(&*ollama_configs) {
            match std_fs::write("resources/ollama-data.json", json) {
                Ok(_) => log::info!("💾 已保存 {} 个 Ollama 配置", ollama_configs.len()),
                Err(e) => log::error!("❌ 保存 Ollama 配置失败: {}", e),
            }
        } else {
            log::error!("❌ 序列化 Ollama 配置失败");
        }
    }

    pub async fn save_message_presets(&self) {
        let message_presets = self.message_presets.read().await;
        if let Ok(json) = serde_json::to_string_pretty(&*message_presets) {
            match std_fs::write("resources/msg-pre-data.json", json) {
                Ok(_) => log::info!("💾 已保存 {} 个消息预设", message_presets.len()),
                Err(e) => log::error!("❌ 保存消息预设失败: {}", e),
            }
        } else {
            log::error!("❌ 序列化消息预设失败");
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志
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

    let port: u16 = std::env::var("GUI_BACKEND_PORT")
        .unwrap_or_else(|_| "3300".to_string())
        .parse()
        .unwrap_or(3300);
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
            // MQTT APIs
            .service(handlers::mqtt_connect)
            .service(handlers::mqtt_disconnect)
            .service(handlers::mqtt_publish)
            .service(handlers::mqtt_messages)
            .service(handlers::mqtt_sse)
            // System Prompt API
            .service(handlers::send_system_prompt)
            // 静态文件服务
            .service(fs::Files::new("/", "./gui/public").index_file("index.html"))
    })
    .bind((host, port))?
    .run()
    .await
}
