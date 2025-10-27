# 增加对 Trae IDE 的支持

## Why

Trae IDE 是一个新兴的 AI 驱动开发环境，需要与 OpenSpec 集成以支持规范驱动的开发工作流。目前 OpenSpec 支持多种 AI 工具（Claude、Cline、CodeBuddy 等），但缺少对 Trae IDE 的支持。

## What Changes

- 添加 `TraeConfigurator` 类，实现 `ToolConfigurator` 接口
- 在 `ToolRegistry` 中注册 Trae 配置器
- 支持在项目根目录的 `.trae/rules/project_rules.md` 文件中注入 OpenSpec 指令
- 遵循现有的配置器模式，使用 OPENSPEC 标记管理内容

## Impact

- affected specs: `cli-init` (初始化命令需要支持 Trae 选项)
- affected code: 
  - `src/core/configurators/trae.ts` (新文件)
  - `src/core/configurators/registry.ts` (注册新配置器)
  - 相关测试文件
- 向后兼容：不影响现有功能
- 用户体验：Trae IDE 用户可以通过 `openspec init` 自动配置项目规则