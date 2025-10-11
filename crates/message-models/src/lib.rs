pub mod v0;
pub mod version;

// 重新导出常用类型，默认使用最新版本 (v0)
pub use v0::{
    Envelope, EventContent, EventError, EventStatus, MessageContent, MessageMeta, MessageType,
};
pub use version::{SchemaVersion, VersionedEnvelope};

/// 库的预导入模块
pub mod prelude {
    pub use crate::v0::*;
    pub use crate::version::{SchemaVersion, VersionedEnvelope};
}
