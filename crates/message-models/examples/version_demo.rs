use message_models::prelude::*;
use std::collections::HashMap;

fn main() {
    println!("=== Message Models 版本支持演示 ===\n");

    // 1. 显示支持的版本
    println!("📦 支持的 Schema 版本:");
    for version in SchemaVersion::all() {
        println!("  - {}", version);
    }
    println!("  当前默认版本: {}", SchemaVersion::default());
    println!("  最新版本: {}\n", SchemaVersion::latest());

    // 2. 创建带版本信息的消息
    println!("🔖 创建带版本信息的消息:");
    let meta = MessageMeta {
        schema_version: "v0".to_string(),
        timestamp: Some(chrono::Utc::now()),
        locale: Some("zh-CN".to_string()),
        timezone: Some("Asia/Shanghai".to_string()),
        additional: HashMap::new(),
    };
    
    let msg = Envelope::user("测试消息").with_meta(meta);
    println!("{}\n", msg.to_json_pretty().unwrap());

    // 3. 使用 VersionedEnvelope 自动检测版本
    println!("🔍 自动检测消息版本:");
    
    let test_messages = vec![
        r#"{ "type": "user", "content": "没有版本信息" }"#,
        r#"{
            "type": "user",
            "content": "有版本信息",
            "meta": {
                "schema_version": "v0"
            }
        }"#,
        r#"{
            "type": "event",
            "content": {
                "source": "test-module",
                "status": "ok",
                "data": { "result": "success" }
            },
            "meta": {
                "schema_version": "v0",
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }"#,
    ];

    for (i, json) in test_messages.iter().enumerate() {
        println!("  消息 {}:", i + 1);
        match VersionedEnvelope::from_json(json) {
            Ok(versioned) => {
                println!("    ✅ 解析成功");
                println!("    版本: {}", versioned.version());
                
                // 尝试获取 v0 版本的信封
                if let Some(envelope) = versioned.as_v0() {
                    println!("    类型: {:?}", envelope.message_type);
                    if let Some(meta) = &envelope.meta {
                        println!("    Meta: schema_version={}", meta.schema_version);
                    }
                }
            }
            Err(e) => println!("    ❌ 解析失败: {}", e),
        }
        println!();
    }

    // 4. 版本兼容性检查
    println!("🔄 版本兼容性:");
    let v0 = SchemaVersion::V0;
    println!("  v0 与 v0 兼容: {}", v0.is_compatible_with(&SchemaVersion::V0));
    println!();

    // 5. 转换和升级（未来功能预览）
    println!("🚀 版本转换预览:");
    let json = r#"{ "type": "user", "content": "测试" }"#;
    let versioned = VersionedEnvelope::from_json(json).unwrap();
    
    match versioned.upgrade_to(SchemaVersion::V0) {
        Ok(_) => println!("  ✅ 保持在 v0 版本"),
        Err(e) => println!("  ❌ 转换失败: {}", e),
    }
    
    // 尝试"升级"到不存在的版本（演示错误处理）
    println!("  尝试升级到未来版本（应该失败）...");
    println!("  （未来添加 v1 时，这里会展示实际的版本转换）\n");

    // 6. 实用工具
    println!("🛠️  实用工具:");
    let envelope = Envelope::user("工具测试");
    println!("  直接使用 v0::Envelope:");
    println!("  - to_json(): {}", envelope.to_json().unwrap());
    
    let versioned = VersionedEnvelope::V0(envelope.clone());
    println!("  使用 VersionedEnvelope:");
    println!("  - version(): {}", versioned.version());
    println!("  - into_v0(): {:?}", versioned.into_v0().is_some());
    
    println!("\n=== 演示完成 ===");
}

