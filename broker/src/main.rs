use rumqttd::{Broker, Config, Notification};
use std::thread;
use std::collections::HashMap;

fn main() {
    // 加载环境变量
    dotenvy::dotenv().ok();

    let builder = tracing_subscriber::fmt()
        .pretty()
        .with_line_number(true)
        .with_file(true)
        .with_thread_ids(false)
        .with_thread_names(false);

    builder
        .try_init()
        .expect("initialized subscriber succesfully");

    // 从环境变量读取端口配置
    let mqtt_v4_host = std::env::var("BROKER_MQTT_V4_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let mqtt_v4_port = std::env::var("BROKER_MQTT_V4_PORT").unwrap_or_else(|_| "8883".to_string());
    let mqtt_v5_host = std::env::var("BROKER_MQTT_V5_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let mqtt_v5_port = std::env::var("BROKER_MQTT_V5_PORT").unwrap_or_else(|_| "8884".to_string());
    let prometheus_host = std::env::var("BROKER_PROMETHEUS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let prometheus_port = std::env::var("BROKER_PROMETHEUS_PORT").unwrap_or_else(|_| "9042".to_string());
    let console_host = std::env::var("BROKER_CONSOLE_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let console_port = std::env::var("BROKER_CONSOLE_PORT").unwrap_or_else(|_| "33030".to_string());

    // 创建配置覆盖
    let mut overrides = HashMap::new();
    overrides.insert("v4.1.listen".to_string(), format!("{}:{}", mqtt_v4_host, mqtt_v4_port));
    overrides.insert("v5.1.listen".to_string(), format!("{}:{}", mqtt_v5_host, mqtt_v5_port));
    overrides.insert("prometheus.listen".to_string(), format!("{}:{}", prometheus_host, prometheus_port));
    overrides.insert("console.listen".to_string(), format!("{}:{}", console_host, console_port));

    println!("📡 MQTT Broker Configuration:");
    println!("  MQTT v4: {}", overrides.get("v4.1.listen").unwrap());
    println!("  MQTT v5: {}", overrides.get("v5.1.listen").unwrap());
    println!("  Prometheus: {}", overrides.get("prometheus.listen").unwrap());
    println!("  Console: {}", overrides.get("console.listen").unwrap());

    // As examples are compiled as seperate binary so this config is current path dependent. Run it
    // from root of this crate
    let config = config::Config::builder()
        .add_source(config::File::with_name("rumqttd.toml"))
        .add_source(config::Config::try_from(&overrides).unwrap())
        .build()
        .unwrap();

    let config: Config = config.try_deserialize().unwrap();

    dbg!(&config);

    let mut broker = Broker::new(config);
    let (mut link_tx, mut link_rx) = broker.link("singlenode").unwrap();
    thread::spawn(move || {
        broker.start().unwrap();
    });

    link_tx.subscribe("#").unwrap();

    let mut count = 0;
    loop {
        let notification = match link_rx.recv().unwrap() {
            Some(v) => v,
            None => continue,
        };

        match notification {
            Notification::Forward(forward) => {
                count += 1;
                println!(
                    "Topic = {:?}, Count = {}, Payload = {} bytes",
                    forward.publish.topic,
                    count,
                    forward.publish.payload.len()
                );
            }
            v => {
                println!("{v:?}");
            }
        }
    }
}
