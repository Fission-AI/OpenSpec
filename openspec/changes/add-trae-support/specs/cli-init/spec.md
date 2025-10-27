# CLI Init 规范增量变更

## ADDED Requirements

### Requirement: Trae IDE 配置支持
系统 SHALL 支持为 Trae IDE 生成项目配置文件。

#### Scenario: 用户选择 Trae IDE 工具
- **WHEN** 用户在初始化过程中选择 Trae IDE 作为 AI 工具
- **THEN** 系统应在 `.trae/rules/project_rules.md` 文件中注入 OpenSpec 指令
- **AND** 使用 OPENSPEC 标记管理内容块
- **AND** 内容应包含项目特定的 OpenSpec 使用说明

#### Scenario: Trae 配置文件已存在
- **WHEN** 项目中已存在 `.trae/rules/project_rules.md` 文件
- **THEN** 系统应使用 OPENSPEC 标记更新现有文件
- **AND** 保留文件中的其他内容不变
- **AND** 仅更新 OPENSPEC 标记之间的内容

#### Scenario: Trae 目录不存在
- **WHEN** 项目中不存在 `.trae/rules/` 目录
- **THEN** 系统应自动创建必要的目录结构
- **AND** 创建 `project_rules.md` 文件
- **AND** 注入完整的 OpenSpec 配置内容