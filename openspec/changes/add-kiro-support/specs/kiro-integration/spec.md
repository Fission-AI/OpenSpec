# Kiro Integration Specification / Kiro 集成规格

## ADDED Requirements

### Requirement: Kiro Steering File Generation / Kiro Steering 文件生成

The system SHALL generate a Kiro steering file at `.kiro/steering/openspec.md` containing OpenSpec workflow guidance when Kiro is selected during initialization.

当初始化时选择 Kiro，系统应在 `.kiro/steering/openspec.md` 生成包含 OpenSpec 工作流指导的 steering 文件。

#### Scenario: Generating Kiro steering file / 生成 Kiro steering 文件

- **WHEN** the user selects Kiro IDE during `openspec init`
- **THEN** create `.kiro/steering/openspec.md` with OpenSpec workflow instructions
- **AND** wrap the content in OpenSpec managed markers (`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`)
- **AND** include guidance for proposal, apply, and archive workflows

---

- **WHEN** 用户在 `openspec init` 时选择 Kiro IDE
- **THEN** 创建 `.kiro/steering/openspec.md` 包含 OpenSpec 工作流指导
- **AND** 使用 OpenSpec 管理标记包裹内容（`<!-- OPENSPEC:START -->` / `<!-- OPENSPEC:END -->`）
- **AND** 包含 proposal、apply 和 archive 工作流的指导

### Requirement: Kiro Steering File Content / Kiro Steering 文件内容

The steering file SHALL contain comprehensive OpenSpec workflow instructions adapted for Kiro's context inclusion mechanism.

steering 文件应包含针对 Kiro 上下文包含机制适配的完整 OpenSpec 工作流指导。

#### Scenario: Steering file includes workflow phases / Steering 文件包含工作流阶段

- **WHEN** the Kiro steering file is generated
- **THEN** include instructions for the proposal phase (creating `openspec/changes/<name>/proposal.md`)
- **AND** include instructions for the specs phase (creating spec files under `specs/`)
- **AND** include instructions for the design phase (optional `design.md`)
- **AND** include instructions for the tasks phase (creating `tasks.md`)
- **AND** include instructions for the apply phase (implementing tasks)
- **AND** include instructions for the archive phase (using `openspec archive`)

---

- **WHEN** 生成 Kiro steering 文件时
- **THEN** 包含 proposal 阶段指导（创建 `openspec/changes/<name>/proposal.md`）
- **AND** 包含 specs 阶段指导（在 `specs/` 下创建 spec 文件）
- **AND** 包含 design 阶段指导（可选的 `design.md`）
- **AND** 包含 tasks 阶段指导（创建 `tasks.md`）
- **AND** 包含 apply 阶段指导（实现任务）
- **AND** 包含 archive 阶段指导（使用 `openspec archive`）

#### Scenario: Steering file references project files / Steering 文件引用项目文件

- **WHEN** the Kiro steering file is generated
- **THEN** use Kiro's `#[[file:]]` syntax to reference `openspec/AGENTS.md` for detailed instructions
- **AND** reference `openspec/config.yaml` for schema configuration

---

- **WHEN** 生成 Kiro steering 文件时
- **THEN** 使用 Kiro 的 `#[[file:]]` 语法引用 `openspec/AGENTS.md` 获取详细指导
- **AND** 引用 `openspec/config.yaml` 获取 schema 配置

### Requirement: Kiro Tool Registration / Kiro 工具注册

The system SHALL register Kiro IDE in the tool registry with appropriate metadata for CLI selection.

系统应在工具注册表中注册 Kiro IDE，包含适当的元数据用于 CLI 选择。

#### Scenario: Kiro appears in tool selection / Kiro 出现在工具选择中

- **WHEN** running `openspec init` interactively
- **THEN** display "Kiro IDE" as a selectable option under "Natively supported providers"
- **AND** use `kiro` as the tool identifier

---

- **WHEN** 交互式运行 `openspec init` 时
- **THEN** 在 "Natively supported providers" 下显示 "Kiro IDE" 作为可选项
- **AND** 使用 `kiro` 作为工具标识符

#### Scenario: Kiro can be selected non-interactively / 非交互式选择 Kiro

- **WHEN** running `openspec init --tools kiro`
- **THEN** configure Kiro without prompting
- **AND** generate the Kiro steering file

---

- **WHEN** 运行 `openspec init --tools kiro` 时
- **THEN** 无需提示即可配置 Kiro
- **AND** 生成 Kiro steering 文件

### Requirement: Kiro File Update Support / Kiro 文件更新支持

The system SHALL support updating existing Kiro configuration files through `openspec update`.

系统应支持通过 `openspec update` 更新已存在的 Kiro 配置文件。

#### Scenario: Updating existing Kiro steering file / 更新已存在的 Kiro steering 文件

- **WHEN** running `openspec update` with existing `.kiro/steering/openspec.md`
- **THEN** refresh content within OpenSpec managed markers
- **AND** preserve any user content outside the markers

---

- **WHEN** 运行 `openspec update` 且 `.kiro/steering/openspec.md` 已存在时
- **THEN** 刷新 OpenSpec 管理标记内的内容
- **AND** 保留标记外的用户内容

### Requirement: Kiro Steering File Frontmatter / Kiro Steering 文件 Frontmatter

The steering file SHALL include YAML frontmatter for Kiro's inclusion configuration.

steering 文件应包含用于 Kiro 包含配置的 YAML frontmatter。

#### Scenario: Steering file has always-included frontmatter / Steering 文件具有始终包含的 frontmatter

- **WHEN** the Kiro steering file is generated
- **THEN** include YAML frontmatter with `inclusion: always` to ensure OpenSpec guidance is always available

---

- **WHEN** 生成 Kiro steering 文件时
- **THEN** 包含 YAML frontmatter 设置 `inclusion: always` 以确保 OpenSpec 指导始终可用
