use crate::mqtt::MqttMessage;
use rumqttc::{AsyncClient, Event, EventLoop, MqttOptions, QoS};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::timeout;

/// MQTT 客户端管理器
pub struct MqttClient {
    client: Option<AsyncClient>,
    event_loop: Option<EventLoop>,
    client_id: String,
    broker_url: String,
    is_connected: bool,
    message_sender: Option<mpsc::UnboundedSender<MqttMessage>>,
}

/// 客户端配置
#[derive(Debug, Clone)]
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
        Self {
            client_id: uuid::Uuid::new_v4().to_string(),
            broker_host: "localhost".to_string(),
            broker_port: 1883,
            username: None,
            password: None,
            keep_alive: 60,
            clean_session: true,
        }
    }
}

impl MqttClient {
    /// 创建新的MQTT客户端
    pub fn new(config: ClientConfig) -> Self {
        let broker_url = format!("{}:{}", config.broker_host, config.broker_port);
        
        Self {
            client: None,
            event_loop: None,
            client_id: config.client_id,
            broker_url,
            is_connected: false,
            message_sender: None,
        }
    }

    /// 连接到MQTT Broker
    pub async fn connect(&mut self, config: ClientConfig) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🔗 Connecting to MQTT Broker: {}", self.broker_url);

        // 创建MQTT选项
        let mut mqtt_options = MqttOptions::new(
            &config.client_id,
            &config.broker_host,
            config.broker_port,
        );
        
        mqtt_options.set_keep_alive(Duration::from_secs(config.keep_alive as u64));
        mqtt_options.set_clean_session(config.clean_session);
        
        if let Some(username) = config.username {
            mqtt_options.set_credentials(username, config.password.unwrap_or_default());
        }

        // 创建客户端和事件循环
        let (client, event_loop) = AsyncClient::new(mqtt_options, 10);
        
        self.client = Some(client);
        self.event_loop = Some(event_loop);
        self.is_connected = true;

        log::info!("✅ Connected to MQTT Broker successfully");
        Ok(())
    }

    /// 断开连接
    pub async fn disconnect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🔌 Disconnecting from MQTT Broker...");

        if let Some(client) = &self.client {
            client.disconnect().await?;
        }

        self.is_connected = false;
        self.client = None;
        self.event_loop = None;

        log::info!("✅ Disconnected from MQTT Broker");
        Ok(())
    }

    /// 检查连接状态
    pub fn is_connected(&self) -> bool {
        self.is_connected
    }

    /// 订阅主题
    pub async fn subscribe(&self, topic: &str, qos: QoS) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(client) = &self.client {
            log::info!("📡 Subscribing to topic: {}", topic);
            client.subscribe(topic, qos).await?;
            log::info!("✅ Subscribed to topic: {}", topic);
            Ok(())
        } else {
            Err("Client not connected".into())
        }
    }

    /// 取消订阅主题
    pub async fn unsubscribe(&self, topic: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(client) = &self.client {
            log::info!("📡 Unsubscribing from topic: {}", topic);
            client.unsubscribe(topic).await?;
            log::info!("✅ Unsubscribed from topic: {}", topic);
            Ok(())
        } else {
            Err("Client not connected".into())
        }
    }

    /// 发布消息
    pub async fn publish(&self, topic: &str, payload: &[u8], qos: QoS, retain: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(client) = &self.client {
            log::debug!("📤 Publishing message to topic: {}, size: {} bytes", topic, payload.len());
            client.publish(topic, qos, retain, payload).await?;
            log::debug!("✅ Message published successfully");
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
    pub fn set_message_sender(&mut self, sender: mpsc::UnboundedSender<MqttMessage>) {
        self.message_sender = Some(sender);
    }

    /// 开始监听消息
    pub async fn start_listening(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(event_loop) = &mut self.event_loop {
            log::info!("👂 Starting to listen for MQTT messages...");
            
            loop {
                match timeout(Duration::from_secs(1), event_loop.poll()).await {
                    Ok(Ok(notification)) => {
                        match notification {
                            Event::Incoming(packet) => {
                                log::debug!("📨 Received MQTT packet: {:?}", packet);
                                
                                // 处理接收到的消息
                                if let Some(sender) = &self.message_sender {
                                    if let rumqttc::Packet::Publish(publish) = packet {
                                        let message = MqttMessage {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            topic: publish.topic,
                                            payload: publish.payload.to_vec(),
                                            qos: publish.qos as u8,
                                            retain: publish.retain,
                                            timestamp: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap_or_default()
                                                .as_secs(),
                                            client_id: Some(self.client_id.clone()),
                                        };
                                        
                                        if let Err(e) = sender.send(message) {
                                            log::error!("Failed to send message: {}", e);
                                        }
                                    }
                                }
                            }
                            Event::Outgoing(packet) => {
                                log::debug!("📤 Outgoing MQTT packet: {:?}", packet);
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
        }
        
        Ok(())
    }

    /// 获取客户端信息
    pub fn get_client_info(&self) -> ClientInfo {
        ClientInfo {
            client_id: self.client_id.clone(),
            broker_url: self.broker_url.clone(),
            is_connected: self.is_connected,
        }
    }
}

/// 客户端信息
#[derive(Debug, Clone, serde::Serialize)]
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
        log::info!("🔄 Starting message handler...");
        
        while let Some(message) = self.message_receiver.recv().await {
            log::info!(
                "📨 Processing message: topic={}, payload={}",
                message.topic,
                message.payload_as_string()
            );
            
            // 这里可以添加具体的消息处理逻辑
            // 例如：路由到不同的处理器、存储到数据库等
        }
    }
}
