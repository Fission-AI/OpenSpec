# 实现任务

## 1. 核心实现
- [ ] 1.1 创建 `src/core/configurators/trae.ts` 文件
- [ ] 1.2 实现 `TraeConfigurator` 类，继承 `ToolConfigurator` 接口
- [ ] 1.3 配置目标文件路径为 `.trae/rules/project_rules.md`
- [ ] 1.4 使用 `TemplateManager.getAgentsStandardTemplate()` 获取模板内容

## 2. 注册集成
- [ ] 2.1 在 `src/core/configurators/registry.ts` 中导入 `TraeConfigurator`
- [ ] 2.2 在 `ToolRegistry` 静态块中注册 Trae 配置器
- [ ] 2.3 使用 'trae' 作为工具 ID

## 3. 测试验证
- [ ] 3.1 创建单元测试文件 `test/core/configurators/trae.test.ts`
- [ ] 3.2 测试配置器的基本功能
- [ ] 3.3 验证文件路径和内容生成
- [ ] 3.4 运行现有测试确保无回归

## 4. 文档更新
- [ ] 4.1 确认 CLI 初始化命令自动包含新的配置器
- [ ] 4.2 验证 `openspec init` 命令中 Trae 选项可用