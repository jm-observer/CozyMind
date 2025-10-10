use rumqttc::v5::mqttbytes::QoS;
use rumqttc::v5::{AsyncClient, Event, MqttOptions};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tokio::time::timeout;

/// MQTT 客户端管理器
pub struct MqttClient {
    client: Option<Arc<RwLock<AsyncClient>>>,
    is_connected: bool,
    message_sender: Arc<RwLock<Option<mpsc::UnboundedSender<MqttMessage>>>>,
    config: ClientConfig
}

/// 客户端配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfig {
    pub client_id: String,
    pub broker_host: String,
    pub broker_port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub keep_alive: u16,
    pub clean_session: bool,
}

impl Default for ClientConfig {
    fn default() -> Self {
        // 从环境变量读取配置，未设置则使用默认值
        let client_id = std::env::var("AI_CORE_MQTT_CLIENT_ID")
            .unwrap_or_else(|_| format!("ai-core-{}", uuid::Uuid::new_v4().to_string()[..8].to_string()));
        
        let broker_host = std::env::var("BROKER_MQTT_V5_HOST")
            .unwrap_or_else(|_| "localhost".to_string());
        
        let broker_port: u16 = std::env::var("BROKER_MQTT_V5_PORT")
            .unwrap_or_else(|_| "8884".to_string())
            .parse()
            .unwrap_or(8884);
        
        let keep_alive: u16 = std::env::var("MQTT_KEEP_ALIVE")
            .unwrap_or_else(|_| "60".to_string())
            .parse()
            .unwrap_or(60);
        
        Self {
            client_id,
            broker_host,
            broker_port,
            username: std::env::var("MQTT_USERNAME").ok(),
            password: std::env::var("MQTT_PASSWORD").ok(),
            keep_alive,
            clean_session: true,
        }
    }
}

/// MQTT 消息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MqttMessage {
    pub id: String,
    pub topic: String,
    pub payload: Vec<u8>,
    pub qos: u8,
    pub retain: bool,
    pub timestamp: u64,
}

impl MqttMessage {
    pub fn new(topic: String, payload: Vec<u8>, qos: u8) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            topic,
            payload,
            qos,
            retain: false,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        }
    }

    pub fn payload_as_string(&self) -> String {
        String::from_utf8_lossy(&self.payload).to_string()
    }

    pub fn payload_as_json<T>(&self) -> Result<T, serde_json::Error>
    where
        T: for<'de> Deserialize<'de>,
    {
        serde_json::from_slice(&self.payload)
    }
}

impl MqttClient {
    /// 创建新的MQTT客户端
    pub fn new(config: ClientConfig) -> Self {
        Self {
            client: None,
            config,
            is_connected: false,
            message_sender: Arc::new(RwLock::new(None)),
        }
    }

    /// 连接到MQTT Broker
    pub async fn connect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🔗 AI-Core connecting to MQTT Broker: {:?}", self.config);

        // 创建MQTT选项
        let mut mqtt_options = MqttOptions::new(
            &self.config.client_id,
            &self.config.broker_host,
            self.config.broker_port,
        );
        
        mqtt_options.set_keep_alive(Duration::from_secs(self.config.keep_alive as u64));
        mqtt_options.set_clean_session(self.config.clean_session);
        
        // if let Some(username) = &self.config.username {
        //     mqtt_options.set_credentials(username.clone(), self.config.password.as_ref()?.clone());
        // }

        // 创建客户端和事件循环
        let (client, mut event_loop) = AsyncClient::new(mqtt_options, 10);
        
        self.client = Some(Arc::new(RwLock::new(client)));
        self.is_connected = true;

        // 启动事件循环任务
        let message_sender = self.message_sender.clone();
        let _client_id = self.config.client_id.clone();
        tokio::spawn(async move {
            loop {
                match timeout(Duration::from_secs(1), event_loop.poll()).await {
                    Ok(Ok(notification)) => {
                        match notification {
                            Event::Incoming(packet) => {
                                log::debug!("📨 AI-Core received MQTT packet: {:?}", packet);
                                
                                if let Some(sender) = message_sender.read().await.as_ref() {
                                    if let rumqttc::v5::mqttbytes::v5::Packet::Publish(publish, _) = packet.as_ref() {
                                        let message = MqttMessage {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            topic: String::from_utf8_lossy(&publish.topic).to_string(),
                                            payload: publish.payload.to_vec(),
                                            qos: publish.qos as u8,
                                            retain: publish.retain,
                                            timestamp: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap_or_default()
                                                .as_secs(),
                                        };
                                        
                                        if let Err(e) = sender.send(message) {
                                            log::error!("Failed to send message: {}", e);
                                        }
                                    }
                                }
                            }
                            Event::Outgoing(packet) => {
                                log::debug!("📤 AI-Core outgoing MQTT packet: {:?}", packet);
                            }
                        }
                    }
                    Ok(Err(e)) => {
                        log::error!("MQTT event loop error: {}", e);
                        break;
                    }
                    Err(_) => {
                        // 超时，继续循环
                        continue;
                    }
                }
            }
        });

