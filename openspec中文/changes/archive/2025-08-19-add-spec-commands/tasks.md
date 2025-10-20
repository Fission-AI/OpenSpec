# 实现任务（第三阶段：基于 add-zod-validation 和 add-change-commands）

## 1. 命令实现
- [x] 1.1 创建 src/commands/spec.ts
- [x] 1.2 从 src/core/schemas/ 导入 RequirementSchema, ScenarioSchema, SpecSchema
- [x] 1.3 从 src/core/parsers/markdown-parser.ts 导入 markdown 解析器
- [x] 1.4 从 src/core/validation/validator.ts 导入 SpecValidator
- [x] 1.5 从 src/core/converters/json-converter.ts 导入 JSON 转换器
- [x] 1.6 使用现有转换器实现带 JSON 输出的 show 子命令
- [x] 1.7 实现 list 子命令
- [x] 1.8 使用现有 SpecValidator 实现 validate 子命令
- [x] 1.9 添加过滤选项 (--requirements, --no-scenarios, -r)
- [x] 1.10 添加 --strict 模式支持（利用现有验证基础设施）
- [x] 1.11 为验证报告添加 --json 标志

## 2. 集成
- [x] 2.1 在 src/cli/index.ts 中注册规范命令
- [x] 2.2 为所有子命令添加集成测试
- [x] 2.3 测试 JSON 输出验证
- [x] 2.4 测试过滤选项
- [x] 2.5 测试严格模式下的验证
- [x] 2.6 更新 CLI 帮助文档（在主帮助中添加 'spec' 命令，记录子命令：show, list, validate）