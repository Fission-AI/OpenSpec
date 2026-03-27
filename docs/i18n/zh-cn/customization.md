> **声明**：本文档由 AI 翻译，使用 `mimo-v2-pro` 进行翻译。

# 自定义

OpenSpec 提供三个层级的自定义：

| 层级 | 功能 | 适用场景 |
|------|------|----------|
| **项目配置** | 设置默认值、注入上下文/规则 | 大多数团队 |
| **自定义 Schema** | 定义自己的工作流产物 | 拥有独特流程的团队 |
| **全局覆盖** | 跨所有项目共享 Schema | 高级用户 |

---

## 项目配置

`openspec/config.yaml` 文件是为团队自定义 OpenSpec 的最简单方式。它可以让你：

- **设置默认 Schema** - 每个命令无需再加 `--schema`
- **注入项目上下文** - AI 可以看到你的技术栈、约定等
- **添加针对特定产物的规则** - 为特定产物定义自定义规则

### 快速设置

```bash
openspec init
```

这会引导你交互式地创建配置文件。或者手动创建：

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
```

### 工作原理

**默认 Schema：**

```bash
# 不使用配置
openspec new change my-feature --schema spec-driven

# 使用配置 - Schema 自动应用
openspec new change my-feature
```

**上下文和规则注入：**

当生成任何产物时，你的上下文和规则会被注入到 AI 提示词中：

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

- **上下文** 会出现在所有产物中
- **规则** 仅出现在匹配的产物中

### Schema 解析顺序

当 OpenSpec 需要 Schema 时，按以下顺序查找：

1. CLI 参数：`--schema <name>`
2. Change 元数据（change 文件夹中的 `.openspec.yaml`）
3. 项目配置（`openspec/config.yaml`）
4. 默认值（`spec-driven`）

---

## 自定义 Schema

当项目配置不足以满足需求时，你可以创建自己的 Schema，实现完全自定义的工作流。自定义 Schema 位于项目的 `openspec/schemas/` 目录中，并随代码一起进行版本控制。

```text
your-project/
├── openspec/
│   ├── config.yaml        # 项目配置
│   ├── schemas/           # 自定义 Schema 存放位置
│   │   └── my-workflow/
│   │       ├── schema.yaml
│   │       └── templates/
│   └── changes/           # 你的 Change
└── src/
```

### 派生现有 Schema

最快的自定义方式是派生一个内置 Schema：

```bash
openspec schema fork spec-driven my-workflow
```

这会将整个 `spec-driven` Schema 复制到 `openspec/schemas/my-workflow/`，你可以自由编辑。

**你将获得：**

```text
openspec/schemas/my-workflow/
├── schema.yaml           # 工作流定义
└── templates/
    ├── proposal.md       # Proposal 产物模板
    ├── spec.md           # Specs 模板
    ├── design.md         # Design 模板
    └── tasks.md          # Tasks 模板
```

现在你可以编辑 `schema.yaml` 来更改工作流，或编辑模板来改变 AI 生成的内容。

### 从零创建 Schema

对于完全全新的工作流：

```bash
# 交互式
openspec schema init research-first

# 非交互式
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

### Schema 结构

Schema 定义了工作流中的产物及其依赖关系：

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

**关键字段：**

| 字段 | 用途 |
|------|------|
| `id` | 唯一标识符，用于命令和规则 |
| `generates` | 输出文件名（支持 glob 模式，如 `specs/**/*.md`） |
| `template` | `templates/` 目录中的模板文件 |
| `instruction` | 创建此产物时的 AI 指令 |
| `requires` | 依赖关系 - 必须先存在的产物 |

### 模板

模板是引导 AI 的 Markdown 文件。在创建产物时，模板会被注入到提示词中。

```markdown
<!-- templates/proposal.md -->
## Why

<!-- Explain the motivation for this change. What problem does this solve? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities or modifications. -->

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

模板可以包含：
- AI 应填写的章节标题
- 带有 AI 指导的 HTML 注释
- 展示预期结构的示例格式

### 验证你的 Schema

在使用自定义 Schema 之前，先验证它：

```bash
openspec schema validate my-workflow
```

这会检查：
- `schema.yaml` 语法是否正确
- 所有引用的模板是否存在
- 是否存在循环依赖
- Artifact ID 是否有效

### 使用你的自定义 Schema

创建完成后，通过以下方式使用你的 Schema：

```bash
# 在命令中指定
openspec new change feature --schema my-workflow

# 或在 config.yaml 中设为默认
schema: my-workflow
```

### 调试 Schema 解析

不确定正在使用哪个 Schema？使用以下命令检查：

```bash
# 查看特定 Schema 的解析来源
openspec schema which my-workflow

# 列出所有可用 Schema
openspec schema which --all
```

输出会显示它来自项目、用户目录还是包：

```text
Schema: my-workflow
Source: project
Path: /path/to/project/openspec/schemas/my-workflow
```

---

> **注意：** OpenSpec 还支持用户级别的 Schema，位于 `~/.local/share/openspec/schemas/`，可跨项目共享，但建议使用项目级别的 `openspec/schemas/` Schema，因为它们会随代码一起进行版本控制。

---

## 示例

### 快速迭代工作流

适用于快速迭代的最小化工作流：

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

### 添加 Review 产物

派生默认 Schema 并添加审查步骤：

```bash
openspec schema fork spec-driven with-review
```

然后编辑 `schema.yaml` 添加：

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
      - review    # 现在 tasks 也需要 review
```

---

## 另请参阅

- [CLI 参考：Schema 命令](cli.md#schema-commands) - 完整的命令文档
