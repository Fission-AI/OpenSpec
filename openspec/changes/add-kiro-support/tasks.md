# Tasks / 任务

## 1. Tool Registration / 工具注册

- [x] 1.1 Add Kiro to tool registry in `src/core/command-generation/registry.ts` with id `kiro`, name `Kiro IDE`, and appropriate metadata
- [x] 1.1 在 `src/core/command-generation/registry.ts` 中添加 Kiro 到工具注册表，id 为 `kiro`，名称为 `Kiro IDE`，包含适当的元数据

- [x] 1.2 Register Kiro steering file path pattern `.kiro/steering/opsx-<id>.md` in the configurator system
- [x] 1.2 在配置器系统中注册 Kiro steering 文件路径模式 `.kiro/steering/opsx-<id>.md`

## 2. Kiro Adapter Implementation / Kiro 适配器实现

- [x] 2.1 Create `src/core/command-generation/adapters/kiro.ts` adapter following existing adapter patterns (e.g., cline.ts, windsurf.ts)
- [x] 2.1 创建 `src/core/command-generation/adapters/kiro.ts` 适配器，遵循现有适配器模式（如 cline.ts、windsurf.ts）

- [x] 2.2 Implement steering file generation with YAML frontmatter (`inclusion: always`)
- [x] 2.2 实现带有 YAML frontmatter（`inclusion: always`）的 steering 文件生成

- [x] 2.3 Add Kiro-specific `#[[file:]]` reference syntax support in templates
- [x] 2.3 在模板中添加 Kiro 特有的 `#[[file:]]` 引用语法支持

## 3. Template Creation / 模板创建

- [x] 3.1 Add Kiro steering template to `src/core/templates/` with OpenSpec workflow guidance
- [x] 3.1 在 `src/core/templates/` 中添加包含 OpenSpec 工作流指导的 Kiro steering 模板

- [x] 3.2 Include managed markers (`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`) in template
- [x] 3.2 在模板中包含管理标记（`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`）

## 4. Update Command Support / 更新命令支持

- [x] 4.1 Ensure `openspec update` detects and refreshes existing `.kiro/steering/opsx-*.md`
- [x] 4.1 确保 `openspec update` 能检测并刷新已存在的 `.kiro/steering/opsx-*.md`

- [x] 4.2 Preserve user content outside managed markers during update
- [x] 4.2 更新时保留管理标记外的用户内容

## 5. Testing / 测试

- [x] 5.1 Add unit tests for Kiro adapter in `test/core/command-generation/`
- [x] 5.1 在 `test/core/command-generation/` 中添加 Kiro 适配器单元测试

- [x] 5.2 Add init integration tests for Kiro tool selection (interactive and non-interactive)
- [x] 5.2 添加 Kiro 工具选择的 init 集成测试（交互式和非交互式）

- [x] 5.3 Add update integration tests for Kiro steering file refresh
- [x] 5.3 添加 Kiro steering 文件刷新的 update 集成测试

## 6. Documentation / 文档

- [x] 6.1 Update README.md to list Kiro IDE as a supported tool
- [x] 6.1 更新 README.md 将 Kiro IDE 列为支持的工具

- [x] 6.2 Update `docs/supported-tools.md` with Kiro configuration details
- [x] 6.2 更新 `docs/supported-tools.md` 添加 Kiro 配置详情
