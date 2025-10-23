use crate::{models::*, AppState};
use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use std::time::Instant;

// ==================== AI-Core APIs ====================

/// 获取所有 AI-Core 配置
#[get("/api/ai-cores")]
pub async fn get_ai_cores(state: web::Data<AppState>) -> impl Responder {
    let ai_cores = state.ai_cores.read().await;
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": &*ai_cores
    }))
}

/// 添加 AI-Core 配置
#[post("/api/ai-cores")]
pub async fn add_ai_core(
    state: web::Data<AppState>,
    config: web::Json<AICoreConfig>,
) -> impl Responder {
    let mut ai_cores = state.ai_cores.write().await;
    let mut next_id = state.next_core_id.write().await;

    let mut new_config = config.into_inner();
    new_config.id = *next_id;
    *next_id += 1;

    ai_cores.push(new_config.clone());
    drop(ai_cores);
    drop(next_id);

    state.save_ai_cores().await;

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": new_config
    }))
}

/// 更新 AI-Core 配置
#[put("/api/ai-cores/{id}")]
pub async fn update_ai_core(
    state: web::Data<AppState>,
    id: web::Path<i32>,
    config: web::Json<AICoreConfig>,
) -> impl Responder {
    let mut ai_cores = state.ai_cores.write().await;
    let id = id.into_inner();

    if let Some(core) = ai_cores.iter_mut().find(|c| c.id == id) {
        let updated = config.into_inner();
        core.name = updated.name;
        core.url = updated.url;
        core.description = updated.description;

        let result = core.clone();
        drop(ai_cores);

        state.save_ai_cores().await;

        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": result
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "AI-Core not found"
        }))
    }
}

/// 删除 AI-Core 配置
#[delete("/api/ai-cores/{id}")]
pub async fn delete_ai_core(state: web::Data<AppState>, id: web::Path<i32>) -> impl Responder {
    let mut ai_cores = state.ai_cores.write().await;
    let id = id.into_inner();

    if let Some(pos) = ai_cores.iter().position(|c| c.id == id) {
        ai_cores.remove(pos);
        drop(ai_cores);

        state.save_ai_cores().await;

        HttpResponse::Ok().json(serde_json::json!({
            "success": true
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "AI-Core not found"
        }))
    }
}

/// 检测单个 AI-Core 连接状态
#[post("/api/check-connection")]
pub async fn check_connection(state: web::Data<AppState>, request: web::Json<CheckConnectionRequest>) -> impl Responder {
    let core = state.ai_cores.read().await.iter().find(|c| c.id == request.id).cloned();

    if let Some(core) = core {
        let result = _check_connections(core).await;
        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": result
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "AI-Core not found"
        }))
    }
}

/// 检测所有 AI-Core 连接状态
#[get("/api/check-all")]
pub async fn check_all_connections(state: web::Data<AppState>) -> impl Responder {
    let ai_cores = state.ai_cores.read().await;
    let mut tasks = Vec::new();

    for core in ai_cores.iter() {
        let core = core.clone();
        let task = tokio::spawn(_check_connections(core));
        tasks.push(task);
    }

    let mut results = Vec::new();
    for task in tasks {
        if let Ok(result) = task.await {
            results.push(result);
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": results
    }))
}

async fn _check_connections(core: AICoreConfig) -> CheckAllItem {
    let start_time = Instant::now();
    let client = reqwest::Client::new();
    let health_url = format!("{}/health", core.url);
    
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        client.get(&health_url).send(),
    )
    .await
    {
        Ok(Ok(response)) => {
            let response_time = start_time.elapsed().as_millis();
            if let Ok(data) = response.json::<HealthResponse>().await {
                CheckAllItem {
                    id: core.id,
                    name: core.name,
                    url: core.url,
                    status: "online".to_string(),
                    message: data.message,
                    response_time,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    version: Some(data.version),
                    model: None,
                }
            } else {
                CheckAllItem {
                    id: core.id,
                    name: core.name,
                    url: core.url,
                    status: "offline".to_string(),
                    message: "Invalid response".to_string(),
                    response_time,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    version: None,
                    model: None,
                }
            }
        }
        Ok(Err(e)) => {
            let response_time = start_time.elapsed().as_millis();
            CheckAllItem {
                id: core.id,
                name: core.name,
                url: core.url,
                status: "offline".to_string(),
                message: e.to_string(),
                response_time,
                timestamp: chrono::Utc::now().to_rfc3339(),
                version: None,
                model: None,
            }
        }
        Err(_) => {
            let response_time = start_time.elapsed().as_millis();
            CheckAllItem {
                id: core.id,
                name: core.name,
                url: core.url,
                status: "offline".to_string(),
                message: "Request timeout".to_string(),
                response_time,
                timestamp: chrono::Utc::now().to_rfc3339(),
                version: None,
                model: None,
            }
        }
    }
}

