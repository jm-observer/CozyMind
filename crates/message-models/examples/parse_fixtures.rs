use message_models::{Envelope, MessageContent};

fn main() {
    println!("=== 测试解析 fixtures ===\n");

    // 测试用户消息
    let user_json = r#"{ "type": "user", "content": "明早 7 点提醒我开会" }"#;
    println!("解析用户消息:");
    println!("输入: {}", user_json);
    
    match Envelope::from_json(user_json) {
        Ok(msg) => {
            println!("✅ 解析成功!");
            println!("  类型: {:?}", msg.message_type);
            if let MessageContent::Text(text) = &msg.content {
                println!("  内容: {}", text);
            }
            println!("  格式化输出:\n{}\n", msg.to_json_pretty().unwrap());
        }
        Err(e) => println!("❌ 解析失败: {}\n", e),
    }

    // 测试事件成功消息
    let event_ok_json = r#"{ "type": "event", "content": { "source": "mod-002", "status": "ok", "data": { "id": "r-1" } } }"#;
    println!("解析事件成功消息:");
    println!("输入: {}", event_ok_json);
    
    match Envelope::from_json(event_ok_json) {
        Ok(msg) => {
            println!("✅ 解析成功!");
            println!("  类型: {:?}", msg.message_type);
            if let MessageContent::Event(event) = &msg.content {
                println!("  事件来源: {}", event.source);
                println!("  事件状态: {:?}", event.status);
                if let Some(data) = &event.data {
                    println!("  数据: {:?}", data);
                }
                // 验证事件内容
                match event.validate() {
                    Ok(_) => println!("  ✅ 事件验证通过"),
                    Err(e) => println!("  ❌ 事件验证失败: {}", e),
                }
            }
            println!("  格式化输出:\n{}\n", msg.to_json_pretty().unwrap());
        }
        Err(e) => println!("❌ 解析失败: {}\n", e),
    }

    // 测试事件错误消息
    let event_error_json = r#"{ "type": "event", "content": { "source": "mod-003", "status": "error", "error": { "code": "E001", "message": "处理失败" } } }"#;
    println!("解析事件错误消息:");
    println!("输入: {}", event_error_json);
    
    match Envelope::from_json(event_error_json) {
        Ok(msg) => {
            println!("✅ 解析成功!");
            println!("  类型: {:?}", msg.message_type);
            if let MessageContent::Event(event) = &msg.content {
                println!("  事件来源: {}", event.source);
                println!("  事件状态: {:?}", event.status);
                if let Some(error) = &event.error {
                    println!("  错误代码: {}", error.code);
                    println!("  错误消息: {}", error.message);
                }
                // 验证事件内容
                match event.validate() {
                    Ok(_) => println!("  ✅ 事件验证通过"),
                    Err(e) => println!("  ❌ 事件验证失败: {}", e),
                }
            }
            println!("  格式化输出:\n{}\n", msg.to_json_pretty().unwrap());
        }
        Err(e) => println!("❌ 解析失败: {}\n", e),
    }

    println!("=== 所有测试完成 ===");
}

