use actix_web::{get, post, put, delete, web, HttpResponse, Responder};
use crate::{AppState, models::*};
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
pub async fn delete_ai_core(
    state: web::Data<AppState>,
    id: web::Path<i32>,
) -> impl Responder {
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
pub async fn check_connection(
    request: web::Json<CheckConnectionRequest>,
) -> impl Responder {
    let start_time = Instant::now();
    let url = format!("{}/health", request.url);
    
    let client = reqwest::Client::new();
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        client.get(&url).send()
    ).await {
        Ok(Ok(response)) => {
            let response_time = start_time.elapsed().as_millis();
            if let Ok(data) = response.json::<HealthResponse>().await {
                HttpResponse::Ok().json(ConnectionCheckResponse {
                    success: true,
                    connected: true,
                    status: data.status,
                    message: data.message,
                    response_time,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    version: Some(data.version),
                })
            } else {
                HttpResponse::Ok().json(ConnectionCheckResponse {
                    success: true,
                    connected: false,
                    status: "offline".to_string(),
                    message: "Invalid response".to_string(),
                    response_time,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    version: None,
                })
            }
        }
        Ok(Err(e)) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(ConnectionCheckResponse {
                success: true,
                connected: false,
                status: "offline".to_string(),
                message: e.to_string(),
                response_time,
                timestamp: chrono::Utc::now().to_rfc3339(),
                version: None,
            })
        }
        Err(_) => {
            let response_time = start_time.elapsed().as_millis();
            HttpResponse::Ok().json(ConnectionCheckResponse {
                success: true,
                connected: false,
                status: "offline".to_string(),
                message: "Request timeout".to_string(),
                response_time,
                timestamp: chrono::Utc::now().to_rfc3339(),
                version: None,
            })
        }
    }
}

/// 检测所有 AI-Core 连接状态
#[get("/api/check-all")]
pub async fn check_all_connections(state: web::Data<AppState>) -> impl Responder {
    let ai_cores = state.ai_cores.read().await;
    let client = reqwest::Client::new();
    
    let mut tasks = Vec::new();
    
    for core in ai_cores.iter() {
        let core = core.clone();
        let client = client.clone();
        
        let task = tokio::spawn(async move {
            let start_time = Instant::now();
            let url = format!("{}/health", core.url);
            
            match tokio::time::timeout(
                std::time::Duration::from_secs(5),
                client.get(&url).send()
            ).await {
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

/// 获取 AI-Core 基本信息
#[post("/api/ai-core-info")]
pub async fn get_ai_core_info(
    request: web::Json<AICoreInfoRequest>,
) -> impl Responder {
    let start_time = Instant::now();
    let url = &request.url;
    
    let client = reqwest::Client::new();
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        client.get(url).send()
    ).await {
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
pub async fn check_ollama_status(
    request: web::Json<OllamaStatusRequest>,
) -> impl Responder {
    let start_time = Instant::now();
    let url = format!("{}/api/generate", request.url);
    
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": request.model,
        "prompt": "你好",
        "stream": false
    });
    
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        client.post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
    ).await {
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
pub async fn test_ollama(
    request: web::Json<OllamaTestRequest>,
) -> impl Responder {
    let start_time = Instant::now();
    let url = format!("{}/ask", request.url);
    let test_message = request.prompt.clone().unwrap_or_else(|| "你好，模型！".to_string());
    
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "message": test_message
    });
    
    match tokio::time::timeout(
        std::time::Duration::from_secs(30),
        client.post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
    ).await {
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
                client.post(&url)
                    .header("Content-Type", "application/json")
                    .json(&body)
                    .send()
            ).await {
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
    message: web::Json<MessagePreset>,
) -> impl Responder {
    let mut message_presets = state.message_presets.write().await;
    let mut next_id = state.next_message_id.write().await;
    
    let mut new_message = message.into_inner();
    new_message.id = *next_id;
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
    message: web::Json<MessagePreset>,
) -> impl Responder {
    let mut message_presets = state.message_presets.write().await;
    let id = id.into_inner();
    
    if let Some(msg) = message_presets.iter_mut().find(|m| m.id == id) {
        let updated = message.into_inner();
        msg.name = updated.name;
        msg.content = updated.content;
        msg.category = updated.category;
        
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
pub async fn delete_message(
    state: web::Data<AppState>,
    id: web::Path<i32>,
) -> impl Responder {
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

