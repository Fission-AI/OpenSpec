# CLI Init Specification - Kiro Support Delta / CLI Init 规格 - Kiro 支持增量

## ADDED Requirements

### Requirement: Generating steering file for Kiro IDE / 为 Kiro IDE 生成 steering 文件

The command SHALL generate Kiro steering files when Kiro IDE is selected during initialization.

当初始化时选择 Kiro IDE，命令应生成 Kiro steering 文件。

#### Scenario: Generating steering file for Kiro / 为 Kiro 生成 steering 文件

- **WHEN** the user selects Kiro IDE during initialization
- **THEN** create `.kiro/steering/openspec.md` with OpenSpec workflow instructions
- **AND** include YAML frontmatter with `inclusion: always`
- **AND** wrap the OpenSpec instructions in managed markers (`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`)
- **AND** reference `openspec/AGENTS.md` using Kiro's `#[[file:openspec/AGENTS.md]]` syntax for detailed guidance

---

- **WHEN** 用户在初始化时选择 Kiro IDE
- **THEN** 创建 `.kiro/steering/openspec.md` 包含 OpenSpec 工作流指导
- **AND** 包含 YAML frontmatter 设置 `inclusion: always`
- **AND** 使用管理标记包裹 OpenSpec 指导（`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`）
- **AND** 使用 Kiro 的 `#[[file:openspec/AGENTS.md]]` 语法引用详细指导

#### Scenario: Kiro steering file structure / Kiro steering 文件结构

- **WHEN** the Kiro steering file is generated
- **THEN** the file SHALL have the following structure:
  ```markdown
  ---
  inclusion: always
  ---
  <!-- OPENSPEC:START -->
  # OpenSpec Workflow Guide
  
  This project uses OpenSpec for spec-driven development.
  
  For complete instructions, see: #[[file:openspec/AGENTS.md]]
  
  ## Quick Reference
  - Proposal: Create `openspec/changes/<name>/proposal.md`
  - Specs: Define requirements in `specs/<capability>/spec.md`
  - Tasks: Break down work in `tasks.md`
  - Apply: Implement tasks and mark complete
  - Archive: Run `openspec archive <change-name>`
  <!-- OPENSPEC:END -->
  ```

---

- **WHEN** 生成 Kiro steering 文件时
- **THEN** 文件应具有以下结构：
  ```markdown
  ---
  inclusion: always
  ---
  <!-- OPENSPEC:START -->
  # OpenSpec 工作流指南
  
  本项目使用 OpenSpec 进行规格驱动开发。
  
  完整指导请参见：#[[file:openspec/AGENTS.md]]
  
  ## 快速参考
  - Proposal: 创建 `openspec/changes/<name>/proposal.md`
  - Specs: 在 `specs/<capability>/spec.md` 定义需求
  - Tasks: 在 `tasks.md` 分解工作
  - Apply: 实现任务并标记完成
  - Archive: 运行 `openspec archive <change-name>`
  <!-- OPENSPEC:END -->
  ```

### Requirement: Kiro in non-interactive mode / 非交互模式下的 Kiro

The command SHALL support Kiro selection through the `--tools` option.

命令应支持通过 `--tools` 选项选择 Kiro。

#### Scenario: Select Kiro non-interactively / 非交互式选择 Kiro

- **WHEN** run with `--tools kiro`
- **THEN** configure Kiro IDE without prompting
- **AND** generate `.kiro/steering/openspec.md`

---

- **WHEN** 使用 `--tools kiro` 运行时
- **THEN** 无需提示即可配置 Kiro IDE
- **AND** 生成 `.kiro/steering/openspec.md`

#### Scenario: Kiro included in all tools / Kiro 包含在所有工具中

- **WHEN** run with `--tools all`
- **THEN** include Kiro IDE in the selected tools
- **AND** generate Kiro steering file along with other tool configurations

---

- **WHEN** 使用 `--tools all` 运行时
- **THEN** 在选中的工具中包含 Kiro IDE
- **AND** 与其他工具配置一起生成 Kiro steering 文件
