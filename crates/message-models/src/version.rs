use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

/// Schema 版本枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SchemaVersion {
    /// Schema v0 版本
    #[serde(rename = "v0")]
    V0,
    // 未来可以添加更多版本:
    // #[serde(rename = "v1")]
    // V1,
}

impl Default for SchemaVersion {
    fn default() -> Self {
        Self::V0
    }
}

impl fmt::Display for SchemaVersion {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0 => write!(f, "v0"),
        }
    }
}

impl FromStr for SchemaVersion {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "v0" => Ok(Self::V0),
            _ => Err(format!("Unknown schema version: {}", s)),
        }
    }
}

impl SchemaVersion {
    /// 获取所有支持的版本
    pub fn all() -> Vec<SchemaVersion> {
        vec![Self::V0]
    }

    /// 获取最新版本
    pub fn latest() -> SchemaVersion {
        Self::V0
    }

    /// 检查是否兼容指定版本
    pub fn is_compatible_with(&self, other: &SchemaVersion) -> bool {
        // 目前只有 v0，都兼容
        // 未来可以添加更复杂的兼容性逻辑
        self == other
    }
}

/// 带版本信息的消息信封
/// 
/// 这个结构体用于解析包含明确版本信息的消息，
/// 并根据版本选择合适的解析器
#[derive(Debug, Clone, PartialEq)]
pub enum VersionedEnvelope {
    V0(crate::v0::Envelope),
    // 未来版本可以在这里添加:
    // V1(crate::v1::Envelope),
}

impl VersionedEnvelope {
    /// 从 JSON 字符串解析，自动检测版本
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        // 首先尝试提取版本信息
        let version = Self::detect_version(json)?;
        
        match version {
            SchemaVersion::V0 => {
                let envelope = crate::v0::Envelope::from_json(json)?;
                Ok(Self::V0(envelope))
            }
        }
    }

    /// 检测 JSON 中的版本信息
    fn detect_version(json: &str) -> Result<SchemaVersion, serde_json::Error> {
        use serde_json::Value;
        
        let value: Value = serde_json::from_str(json)?;
        
        // 尝试从 meta.schema_version 获取版本
        if let Some(meta) = value.get("meta") {
            if let Some(schema_version) = meta.get("schema_version") {
                if let Some(version_str) = schema_version.as_str() {
                    if let Ok(version) = version_str.parse::<SchemaVersion>() {
                        return Ok(version);
                    }
                }
            }
        }
        
        // 默认使用 v0
        Ok(SchemaVersion::default())
    }

    /// 转换为 JSON 字符串
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        match self {
            Self::V0(envelope) => envelope.to_json(),
        }
    }

    /// 转换为格式化的 JSON 字符串
    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        match self {
            Self::V0(envelope) => envelope.to_json_pretty(),
        }
    }

    /// 获取消息的版本
    pub fn version(&self) -> SchemaVersion {
        match self {
            Self::V0(_) => SchemaVersion::V0,
        }
    }

    /// 尝试获取 v0 版本的信封
    pub fn as_v0(&self) -> Option<&crate::v0::Envelope> {
        match self {
            Self::V0(envelope) => Some(envelope),
        }
    }

    /// 尝试转换为 v0 版本的信封
    pub fn into_v0(self) -> Option<crate::v0::Envelope> {
        match self {
            Self::V0(envelope) => Some(envelope),
        }
    }

    /// 升级到指定版本（如果可能）
    pub fn upgrade_to(&self, target: SchemaVersion) -> Result<Self, String> {
        if self.version() == target {
            return Ok(self.clone());
        }
        
        // 未来可以在这里添加版本转换逻辑
        Err(format!(
            "Cannot upgrade from {} to {}",
            self.version(),
            target
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_version_parsing() {
        assert_eq!("v0".parse::<SchemaVersion>().unwrap(), SchemaVersion::V0);
        assert_eq!("V0".parse::<SchemaVersion>().unwrap(), SchemaVersion::V0);
        assert!("v1".parse::<SchemaVersion>().is_err());
    }

    #[test]
    fn test_schema_version_display() {
        assert_eq!(SchemaVersion::V0.to_string(), "v0");
    }

    #[test]
    fn test_schema_version_default() {
        assert_eq!(SchemaVersion::default(), SchemaVersion::V0);
    }

    #[test]
    fn test_schema_version_compatibility() {
        assert!(SchemaVersion::V0.is_compatible_with(&SchemaVersion::V0));
    }

    #[test]
    fn test_versioned_envelope_without_meta() {
        let json = r#"{ "type": "user", "content": "测试" }"#;
        let versioned = VersionedEnvelope::from_json(json).unwrap();
        assert_eq!(versioned.version(), SchemaVersion::V0);
        assert!(versioned.as_v0().is_some());
    }

    #[test]
    fn test_versioned_envelope_with_meta() {
        let json = r#"{
            "type": "user",
            "content": "测试",
            "meta": {
                "schema_version": "v0"
            }
        }"#;
        let versioned = VersionedEnvelope::from_json(json).unwrap();
        assert_eq!(versioned.version(), SchemaVersion::V0);
    }

    #[test]
    fn test_versioned_envelope_round_trip() {
        let json = r#"{ "type": "user", "content": "测试" }"#;
        let versioned = VersionedEnvelope::from_json(json).unwrap();
        let json_out = versioned.to_json().unwrap();
        let versioned2 = VersionedEnvelope::from_json(&json_out).unwrap();
        assert_eq!(versioned.version(), versioned2.version());
    }
}