        log::info!("✅ AI-Core connected to MQTT Broker successfully");
        Ok(())
    }

    /// 断开连接
    pub async fn disconnect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🔌 AI-Core disconnecting from MQTT Broker...");

        if let Some(client) = &self.client {
            let client_guard = client.read().await;
            client_guard.disconnect().await?;
        }

        self.is_connected = false;
        self.client = None;

        log::info!("✅ AI-Core disconnected from MQTT Broker");
        Ok(())
    }

    /// 检查连接状态
    pub fn is_connected(&self) -> bool {
        self.is_connected
    }

    /// 订阅主题
    pub async fn subscribe(&self, topic: &str, qos: QoS) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(client) = &self.client {
            log::info!("📡 AI-Core subscribing to topic: {}", topic);
            let client_guard = client.read().await;
            client_guard.subscribe(topic, qos).await?;
            log::info!("✅ AI-Core subscribed to topic: {}", topic);
            Ok(())
        } else {
            Err("Client not connected".into())
        }
    }

    /// 取消订阅主题
    pub async fn unsubscribe(&self, topic: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(client) = &self.client {
            log::info!("📡 AI-Core unsubscribing from topic: {}", topic);
            let client_guard = client.read().await;
            client_guard.unsubscribe(topic).await?;
            log::info!("✅ AI-Core unsubscribed from topic: {}", topic);
            Ok(())
        } else {
            Err("Client not connected".into())
        }
    }

    /// 发布消息
    pub async fn publish(&self, topic: &str, payload: &[u8], qos: QoS, retain: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(client) = &self.client {
            log::debug!("📤 AI-Core publishing message to topic: {}, size: {} bytes", topic, payload.len());
            let client_guard = client.read().await;
            client_guard.publish(topic, qos, retain, payload.to_vec()).await?;
            log::debug!("✅ AI-Core message published successfully");
            Ok(())
        } else {
            Err("Client not connected".into())
        }
    }

    /// 发布JSON消息
    pub async fn publish_json<T: serde::Serialize>(
        &self,
        topic: &str,
        data: &T,
        qos: QoS,
        retain: bool,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let payload = serde_json::to_vec(data)?;
        self.publish(topic, &payload, qos, retain).await
    }

    /// 设置消息接收通道
    pub async fn set_message_sender(&self, sender: mpsc::UnboundedSender<MqttMessage>) {
        let mut message_sender = self.message_sender.write().await;
        *message_sender = Some(sender);
    }


    /// 获取客户端信息
    pub fn get_client_info(&self) -> ClientInfo {
        ClientInfo {
            client_id: self.config.client_id.clone(),
            broker_url: format!("{}:{}", self.config.broker_host, self.config.broker_port),
            is_connected: self.is_connected,
        }
    }
}

/// 客户端信息
#[derive(Debug, Clone, Serialize)]
pub struct ClientInfo {
    pub client_id: String,
    pub broker_url: String,
    pub is_connected: bool,
}

/// 消息处理器
pub struct MessageHandler {
    message_receiver: mpsc::UnboundedReceiver<MqttMessage>,
}

impl MessageHandler {
    /// 创建新的消息处理器
    pub fn new(receiver: mpsc::UnboundedReceiver<MqttMessage>) -> Self {
        Self {
            message_receiver: receiver,
        }
    }

    /// 开始处理消息
    pub async fn start_handling(&mut self) {
        log::info!("🔄 AI-Core starting message handler...");
        
        while let Some(message) = self.message_receiver.recv().await {
            log::info!(
                "📨 AI-Core processing message: topic={}, payload={}",
                message.topic,
                message.payload_as_string()
            );
            
            // 这里可以添加具体的消息处理逻辑
            // 例如：AI模型处理、数据分析、存储等
        }
    }
}

use std::sync::Arc;