/// 获取 AI-Core 基本信息
#[post("/api/ai-core-info")]
pub async fn get_ai_core_info(request: web::Json<AICoreInfoRequest>) -> impl Responder {
    let start_time = Instant::now();
    let health_url = format!("{}/health", request.url);

    let client = reqwest::Client::new();
    match tokio::time::timeout(std::time::Duration::from_secs(5), client.get(&health_url).send()).await {
        Ok(Ok(response)) => {
            let response_time = start_time.elapsed().as_millis();
            if let Ok(data) = response.json::<serde_json::Value>().await {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "connected": true,
                    "data": data,
                    "responseTime": response_time,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "connected": false,
                    "error": "Invalid response",
                    "responseTime": response_time,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            }
        }
        Ok(Err(e)) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "connected": false,
                "error": e.to_string(),
                "responseTime": response_time,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }
        Err(_) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "connected": false,
                "error": "Request timeout",
                "responseTime": response_time,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }
    }
}

// ==================== Ollama APIs ====================

/// 获取所有 Ollama 配置
#[get("/api/ollama-configs")]
pub async fn get_ollama_configs(state: web::Data<AppState>) -> impl Responder {
    let ollama_configs = state.ollama_configs.read().await;
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": &*ollama_configs
    }))
}

/// 添加 Ollama 配置
#[post("/api/ollama-configs")]
pub async fn add_ollama_config(
    state: web::Data<AppState>,
    config: web::Json<OllamaConfig>,
) -> impl Responder {
    let mut ollama_configs = state.ollama_configs.write().await;
    let mut next_id = state.next_ollama_id.write().await;

    let mut new_config = config.into_inner();
    new_config.id = *next_id;
    *next_id += 1;

    ollama_configs.push(new_config.clone());
    drop(ollama_configs);
    drop(next_id);

    state.save_ollama_configs().await;

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": new_config
    }))
}

/// 更新 Ollama 配置
#[put("/api/ollama-configs/{id}")]
pub async fn update_ollama_config(
    state: web::Data<AppState>,
    id: web::Path<i32>,
    config: web::Json<OllamaConfig>,
) -> impl Responder {
    let mut ollama_configs = state.ollama_configs.write().await;
    let id = id.into_inner();

    if let Some(cfg) = ollama_configs.iter_mut().find(|c| c.id == id) {
        let updated = config.into_inner();
        cfg.name = updated.name;
        cfg.url = updated.url;
        cfg.model = updated.model;
        cfg.description = updated.description;

        let result = cfg.clone();
        drop(ollama_configs);

        state.save_ollama_configs().await;

        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": result
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Ollama config not found"
        }))
    }
}

/// 删除 Ollama 配置
#[delete("/api/ollama-configs/{id}")]
pub async fn delete_ollama_config(
    state: web::Data<AppState>,
    id: web::Path<i32>,
) -> impl Responder {
    let mut ollama_configs = state.ollama_configs.write().await;
    let id = id.into_inner();

    if let Some(pos) = ollama_configs.iter().position(|c| c.id == id) {
        ollama_configs.remove(pos);
        drop(ollama_configs);

        state.save_ollama_configs().await;

        HttpResponse::Ok().json(serde_json::json!({
            "success": true
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Ollama config not found"
        }))
    }
}

