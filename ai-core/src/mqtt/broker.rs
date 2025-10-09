use crate::mqtt::{MqttConfig, MqttMessage};
use rumqttd::{Broker, Config};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

/// MQTT Broker 管理器
pub struct MqttBroker {
    config: MqttConfig,
    broker: Option<Broker>,
    message_sender: Arc<RwLock<Option<mpsc::UnboundedSender<MqttMessage>>>>,
    message_receiver: Arc<RwLock<Option<mpsc::UnboundedReceiver<MqttMessage>>>>,
    connected_clients: Arc<RwLock<HashMap<String, ClientInfo>>>,
    is_running: Arc<RwLock<bool>>,
}

/// 客户端信息
#[derive(Debug, Clone, serde::Serialize)]
pub struct ClientInfo {
    pub client_id: String,
    pub connected_at: u64,
    pub last_seen: u64,
    pub subscriptions: Vec<String>,
}

impl MqttBroker {
    /// 创建新的MQTT Broker
    pub fn new(config: MqttConfig) -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        
        Self {
            config,
            broker: None,
            message_sender: Arc::new(RwLock::new(Some(tx))),
            message_receiver: Arc::new(RwLock::new(Some(rx))),
            connected_clients: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    /// 启动MQTT Broker
    pub async fn start(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🚀 Starting MQTT Broker on {}", self.config.listen_addr());

        // 创建rumqttd配置
        let config = Config::default();

        // 启动broker
        let broker = Broker::new(config);
        self.broker = Some(broker);

        // 标记为运行状态
        {
            let mut is_running = self.is_running.write().await;
            *is_running = true;
        }

        log::info!("✅ MQTT Broker started successfully on {}", self.config.listen_addr());
        
        // 启动消息处理任务
        self.start_message_handler().await;

        Ok(())
    }

    /// 停止MQTT Broker
    pub async fn stop(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🛑 Stopping MQTT Broker...");

        // 标记为停止状态
        {
            let mut is_running = self.is_running.write().await;
            *is_running = false;
        }

        // 关闭消息通道
        {
            let mut sender = self.message_sender.write().await;
            *sender = None;
        }

        // 清空连接的客户端
        {
            let mut clients = self.connected_clients.write().await;
            clients.clear();
        }

        log::info!("✅ MQTT Broker stopped successfully");
        Ok(())
    }

    /// 检查Broker是否运行
    pub async fn is_running(&self) -> bool {
        let is_running = self.is_running.read().await;
        *is_running
    }

    /// 获取连接的客户端数量
    pub async fn get_client_count(&self) -> usize {
        let clients = self.connected_clients.read().await;
        clients.len()
    }

    /// 获取连接的客户端列表
    pub async fn get_connected_clients(&self) -> Vec<ClientInfo> {
        let clients = self.connected_clients.read().await;
        clients.values().cloned().collect()
    }

    /// 发布消息
    pub async fn publish(&self, topic: String, payload: Vec<u8>, qos: u8) -> Result<(), String> {
        let message = MqttMessage::new(topic, payload, qos);
        
        if let Some(sender) = self.message_sender.read().await.as_ref() {
            sender.send(message).map_err(|_| "Failed to send message".to_string())?;
            Ok(())
        } else {
            Err("Message channel is closed".to_string())
        }
    }

    /// 发布JSON消息
    pub async fn publish_json<T: serde::Serialize>(
        &self,
        topic: String,
        data: &T,
        qos: u8,
    ) -> Result<(), String> {
        let payload = serde_json::to_vec(data).map_err(|e| e.to_string())?;
        self.publish(topic, payload, qos).await
    }

    /// 启动消息处理任务
    async fn start_message_handler(&self) {
        let receiver = {
            let mut receiver_guard = self.message_receiver.write().await;
            receiver_guard.take()
        };

        if let Some(mut receiver) = receiver {
            let connected_clients = self.connected_clients.clone();
            let is_running = self.is_running.clone();

            tokio::spawn(async move {
                while let Some(message) = receiver.recv().await {
                    if !*is_running.read().await {
                        break;
                    }

                    log::debug!(
                        "📨 Processing MQTT message: topic={}, payload_size={}",
                        message.topic,
                        message.payload.len()
                    );

                    // 这里可以添加消息处理逻辑
                    // 例如：转发给订阅的客户端、持久化存储等
                    
                    // 更新客户端最后活跃时间
                    if let Some(client_id) = &message.client_id {
                        let mut clients = connected_clients.write().await;
                        if let Some(client_info) = clients.get_mut(client_id) {
                            client_info.last_seen = message.timestamp;
                        }
                    }
                }
            });
        }
    }

    /// 添加客户端连接
    pub async fn add_client(&self, client_id: String, subscriptions: Vec<String>) {
        let client_info = ClientInfo {
            client_id: client_id.clone(),
            connected_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            last_seen: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            subscriptions,
        };

        let mut clients = self.connected_clients.write().await;
        clients.insert(client_id.clone(), client_info);
        
        log::info!("👤 Client connected: {}", client_id);
    }

    /// 移除客户端连接
    pub async fn remove_client(&self, client_id: &str) {
        let mut clients = self.connected_clients.write().await;
        if clients.remove(client_id).is_some() {
            log::info!("👤 Client disconnected: {}", client_id);
        }
    }

    /// 更新客户端订阅
    pub async fn update_client_subscriptions(&self, client_id: &str, subscriptions: Vec<String>) {
        let mut clients = self.connected_clients.write().await;
        if let Some(client_info) = clients.get_mut(client_id) {
            client_info.subscriptions = subscriptions;
            client_info.last_seen = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
        }
    }

    /// 获取Broker统计信息
    pub async fn get_stats(&self) -> BrokerStats {
        let clients = self.connected_clients.read().await;
        let total_subscriptions: usize = clients.values().map(|c| c.subscriptions.len()).sum();
        
        BrokerStats {
            is_running: *self.is_running.read().await,
            connected_clients: clients.len(),
            total_subscriptions,
            listen_addr: self.config.listen_addr(),
            uptime: if *self.is_running.read().await {
                // 这里可以添加启动时间跟踪
                0
            } else {
                0
            },
        }
    }
}

/// Broker统计信息
#[derive(Debug, Clone, serde::Serialize)]
pub struct BrokerStats {
    pub is_running: bool,
    pub connected_clients: usize,
    pub total_subscriptions: usize,
    pub listen_addr: String,
    pub uptime: u64,
}
