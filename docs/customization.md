# 自定义配置 (Customization)

OpenSpec 提供三个层级的自定义（customization）配置：

| 层级 | 作用 | 适用场景 |
|-------|------|----------|
| **Project Config** | 设置默认值，注入上下文/规则 | 大多数团队 |
| **Custom Schemas** | 定义你自己的工作流 artifact | 有独特流程的团队 |
| **Global Overrides** | 跨所有项目共享 schema | 高级用户 |

---

## Project Configuration

`openspec/config.yaml` 文件是为你的团队定制 OpenSpec 最简单的方式。它可以让你：

- **设置默认 schema** —— 不必在每条命令都加 `--schema`
- **注入项目上下文** —— 让 AI 看到你的技术栈、规范等
- **添加 per-artifact 规则** —— 针对特定 artifact 的自定义规则
- **添加 per-operation 指导** —— 针对 apply 和 archive 工作的建议性偏好
- **记住集成选择** —— 例如 [GitHub Copilot cloud coding agent](supported-tools.md#github-copilot-cloud-coding-agent) 的 opt-in

### Quick Setup

```bash
openspec init
```

这会引导你以交互方式创建配置。你也可以手动创建：

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones

operations:
  apply:
    guidance:
      - Run focused tests before the full suite
  archive:
    guidance:
      - Keep the completion summary concise

# Set by `openspec init` when you choose (or decline) the GitHub Copilot
# cloud coding agent; controls whether `init`/`update` generate its files.
githubCopilot:
  cloudAgent: false
```

### How It Works

**Default schema:**

```bash
# Without config
openspec new change my-feature --schema spec-driven

# With config - schema is automatic
openspec new change my-feature
```

**Context and rules injection:**

当生成任意 artifact 时，你的 context 和 rules 会被注入到 AI 的 prompt 中：

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
...
</context>

<rules>
- Include rollback plan
- Identify affected teams
</rules>

<template>
[Schema's built-in template]
</template>
```

- **Context** 出现在所有 artifact 中
- **Rules** 仅出现在对应匹配的 artifact 中

**Operation guidance:**

`operations.apply.guidance` 和 `operations.archive.guidance` 是可选数组，包含关于 agent 应如何执行这些操作的建议性指令。它们与 `rules` 是分开的：operation guidance 不约束 artifact 的内容，artifact 的 rules 也绝不会被重新标记为 operation guidance。

Apply 和 archive 在执行时获取这些输入：

```bash
openspec instructions apply --change my-feature --json
openspec instructions archive --change my-feature --json
```

这两条命令都会把当前项目的 `context` 和匹配的 `operationGuidance` 作为独立的可选字段返回。每次调用都会从解析出的根目录读取一份全新快照。当选择了 `--store <id>` 时，change、context 和 guidance 都来自该 store，而不是当前仓库。archive instruction 命令是只读的：它不会检查或合并 delta spec，不会写入主 spec，不会移动 change，也不会运行静态 archive 工作流。

项目 context 是 prompt 级别必需的输入。生成的工作流会读取它并应用相关的项目事实、规范和约束。Operation guidance 是可选的附加建议：工作流会考虑每一条，并遵循其中适用且与内置工作流兼容的条目。

这两个字段都与 CLI 控制的状态、已解析路径、内置步骤、用户的明确选择以及 artifact 的 rules 相互分离。工作流会在保留控制值的前提下报告 context 冲突。它不会遵循不适用或相互冲突的 guidance，并会说明原因。这两个字段都不是强制检查项，工作流不会把它们的文本复制到实现文件、spec、change artifact 或摘要中，除非用户另行要求这些内容的写入。

**Archive and spec-sync input safety:**

Archive、bulk archive 和 standalone sync 使用 `artifactPaths.specs.existingOutputPaths`（来自 `openspec status --json`）作为唯一的 delta-spec 来源。一个没有 `specs` artifact 的 schema，或一个具体输出列表为空的 change，就无可同步内容；其他 artifact 不会被用来推断 delta spec。

在语义合并写入主 spec 之前，工作流会消费当前 `openspec instructions specs --change <name> --json` 的输出。返回的 `specs` rules 只约束该合并所生成的主 specs。单次 archive 会将该快照传入内联 sync，standalone sync 直接获取它，bulk archive 则会在首次写入 spec 之前获取所有必需的快照。非零或无效的 JSON archive/specs instruction 响应属于查找失败，而非空输入：工作流会在受影响的 spec 写入或 change 移动之前停止（对于 bulk archive，则在任何批量写入或移动之前停止）。

此配置不会改变 archive 执行阶段、用户提示、文件系统操作、语义合并的所有权、直接的 `openspec archive` 命令，也不会改变 artifact `rules` 的结构与输出。

### Schema Resolution Order

当 OpenSpec 需要一个 schema 时，会按以下顺序查找：

1. CLI flag: `--schema <name>`
2. Change metadata (`.openspec.yaml` in the change folder)
3. Project config (`openspec/config.yaml`)
4. Default (`spec-driven`)

---

## Custom Schemas

当项目配置无法满足需求时，可以创建带有完全自定义工作流的 schema。Custom schema 存放在你项目的 `openspec/schemas/` 目录下，并随代码一起纳入版本控制。

```text
your-project/
├── openspec/
│   ├── config.yaml        # Project config
│   ├── schemas/           # Custom schemas live here
│   │   └── my-workflow/
│   │       ├── schema.yaml
│   │       └── templates/
│   └── changes/           # Your changes
└── src/
```

### Fork an Existing Schema

最快的自定义方式是 fork 一个内置 schema：

```bash
openspec schema fork spec-driven my-workflow
```

这会把整个 `spec-driven` schema 复制到 `openspec/schemas/my-workflow/`，你可以自由编辑。

**What you get:**

```text
openspec/schemas/my-workflow/
├── schema.yaml           # Workflow definition
└── templates/
    ├── proposal.md       # Template for proposal artifact
    ├── spec.md           # Template for specs
    ├── design.md         # Template for design
    └── tasks.md          # Template for tasks
```

现在可以编辑 `schema.yaml` 来改变工作流，或编辑模板来改变 AI 生成的内容。

### Create a Schema from Scratch

For a completely fresh workflow:

```bash
# Interactive
openspec schema init research-first

# Non-interactive
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

### Schema Structure

A schema 定义了工作流中的 artifact 以及它们之间的依赖关系：

```yaml
# openspec/schemas/my-workflow/schema.yaml
name: my-workflow
version: 1
description: My team's custom workflow

artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal document
    template: proposal.md
    instruction: |
      Create a proposal that explains WHY this change is needed.
      Focus on the problem, not the solution.
    requires: []

  - id: design
    generates: design.md
    description: Technical design
    template: design.md
    instruction: |
      Create a design document explaining HOW to implement.
    requires:
      - proposal    # Can't create design until proposal exists

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires:
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

**Key fields:**

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier, used in commands and rules |
| `generates` | Output filename (supports globs like `specs/**/*.md`) |
| `template` | Template file in `templates/` directory |
| `instruction` | AI instructions for creating this artifact |
| `requires` | Dependencies - which artifacts must exist first |

List artifacts in the order you want them written. `requires` decides what is possible; the order of the `artifacts:` list decides what comes first when several artifacts are ready at once.

### Templates

Templates 是引导 AI 的 markdown 文件。它们在创建对应 artifact 时被注入到 prompt 中。

```markdown
<!-- templates/proposal.md -->
## Why

<!-- Explain the motivation for this change. What problem does this solve? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities or modifications. -->

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

Templates can include:
- Section headers the AI should fill in
- HTML comments with guidance for the AI
- Example formats showing expected structure

### Validate Your Schema

在使用自定义 schema 之前，先验证它：

```bash
openspec schema validate my-workflow
```

This checks:
- `schema.yaml` syntax is correct
- All referenced templates exist
- No circular dependencies
- Artifact IDs are valid

### Use Your Custom Schema

Once created, use your schema with:

```bash
# Specify on command
openspec new change feature --schema my-workflow

# Or set as default in config.yaml
schema: my-workflow
```

### Debug Schema Resolution

Not sure which schema is being used? Check with:

```bash
# See where a specific schema resolves from
openspec schema which my-workflow

# List all available schemas
openspec schema which --all
```

Output shows whether it's from your project, user directory, or the package:

```text
Schema: my-workflow
Source: project
Path: /path/to/project/openspec/schemas/my-workflow
```

---

> **Note:** OpenSpec also supports user-level schemas at `~/.local/share/openspec/schemas/` for sharing across projects, but project-level schemas in `openspec/schemas/` are recommended since they're version-controlled with your code.

---

## Examples

### Rapid Iteration Workflow

A minimal workflow for quick iterations:

```yaml
# openspec/schemas/rapid/schema.yaml
name: rapid
version: 1
description: Fast iteration with minimal overhead

artifacts:
  - id: proposal
    generates: proposal.md
    description: Quick proposal
    template: proposal.md
    instruction: |
      Create a brief proposal for this change.
      Focus on what and why, skip detailed specs.
    requires: []

  - id: tasks
    generates: tasks.md
    description: Implementation checklist
    template: tasks.md
    requires: [proposal]

apply:
  requires: [tasks]
  tracks: tasks.md
```

### Adding a Review Artifact

Fork the default and add a review step:

```bash
openspec schema fork spec-driven with-review
```

Then edit `schema.yaml` to add:

```yaml
  - id: review
    generates: review.md
    description: Pre-implementation review checklist
    template: review.md
    instruction: |
      Create a review checklist based on the design.
      Include security, performance, and testing considerations.
    requires:
      - design

  - id: tasks
    # ... existing tasks config ...
    requires:
      - specs
      - design
      - review    # Now tasks require review too
```

---

## Community Schemas

OpenSpec also supports community-maintained schemas distributed via standalone repositories. These provide opinionated workflows that integrate OpenSpec with other tools or systems, similar to how [github/spec-kit's community extension catalog](https://github.com/github/spec-kit/tree/main/extensions) works for spec-kit.

Community schemas are not vendored into OpenSpec core — they live in their own repositories with their own release cadence. To use one, copy the schema bundle into your project's `openspec/schemas/<schema-name>/` directory (each repo's README has install instructions).

| Schema | Maintainer | Repository | Description |
|--------|-----------|-----------|-------------|
| `intent-driven` | @harikrishnan83 | [intent-driven-dev/openspec-schemas](https://github.com/intent-driven-dev/openspec-schemas/tree/main/openspec/schemas/intent-driven) | Captures change intent, observable behaviour, technical design, and durable architectural decisions before implementation. Adds a change-local ADR review manifest and writes qualifying long-lived decisions as immutable, supersedable ADRs. |
| `superpowers-bridge` | @JiangWay | [JiangWay/openspec-schemas](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge) | Integrates OpenSpec's artifact governance with [obra/superpowers](https://github.com/obra/superpowers) execution skills (brainstorming, writing-plans, TDD via subagents, code review, finishing). Adds an evidence-first `retrospective` artifact filling a gap Superpowers does not natively cover. |
| `nanopm` | @nmrtn | [nmrtn/nanopm](https://github.com/nmrtn/nanopm/tree/main/openspec-schema) | PM-first workflow. Runs [nanopm](https://github.com/nmrtn/nanopm)'s planning pipeline (audit → strategy → roadmap → PRD) upstream of implementation. Bridges product planning to OpenSpec's spec-driven engineering workflow. Artifacts read from `.nanopm/` if present — proposal sources the audit, design sources the strategy, and tasks source the PRD breakdown. |
| `e2e-runbooks` | @Lukk17 | [Lukk17/openspec-schemas](https://github.com/Lukk17/openspec-schemas/tree/master/openspec/schemas/e2e-runbooks) | Capability-level end-to-end test runbooks. Each capability gets an immutable spec, an immutable tasks-template, and one timestamped run record per execution. Assertions are observable behaviour only (HTTP status, response body, persisted state — never log substrings); each run records start/end UTC, duration, and best-estimate LLM token consumption. |
| `anvil` | @jikkujoyce | [jikkujoyce/openspec-schemas](https://github.com/jikkujoyce/openspec-schemas/tree/main/schemas/anvil) | Spec-driven workflow with TDD discipline and an adversarial review step. Flow: `proposal` → `specs` → `design` → `review` → `test-plan` → `tasks` → `apply` → `verify`. `review` is written by a fresh-context, read-only reviewer (a second model when one is available) and emits a `VERDICT:` line telling the agent to gate `test-plan`, `tasks`, and `apply`; OpenSpec only checks that artifacts exist, so enforce the gate with your own CI or hook. `test-plan` maps every spec scenario to a named test and doubles as a red/green ledger that `verify` audits. |

> Want to contribute a community schema? Open an issue with a link to your repository, or submit a PR adding a row to this table.

---

## See Also

- [CLI Reference: Schema Commands](cli.md#schema-commands) - Full command documentation