/// 检查 Ollama 服务状态
#[post("/api/ollama-status")]
pub async fn check_ollama_status(request: web::Json<OllamaStatusRequest>) -> impl Responder {
    let start_time = Instant::now();
    let url = format!("{}/api/generate", request.url);

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": request.model,
        "prompt": "你好",
        "stream": false
    });

    match tokio::time::timeout(
        std::time::Duration::from_secs(120), // 2分钟超时
        client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send(),
    )
    .await
    {
        Ok(Ok(response)) => {
            let response_time = start_time.elapsed().as_millis();
            if let Ok(data) = response.json::<serde_json::Value>().await {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "connected": true,
                    "data": data,
                    "responseTime": response_time,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "connected": false,
                    "error": "Invalid response",
                    "responseTime": response_time,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            }
        }
        Ok(Err(e)) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "connected": false,
                "error": e.to_string(),
                "responseTime": response_time,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }
        Err(_) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "connected": false,
                "error": "Request timeout",
                "responseTime": response_time,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }
    }
}

/// 测试 Ollama 连接
#[post("/api/ollama-test")]
pub async fn test_ollama(request: web::Json<OllamaTestRequest>) -> impl Responder {
    let start_time = Instant::now();
    let url = format!("{}/ask", request.url);
    let test_message = request
        .prompt
        .clone()
        .unwrap_or_else(|| "你好，模型！".to_string());

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "message": test_message
    });

    match tokio::time::timeout(
        std::time::Duration::from_secs(30),
        client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send(),
    )
    .await
    {
        Ok(Ok(response)) => {
            let response_time = start_time.elapsed().as_millis();
            if let Ok(data) = response.json::<serde_json::Value>().await {
                HttpResponse::Ok().json(OllamaTestResponse {
                    success: true,
                    connected: true,
                    response_time,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    data: Some(data),
                    error: None,
                })
            } else {
                HttpResponse::Ok().json(OllamaTestResponse {
                    success: true,
                    connected: false,
                    response_time,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    data: None,
                    error: Some("Invalid response".to_string()),
                })
            }
        }
        Ok(Err(e)) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(OllamaTestResponse {
                success: true,
                connected: false,
                response_time,
                timestamp: chrono::Utc::now().to_rfc3339(),
                data: None,
                error: Some(e.to_string()),
            })
        }
        Err(_) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(OllamaTestResponse {
                success: true,
                connected: false,
                response_time,
                timestamp: chrono::Utc::now().to_rfc3339(),
                data: None,
                error: Some("Request timeout".to_string()),
            })
        }
    }
}

/// 检测所有 Ollama 配置状态
#[get("/api/ollama-check-all")]
pub async fn check_all_ollama(state: web::Data<AppState>) -> impl Responder {
    let ollama_configs = state.ollama_configs.read().await;
    let client = reqwest::Client::new();

    let mut tasks = Vec::new();

    for config in ollama_configs.iter() {
        let config = config.clone();
        let client = client.clone();

        let task = tokio::spawn(async move {
            let start_time = Instant::now();
            let url = format!("{}/api/generate", config.url);

            let body = serde_json::json!({
                "model": config.model,
                "prompt": "你好",
                "stream": false
            });

            match tokio::time::timeout(
                std::time::Duration::from_secs(5),
                client
                    .post(&url)
                    .header("Content-Type", "application/json")
                    .json(&body)
                    .send(),
            )
            .await
            {
                Ok(Ok(response)) => {
                    let response_time = start_time.elapsed().as_millis();
                    if let Ok(_data) = response.json::<serde_json::Value>().await {
                        CheckAllItem {
                            id: config.id,
                            name: config.name,
                            url: config.url,
                            status: "online".to_string(),
                            message: "Connected".to_string(),
                            response_time,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            version: None,
                            model: Some(config.model),
                        }
                    } else {
                        CheckAllItem {
                            id: config.id,
                            name: config.name,
                            url: config.url,
                            status: "offline".to_string(),
                            message: "Invalid response".to_string(),
                            response_time,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            version: None,
                            model: Some(config.model),
                        }
                    }
                }
                Ok(Err(e)) => {
                    let response_time = start_time.elapsed().as_millis();
                    CheckAllItem {
                        id: config.id,
                        name: config.name,
                        url: config.url,
                        status: "offline".to_string(),
                        message: e.to_string(),
                        response_time,
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        version: None,
                        model: Some(config.model),
                    }
                }
                Err(_) => {
                    let response_time = start_time.elapsed().as_millis();
                    CheckAllItem {
                        id: config.id,
                        name: config.name,
                        url: config.url,
                        status: "offline".to_string(),
                        message: "Request timeout".to_string(),
                        response_time,
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        version: None,
                        model: Some(config.model),
                    }
                }
            }
        });

        tasks.push(task);
    }

    let mut results = Vec::new();
    for task in tasks {
        if let Ok(result) = task.await {
            results.push(result);
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": results
    }))
}

