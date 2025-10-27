// 使用 mqtt.js 的 MQTT 客户端
import mqtt from 'mqtt'

export interface MqttConnectOptions {
  clientId?: string
  username?: string
  password?: string
  clean?: boolean
  keepalive?: number
}

export interface MqttMessage {
  topic: string
  payload: string | Buffer
  qos?: 0 | 1 | 2
  retain?: boolean
}

export class MqttClient {
  private client: mqtt.MqttClient | null = null
  private isConnected = false
  private messageId = 0

  // 连接到 MQTT broker
  async connect(options: MqttConnectOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const {
          clientId = `mqtt_client_${Date.now()}`,
          username,
          password,
          clean = true,
          keepalive = 60
        } = options

        console.log('🔗 Connecting to MQTT broker with mqtt.js...')

        // 连接选项
        const connectOptions: mqtt.IClientOptions = {
          clientId,
          username,
          password,
          clean,
          keepalive,
          protocol: 'ws', // 使用 WebSocket
          host: 'localhost',
          port: 8885,
          // 连接超时
          connectTimeout: 10000,
          // 重连选项
          reconnectPeriod: 5000,
          // 队列选项
          queueQoSZero: false
        }

        // 创建 MQTT 客户端
        this.client = mqtt.connect(connectOptions)

        // 连接成功
        this.client.on('connect', () => {
          console.log('✅ MQTT connected successfully')
          this.isConnected = true
          resolve()
        })

        // 连接错误
        this.client.on('error', (error) => {
          console.error('❌ MQTT connection error:', error)
          this.isConnected = false
          reject(error)
        })

        // 连接关闭
        this.client.on('close', () => {
          console.log('🔌 MQTT connection closed')
          this.isConnected = false
        })

        // 接收消息
        this.client.on('message', (topic, payload, packet) => {
          console.log('📨 MQTT message received:', {
            topic,
            payload: payload.toString(),
            qos: packet.qos,
            retain: packet.retain
          })
        })

        // 重连
        this.client.on('reconnect', () => {
          console.log('🔄 MQTT reconnecting...')
        })

        // 离线
        this.client.on('offline', () => {
          console.log('📴 MQTT offline')
          this.isConnected = false
        })

        // 设置连接超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'))
          }
        }, 10000)

      } catch (error) {
        reject(error)
      }
    })
  }

  // 发布消息
  publish(topic: string, message: string, options: {
    qos?: 0 | 1 | 2
    retain?: boolean
  } = {}): boolean {
    if (!this.client || !this.isConnected) {
      console.error('❌ MQTT client not connected')
      return false
    }

    const { qos = 0, retain = false } = options

    try {
      this.client.publish(topic, message, { qos, retain })
      console.log('📤 MQTT message published:', { topic, message, qos, retain })
      return true
    } catch (error) {
      console.error('❌ Failed to publish message:', error)
      return false
    }
  }

  // 订阅主题
  subscribe(topic: string, options: {
    qos?: 0 | 1 | 2
  } = {}): boolean {
    if (!this.client || !this.isConnected) {
      console.error('❌ MQTT client not connected')
      return false
    }

    const { qos = 0 } = options

    try {
      this.client.subscribe(topic, { qos })
      console.log('📡 MQTT subscribed to topic:', { topic, qos })
      return true
    } catch (error) {
      console.error('❌ Failed to subscribe to topic:', error)
      return false
    }
  }

  // 取消订阅主题
  unsubscribe(topic: string): boolean {
    if (!this.client || !this.isConnected) {
      console.error('❌ MQTT client not connected')
      return false
    }

    try {
      this.client.unsubscribe(topic)
      console.log('📡 MQTT unsubscribed from topic:', topic)
      return true
    } catch (error) {
      console.error('❌ Failed to unsubscribe from topic:', error)
      return false
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.client) {
      this.client.end()
      this.client = null
      this.isConnected = false
      console.log('🔌 MQTT disconnected')
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      clientId: this.client?.options?.clientId,
      connected: this.client?.connected || false
    }
  }

  // 设置消息处理器
  onMessage(handler: (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => void) {
    if (this.client) {
      this.client.on('message', handler)
    }
  }

  // 移除消息处理器
  offMessage(handler: (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => void) {
    if (this.client) {
      this.client.off('message', handler)
    }
  }
}

// 创建全局实例
export const mqttClient = new MqttClient()

// 在浏览器控制台中可用的测试函数
if (typeof window !== 'undefined') {
  (window as any).mqttClient = mqttClient
  console.log('🔧 MQTT client (mqtt.js) available as window.mqttClient')
  console.log('Usage:')
  console.log('  await window.mqttClient.connect()')
  console.log('  window.mqttClient.publish("test/topic", "Hello MQTT!")')
  console.log('  window.mqttClient.subscribe("test/topic")')
  console.log('  window.mqttClient.disconnect()')
}
