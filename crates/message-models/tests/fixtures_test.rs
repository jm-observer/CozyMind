use message_models::prelude::*;

#[test]
fn test_user_text_fixture_with_version() {
    let json = r#"{
  "type": "user",
  "content": "明早 7 点提醒我开会",
  "meta": {
    "schema_version": "v0",
    "timestamp": "2024-10-11T08:00:00Z",
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai"
  }
}"#;

    let versioned = VersionedEnvelope::from_json(json).unwrap();
    assert_eq!(versioned.version(), SchemaVersion::V0);

    let envelope = versioned.as_v0().unwrap();
    assert_eq!(envelope.message_type, MessageType::User);

    let meta = envelope.meta.as_ref().unwrap();
    assert_eq!(meta.schema_version, "v0");
    assert!(meta.timestamp.is_some());
    assert_eq!(meta.locale.as_ref().unwrap(), "zh-CN");
    assert_eq!(meta.timezone.as_ref().unwrap(), "Asia/Shanghai");

    match &envelope.content {
        MessageContent::Text(text) => assert_eq!(text, "明早 7 点提醒我开会"),
        _ => panic!("Expected Text content"),
    }
}

#[test]
fn test_event_ok_fixture_with_version() {
    let json = r#"{
  "type": "event",
  "content": {
    "source": "mod-002",
    "status": "ok",
    "data": {
      "id": "r-1"
    }
  },
  "meta": {
    "schema_version": "v0",
    "timestamp": "2024-10-11T08:00:00Z"
  }
}"#;

    let versioned = VersionedEnvelope::from_json(json).unwrap();
    assert_eq!(versioned.version(), SchemaVersion::V0);

    let envelope = versioned.as_v0().unwrap();
    assert_eq!(envelope.message_type, MessageType::Event);

    let meta = envelope.meta.as_ref().unwrap();
    assert_eq!(meta.schema_version, "v0");
    assert!(meta.timestamp.is_some());

    match &envelope.content {
        MessageContent::Event(event) => {
            assert_eq!(event.source, "mod-002");
            assert_eq!(event.status, EventStatus::Ok);
            assert!(event.data.is_some());
            assert!(event.validate().is_ok());

            let data = event.data.as_ref().unwrap();
            assert_eq!(
                data.get("id").and_then(|v| v.as_str()),
                Some("r-1")
            );
        }
        _ => panic!("Expected Event content"),
    }
}

#[test]
fn test_event_error_fixture_with_version() {
    let json = r#"{
  "type": "event",
  "content": {
    "source": "mod-002",
    "status": "error",
    "error": {
      "code": "E_TIMEOUT",
      "message": "scheduler timeout"
    }
  },
  "meta": {
    "schema_version": "v0",
    "timestamp": "2024-10-11T08:00:00Z"
  }
}"#;

    let versioned = VersionedEnvelope::from_json(json).unwrap();
    assert_eq!(versioned.version(), SchemaVersion::V0);

    let envelope = versioned.as_v0().unwrap();
    assert_eq!(envelope.message_type, MessageType::Event);

    let meta = envelope.meta.as_ref().unwrap();
    assert_eq!(meta.schema_version, "v0");

    match &envelope.content {
        MessageContent::Event(event) => {
            assert_eq!(event.source, "mod-002");
            assert_eq!(event.status, EventStatus::Error);
            assert!(event.error.is_some());
            assert!(event.validate().is_ok());

            let error = event.error.as_ref().unwrap();
            assert_eq!(error.code, "E_TIMEOUT");
            assert_eq!(error.message, "scheduler timeout");
        }
        _ => panic!("Expected Event content"),
    }
}

#[test]
fn test_backward_compatibility_without_version() {
    // 测试向后兼容：没有版本信息的消息应该默认使用 v0
    let json = r#"{ "type": "user", "content": "测试" }"#;

    let versioned = VersionedEnvelope::from_json(json).unwrap();
    assert_eq!(versioned.version(), SchemaVersion::V0);

    let envelope = versioned.as_v0().unwrap();
    assert_eq!(envelope.message_type, MessageType::User);
}

#[test]
fn test_version_round_trip() {
    // 创建带版本的消息
    let meta = MessageMeta {
        schema_version: "v0".to_string(),
        timestamp: Some(chrono::Utc::now()),
        locale: Some("zh-CN".to_string()),
        timezone: None,
        additional: std::collections::HashMap::new(),
    };

    let envelope = Envelope::user("测试消息").with_meta(meta);
    let json = envelope.to_json().unwrap();

    // 通过 VersionedEnvelope 解析
    let versioned = VersionedEnvelope::from_json(&json).unwrap();
    assert_eq!(versioned.version(), SchemaVersion::V0);

    // 再次序列化
    let json2 = versioned.to_json().unwrap();

    // 再次解析验证
    let versioned2 = VersionedEnvelope::from_json(&json2).unwrap();
    assert_eq!(versioned2.version(), SchemaVersion::V0);
}