// ==================== Message Presets APIs ====================

/// 获取所有消息预设
#[get("/api/messages")]
pub async fn get_messages(state: web::Data<AppState>) -> impl Responder {
    let message_presets = state.message_presets.read().await;
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": &*message_presets
    }))
}

/// 添加消息预设
#[post("/api/messages")]
pub async fn add_message(
    state: web::Data<AppState>,
    request: web::Json<AddMessageRequest>,
) -> impl Responder {
    let mut message_presets = state.message_presets.write().await;
    let mut next_id = state.next_message_id.write().await;

    let req = request.into_inner();
    let now = chrono::Utc::now().to_rfc3339();
    
    let new_message = MessagePreset {
        id: *next_id,
        title: req.title,
        content: req.content,
        r#type: req.r#type,
        tags: req.tags,
        created_at: now.clone(),
        updated_at: now,
    };
    
    *next_id += 1;

    message_presets.push(new_message.clone());
    drop(message_presets);
    drop(next_id);

    state.save_message_presets().await;

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": new_message
    }))
}

/// 更新消息预设
#[put("/api/messages/{id}")]
pub async fn update_message(
    state: web::Data<AppState>,
    id: web::Path<i32>,
    request: web::Json<UpdateMessageRequest>,
) -> impl Responder {
    let mut message_presets = state.message_presets.write().await;
    let id = id.into_inner();

    if let Some(msg) = message_presets.iter_mut().find(|m| m.id == id) {
        let updated = request.into_inner();
        msg.title = updated.title;
        msg.content = updated.content;
        msg.r#type = updated.r#type;
        msg.tags = updated.tags;
        msg.updated_at = chrono::Utc::now().to_rfc3339();

        let result = msg.clone();
        drop(message_presets);

        state.save_message_presets().await;

        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": result
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Message preset not found"
        }))
    }
}

/// 删除消息预设
#[delete("/api/messages/{id}")]
pub async fn delete_message(state: web::Data<AppState>, id: web::Path<i32>) -> impl Responder {
    let mut message_presets = state.message_presets.write().await;
    let id = id.into_inner();

    if let Some(pos) = message_presets.iter().position(|m| m.id == id) {
        message_presets.remove(pos);
        drop(message_presets);

        state.save_message_presets().await;

        HttpResponse::Ok().json(serde_json::json!({
            "success": true
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": "Message preset not found"
        }))
    }
}

// ==================== MQTT APIs ====================

/// 连接 MQTT Broker
#[post("/api/mqtt/connect")]
pub async fn mqtt_connect(
    state: web::Data<AppState>,
    request: web::Json<MqttConnectRequest>,
) -> impl Responder {
    use mqtt_client::{ClientConfig, MqttClient, QoS};
    use tokio::sync::mpsc;
    
    let req = request.into_inner();
    
    log::info!("🔌 开始连接 MQTT Broker: {}:{}", req.host, req.port);
    log::debug!("📋 订阅主题: {}", req.subscribe_topic);
    
    // 创建消息通道
    let (tx, mut rx) = mpsc::unbounded_channel();
    
    // 创建 MQTT 客户端配置
    let config = ClientConfig {
        client_id: format!("gui-client-{}", uuid::Uuid::new_v4()),
        broker_host: req.host,
        broker_port: req.port,
        username: None,
        password: None,
        clean_session: true,
        keep_alive: 60,
    };
    
    let mut mqtt_client = MqttClient::new(config, tx);
    
    // 连接
    if let Err(e) = mqtt_client.connect().await {
        log::error!("❌ MQTT 连接失败: {}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "success": false,
            "error": format!("连接失败: {}", e)
        }));
    }
    
    log::info!("✅ MQTT 连接成功");
    
    // 订阅主题
    if let Some(client) = mqtt_client.client.as_ref() {
        if let Err(e) = client.subscribe(&req.subscribe_topic, QoS::AtLeastOnce).await {
            log::error!("❌ MQTT 订阅失败: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": format!("订阅失败: {}", e)
            }));
        }
        log::info!("✅ 成功订阅主题: {}", req.subscribe_topic);
    }
    
    // 保存客户端
    let mut mqtt_client_guard = state.mqtt_client.write().await;
    *mqtt_client_guard = Some(mqtt_client);
    drop(mqtt_client_guard);
    
    log::info!("💾 MQTT 客户端已保存到应用状态");
    
    // 启动消息接收任务
    let mqtt_messages_queue = state.mqtt_messages.clone();
    tokio::spawn(async move {
        log::info!("🔄 MQTT 消息接收任务已启动");
        let mut msg_count = 0u64;
        
        while let Some(message) = rx.recv().await {
            msg_count += 1;
            let payload = String::from_utf8_lossy(&message.payload).to_string();
            let mqtt_msg = crate::models::MqttMessage {
                topic: message.topic.clone(),
                payload: payload.clone(),
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            
            log::debug!("📥 收到 MQTT 消息 #{}: topic={}, payload_len={}", 
                msg_count, message.topic, payload.len());
            log::trace!("📝 MQTT 消息内容: {}", payload);
            
            let mut messages = mqtt_messages_queue.write().await;
            messages.push(mqtt_msg);
            let queue_size = messages.len();
            drop(messages);
            
            log::debug!("📦 消息已加入队列 (当前队列大小: {})", queue_size);
        }
        
        log::warn!("⚠️ MQTT 消息接收任务已结束 (接收总数: {})", msg_count);
    });
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "MQTT 连接成功"
    }))
}

