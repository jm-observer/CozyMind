use message_models::prelude::*;
use std::fs;
use std::path::Path;

fn main() {
    println!("=== 加载和验证 Fixtures ===\n");

    let fixtures_dir = "resources/fixtures";
    let fixture_files = vec![
        "user_text_ok.json",
        "event_ok.json",
        "event_error.json",
    ];

    for filename in fixture_files {
        let filepath = Path::new(fixtures_dir).join(filename);
        println!("📄 加载文件: {}", filepath.display());

        match fs::read_to_string(&filepath) {
            Ok(json) => {
                // 使用 VersionedEnvelope 自动检测版本
                match VersionedEnvelope::from_json(&json) {
                    Ok(versioned) => {
                        println!("  ✅ 解析成功");
                        println!("  检测到版本: {}", versioned.version());

                        if let Some(envelope) = versioned.as_v0() {
                            println!("  消息类型: {:?}", envelope.message_type);

                            // 显示 meta 信息
                            let meta = &envelope.meta;
                            println!("  Meta 信息:");
                            println!("    - schema_version: {}", meta.schema_version);
                            println!("    - timestamp: {}", meta.timestamp);

                            // 显示内容信息
                            match &envelope.content {
                                MessageContent::Text(text) => {
                                    println!("  内容: \"{}\"", text);
                                }
                                MessageContent::Event(event) => {
                                    println!("  事件来源: {}", event.source);
                                    println!("  事件状态: {:?}", event.status);

                                    // 验证事件
                                    match event.validate() {
                                        Ok(_) => println!("  ✅ 事件验证通过"),
                                        Err(e) => println!("  ❌ 事件验证失败: {}", e),
                                    }

                                    if let Some(data) = &event.data {
                                        println!("  数据: {:?}", data);
                                    }
                                    if let Some(error) = &event.error {
                                        println!("  错误:");
                                        println!("    - code: {}", error.code);
                                        println!("    - message: {}", error.message);
                                    }
                                }
                                MessageContent::Object(obj) => {
                                    println!("  对象内容: {:?}", obj);
                                }
                            }
                        }

                        // 显示格式化的 JSON
                        println!("  格式化输出:");
                        if let Ok(pretty) = versioned.to_json_pretty() {
                            for line in pretty.lines() {
                                println!("    {}", line);
                            }
                        }
                    }
                    Err(e) => {
                        println!("  ❌ 解析失败: {}", e);
                    }
                }
            }
            Err(e) => {
                println!("  ⚠️  无法读取文件: {}", e);
                println!("  （这是正常的，如果从 crate 目录运行请从项目根目录运行）");
            }
        }
        println!();
    }

    println!("=== 验证完成 ===");
    println!("\n💡 提示: 所有 fixtures 都包含 meta.schema_version 字段");
    println!("   这确保了消息可以被正确地版本化和解析");
}


