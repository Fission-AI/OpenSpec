## Why

Kiro IDE is an AI-powered development environment from AWS with native support for Spec-Driven Development (SDD) workflows. Kiro uses `.kiro/specs/` directory for spec files and steering files (`.kiro/steering/*.md`) for project-level guidance. Integrating OpenSpec with Kiro enables developers to seamlessly use OpenSpec's change management workflow within Kiro while leveraging Kiro's native SDD capabilities.

Kiro IDE 是 AWS 推出的 AI 驱动开发环境，原生支持 Spec-Driven Development (SDD) 工作流。Kiro 使用 `.kiro/specs/` 目录管理规格文件，通过 steering 文件（`.kiro/steering/*.md`）提供项目级指导。将 OpenSpec 与 Kiro 集成可以让开发者在 Kiro 中无缝使用 OpenSpec 的变更管理工作流，同时利用 Kiro 的原生 SDD 能力。

## What Changes

- Add Kiro IDE support to the CLI tool picker (`openspec init`)
- Generate Kiro steering file (`.kiro/steering/openspec.md`) containing OpenSpec workflow guidance
- Create Kiro-compatible spec templates supporting Kiro's `#[[file:]]` reference syntax
- Ensure `openspec update` can refresh existing Kiro configuration files
- Add Kiro-related unit tests and documentation updates

---

- 在 CLI 工具选择器（`openspec init`）中添加 Kiro IDE 支持
- 生成 Kiro steering 文件（`.kiro/steering/openspec.md`）包含 OpenSpec 工作流指导
- 创建 Kiro 兼容的 spec 模板，支持 Kiro 的 `#[[file:]]` 引用语法
- 确保 `openspec update` 可以刷新已存在的 Kiro 配置文件
- 添加 Kiro 相关的单元测试和文档更新

## Capabilities

### New Capabilities

- `kiro-integration`: Kiro IDE integration support including steering file generation, spec template adaptation, and workflow guidance
- `kiro-integration`: Kiro IDE 集成支持，包括 steering 文件生成、spec 模板适配和工作流指导

### Modified Capabilities

- `cli-init`: Add Kiro as a selectable AI tool, generating `.kiro/steering/openspec.md` and related configuration
- `cli-init`: 添加 Kiro 作为可选的 AI 工具，生成 `.kiro/steering/openspec.md` 和相关配置

## Impact

- Specs: `cli-init` (new Kiro tool option), `cli-update` (Kiro file refresh support)
- Code: 
  - `src/core/command-generation/adapters/` - new Kiro adapter
  - `src/core/templates/` - new Kiro steering templates
  - Tool registry and slash command registry
- New files:
  - `.kiro/steering/openspec.md` - OpenSpec workflow steering file
- Tests: init/update integration tests covering Kiro generation and updates
- Docs: README and tooling docs updated to advertise Kiro support

---

- Specs: `cli-init`（新增 Kiro 工具选项）, `cli-update`（支持 Kiro 文件刷新）
- Code: 
  - `src/core/command-generation/adapters/` - 新增 Kiro adapter
  - `src/core/templates/` - 新增 Kiro steering 模板
  - 工具注册表和 slash command 注册表
- New files:
  - `.kiro/steering/openspec.md` - OpenSpec 工作流 steering 文件
- Tests: init/update 集成测试覆盖 Kiro 生成和更新
- Docs: README 和工具文档更新以宣传 Kiro 支持