/// 断开 MQTT 连接
#[post("/api/mqtt/disconnect")]
pub async fn mqtt_disconnect(state: web::Data<AppState>) -> impl Responder {
    log::info!("🔌 正在断开 MQTT 连接...");
    
    let mut mqtt_client_guard = state.mqtt_client.write().await;
    
    if let Some(mut client) = mqtt_client_guard.take() {
        if let Err(e) = client.disconnect().await {
            log::error!("❌ MQTT 断开失败: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": format!("断开失败: {}", e)
            }));
        }
        
        log::info!("✅ MQTT 已成功断开");
        
        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "MQTT 已断开"
        }))
    } else {
        log::warn!("⚠️ MQTT 未连接，无需断开");
        HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": "MQTT 未连接"
        }))
    }
}

/// 发布 MQTT 消息
#[post("/api/mqtt/publish")]
pub async fn mqtt_publish(
    state: web::Data<AppState>,
    request: web::Json<MqttPublishRequest>,
) -> impl Responder {
    use mqtt_client::QoS;
    
    let req = request.into_inner();
    
    log::debug!("📤 准备发布 MQTT 消息: topic={}, payload_len={}", 
        req.topic, req.payload.len());
    log::trace!("📝 消息内容: {}", req.payload);
    
    let mqtt_client_guard = state.mqtt_client.read().await;
    
    if let Some(mqtt_client) = mqtt_client_guard.as_ref() {
        if let Some(client) = mqtt_client.client.as_ref() {
            let payload_bytes = req.payload.as_bytes().to_vec();
            match client.publish(&req.topic, QoS::AtLeastOnce, false, payload_bytes).await {
                Ok(_) => {
                    log::info!("✅ MQTT 消息发布成功: topic={}", req.topic);
                    HttpResponse::Ok().json(serde_json::json!({
                        "success": true,
                        "message": "消息发布成功"
                    }))
                }
                Err(e) => {
                    log::error!("❌ MQTT 消息发布失败: {}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": format!("发布失败: {}", e)
                    }))
                }
            }
        } else {
            log::warn!("⚠️ MQTT 客户端未初始化");
            HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "error": "MQTT 客户端未初始化"
            }))
        }
    } else {
        log::warn!("⚠️ MQTT 未连接");
        HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": "MQTT 未连接"
        }))
    }
}

/// 获取接收到的 MQTT 消息（保留用于兼容性）
#[get("/api/mqtt/messages")]
pub async fn mqtt_messages(state: web::Data<AppState>) -> impl Responder {
    let mut messages = state.mqtt_messages.write().await;
    let result = messages.clone();
    messages.clear(); // 清空已读消息
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "messages": result
    }))
}

