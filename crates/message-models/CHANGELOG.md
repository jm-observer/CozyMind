# Changelog

## [0.1.0] - 2024-10-11

### 新增功能

#### 核心模型
- ✅ 实现 `Envelope` 消息信封结构
- ✅ 实现 `MessageType` 枚举 (System, User, Event)
- ✅ 实现 `MessageContent` 枚举支持多种内容类型
- ✅ 实现 `EventContent` 事件内容结构
- ✅ 实现 `EventStatus` 枚举 (Ok, Error)
- ✅ 实现 `EventError` 错误信息结构
- ✅ 实现 `MessageMeta` 元数据结构

#### 版本管理
- ✅ 添加 `SchemaVersion` 枚举支持多版本
- ✅ 添加 `VersionedEnvelope` 自动版本检测
- ✅ 实现版本兼容性检查
- ✅ 支持向后兼容（无版本信息默认 v0）
- ✅ 模块化设计，易于扩展新版本

#### 验证功能
- ✅ 事件内容验证（status 与 data/error 的一致性）
- ✅ Schema 规则验证

#### 序列化
- ✅ 支持 JSON 序列化/反序列化
- ✅ 支持格式化 JSON 输出
- ✅ 支持 `additionalProperties` 扩展字段

#### 测试
- ✅ 13 个单元测试（v0 模型 + 版本管理）
- ✅ 5 个集成测试（fixtures 验证）
- ✅ 测试覆盖：
  - 基本消息类型解析
  - 事件验证逻辑
  - 版本检测和转换
  - 向后兼容性
  - 序列化往返测试

#### 示例
- ✅ `parse_fixtures.rs` - 基本解析示例
- ✅ `version_demo.rs` - 版本功能完整演示
- ✅ `load_fixtures.rs` - 文件加载示例

#### 文档
- ✅ 完整的 README 文档
- ✅ API 使用示例
- ✅ 版本管理说明
- ✅ 最佳实践指南

### Fixtures 更新

所有 fixtures 文件已更新，包含版本信息：

- `resources/fixtures/user_text_ok.json` - 添加 meta.schema_version
- `resources/fixtures/event_ok.json` - 添加 meta.schema_version
- `resources/fixtures/event_error.json` - 添加 meta.schema_version

### 技术细节

#### 依赖
- `serde` 1.0 - 序列化框架
- `serde_json` 1.0 - JSON 支持
- `chrono` 0.4 - 时间处理

#### 项目结构
```
message-models/
├── src/
│   ├── lib.rs          # 库入口，重导出常用类型
│   ├── version.rs      # 版本管理和 VersionedEnvelope
│   └── v0.rs           # v0 版本模型定义
├── tests/
│   └── fixtures_test.rs # Fixture 测试
├── examples/           # 三个示例程序
├── README.md           # 完整文档
└── CHANGELOG.md        # 本文件
```

#### 设计原则

1. **模块化** - 每个版本独立模块，便于维护
2. **类型安全** - 使用 Rust 类型系统确保正确性
3. **扩展性** - 易于添加新版本和新功能
4. **兼容性** - 向后兼容，平滑迁移
5. **测试驱动** - 完整的测试覆盖

### 未来计划

- [ ] 添加 v1 schema 支持（当需要时）
- [ ] 实现版本自动转换逻辑
- [ ] 添加更多验证规则
- [ ] 性能优化
- [ ] 添加 benchmark 测试

### 基于 Schema

本库实现基于以下 JSON Schema：
- `resources/schemas/v0/envelope.json`
- `resources/schemas/v0/event-content.json`
- `resources/schemas/v0/user-content.json`


