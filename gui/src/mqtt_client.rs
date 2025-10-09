use rumqttc::{AsyncClient, Event, EventLoop, MqttOptions, QoS};
use std::time::Duration;

/// MQTT 客户端管理器
pub struct MqttClientManager {
    client: Option<AsyncClient>,
    event_loop: Option<EventLoop>,
    client_id: String,
    broker_host: String,
    broker_port: u16,
    is_connected: bool,
}

impl MqttClientManager {
    /// 创建新的MQTT客户端管理器
    pub fn new(broker_host: String, broker_port: u16) -> Self {
        let client_id = format!("cozymind-gui-{}", uuid::Uuid::new_v4());
        
        Self {
            client: None,
            event_loop: None,
            client_id,
            broker_host,
            broker_port,
            is_connected: false,
        }
    }

    /// 连接到MQTT Broker
    pub async fn connect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        log::info!("🔗 Connecting to MQTT Broker: {}:{}", self.broker_host, self.broker_port);

        // 创建MQTT选项
        let mut mqtt_options = MqttOptions::new(
            &self.client_id,
            &self.broker_host,
            self.broker_port,
        );
        
        mqtt_options.set_keep_alive(Duration::from_secs(60));
        mqtt_options.set_clean_session(true);

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

    /// 开始监听消息
    pub async fn start_event_loop(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(event_loop) = &mut self.event_loop {
            log::info!("👂 Starting MQTT event loop...");
            
            loop {
                match tokio::time::timeout(Duration::from_secs(1), event_loop.poll()).await {
                    Ok(Ok(notification)) => {
                        match notification {
                            Event::Incoming(packet) => {
                                log::debug!("📨 Received MQTT packet: {:?}", packet);
                                
                                // 处理接收到的消息
                                if let rumqttc::Packet::Publish(publish) = packet {
                                    log::info!(
                                        "📨 Message received: topic={}, payload={}",
                                        publish.topic,
                                        String::from_utf8_lossy(&publish.payload)
                                    );
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
}