/// SSE 推送 MQTT 消息
#[get("/api/mqtt/sse")]
pub async fn mqtt_sse(state: web::Data<AppState>) -> impl Responder {
    use futures::stream;
    use std::time::Duration;
    
    log::info!("📡 新的 SSE 客户端连接");
    
    let message_queue = state.mqtt_messages.clone();
    let heartbeat_count = 0u64;
    let message_count = 0u64;
    
    // 创建定时流，每200ms检查一次消息
    let stream = stream::unfold((message_queue, heartbeat_count, message_count), |(queue, mut hb_count, mut msg_count)| async move {
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        // 尝试获取消息
        let mut messages = queue.write().await;
        if !messages.is_empty() {
            let count = messages.len();
            let drained: Vec<_> = messages.drain(..).collect();
            drop(messages);
            
            msg_count += count as u64;
            log::debug!("📨 SSE 推送 {} 条消息 (总计: {})", count, msg_count);
            
            // 将所有消息格式化为 SSE 格式
            let mut data = String::new();
            for msg in drained {
                if let Ok(json) = serde_json::to_string(&msg) {
                    data.push_str(&format!("data: {}\n\n", json));
                    log::trace!("📤 SSE 消息: {}", json);
                }
            }
            Some((Ok::<_, actix_web::Error>(web::Bytes::from(data)), (queue, hb_count, msg_count)))
        } else {
            drop(messages);
            hb_count += 1;
            
            // 每50次心跳（10秒）记录一次
            if hb_count % 50 == 0 {
                log::debug!("💓 SSE 心跳 #{} (已推送 {} 条消息)", hb_count, msg_count);
            }
            
            // 发送心跳保持连接
            Some((Ok(web::Bytes::from(": heartbeat\n\n")), (queue, hb_count, msg_count)))
        }
    });
    
    log::info!("✅ SSE 流已启动");
    
    HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("X-Accel-Buffering", "no"))
        .streaming(stream)
}

// ==================== System Prompt API ====================

/// 发送系统参数到 AI-Core
#[post("/api/system-prompt")]
pub async fn send_system_prompt(
    state: web::Data<AppState>,
    request: web::Json<SendSystemPromptRequest>,
) -> impl Responder {
    let req = request.into_inner();
    
    // 查找对应的 AI-Core 配置
    let ai_cores = state.ai_cores.read().await;
    let core = ai_cores.iter().find(|c| c.id == req.ai_core_id);
    
    let core = match core {
        Some(c) => c.clone(),
        None => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "success": false,
                "error": "AI-Core 服务不存在"
            }));
        }
    };
    
    drop(ai_cores);
    
    // 构造请求体
    let mut body = serde_json::json!({
        "system_prompt": req.system_prompt
    });
    
    if let Some(session_id) = req.session_id {
        body["session_id"] = serde_json::Value::String(session_id);
    }
    
    // 发送请求到 AI-Core
    let client = reqwest::Client::new();
    let url = format!("{}/api/system-prompt", core.url);
    
    log::info!("📤 转发系统参数请求到 AI-Core: {} (ID: {})", url, req.ai_core_id);
    
    match tokio::time::timeout(
        std::time::Duration::from_secs(200),
        client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send(),
    )
    .await
    {
        Ok(Ok(response)) => {
            let status_code = response.status();
            log::info!("📥 收到 AI-Core 响应，状态码: {}", status_code);
            
            // 先获取响应文本
            match response.text().await {
                Ok(text) => {
                    log::debug!("📄 响应内容: {}", text);
                    
                    // 尝试解析为 JSON
                    match serde_json::from_str::<serde_json::Value>(&text) {
                        Ok(data) => {
                            log::info!("✅ 成功解析 AI-Core 响应");
                            HttpResponse::Ok().json(data)
                        }
                        Err(e) => {
                            log::error!("❌ 解析 JSON 失败: {}, 原始响应: {}", e, text);
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": format!("解析响应失败: {}", e),
                                "raw_response": text
                            }))
                        }
                    }
                }
                Err(e) => {
                    log::error!("❌ 读取响应文本失败: {}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": format!("读取响应失败: {}", e)
                    }))
                }
            }
        }
        Ok(Err(e)) => {
            log::error!("❌ 请求 AI-Core 失败: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": format!("请求失败: {}", e)
            }))
        }
        Err(_) => {
            log::error!("❌ 请求 AI-Core 超时");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": "请求超时"
            }))
        }
    }
}