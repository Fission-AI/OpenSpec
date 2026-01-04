# POC-OpenSpec-Core 分析

> [English Version](artifact_poc.md)

---

## 设计决策与术语

### 理念：不是工作流系统

该系统**不是**工作流引擎。它是一个**具有依赖关系感知的工件跟踪器**。

| 它不是什么 | 它是什么 |
|---------------|------------|
| 线性的逐步进展 | 探索性的、迭代的规划 |
| 官僚式的检查点 | 解锁可能性的启用器 |
| "您必须先完成步骤 1" | "这是您现在可以创建的内容" |
| 填表 | 流畅的文档创建 |

**关键见解：** 依赖关系是*启用器*，而不是*门槛*。如果没有提案可供设计，您就无法有意义地编写设计文档 - 这不是官僚主义，这是逻辑。

### 术语

| 术语 | 定义 | 示例 |
|------|------------|---------|
| **Change** | 正在规划的工作单元（功能、重构、迁移） | `openspec/changes/add-auth/` |
| **Schema** | 工件图定义（存在哪些工件，它们的依赖关系） | `spec-driven.yaml` |
| **Artifact** | 图中的节点（要创建的文档） | `proposal`、`design`、`specs` |
| **Template** | 创建工件的指令/指导 | `templates/proposal.md` |

### 层次结构

```
Schema (定义) ──→ Artifacts (指导) ──→ Templates
```

- **Schema** = 工件图（存在什么，依赖关系）
- **Artifact** = 要生成的文档
- **Template** = 创建该工件的指令

### Schema 变体

Schema 可以在多个维度上变化：

| 维度 | 示例 |
|-----------|----------|
| 理念 | `spec-driven`、`tdd`、`prototype-first` |
| 版本 | `v1`、`v2`、`v3` |
| 语言 | `en`、`zh`、`es` |
| 自定义 | `team-alpha`、`experimental` |

### Schema 解析（XDG 标准）

Schema 遵循 XDG 基本目录规范，具有 2 级解析：

```
1. ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml   # 全局用户覆盖
2. <package>/schemas/<name>/schema.yaml                    # 内置默认值
```

**特定平台路径：**
- Unix/macOS：`~/.local/share/openspec/schemas/`
- Windows：`%LOCALAPPDATA%/openspec/schemas/`
- 所有平台：`$XDG_DATA_HOME/openspec/schemas/`（设置时）

**为什么使用 XDG？**
- Schema 是工作流定义（数据），而不是用户偏好（配置）
- 内置的烘焙到包中，从不自动复制
- 用户通过在全局数据目录中创建文件来自定义
- 与现代 CLI 工具标准一致

### 模板继承（最多 2 级）

模板与 schema 共同位于 `templates/` 子目录中：

```
1. ${XDG_DATA_HOME}/openspec/schemas/<schema>/templates/<artifact>.md  # 用户覆盖
2. <package>/schemas/<schema>/templates/<artifact>.md                   # 内置
```

**规则：**
- 用户覆盖优先于包内置
- CLI 命令显示解析的路径（无需猜测）
- schema 之间没有继承（如果需要分歧，请复制）
- 模板始终与其 schema 共同位于

**为什么这很重要：**
- 避免"这来自哪里？"的调试
- 没有隐式魔法，直到它不起作用
- Schema + 模板形成一个有凝聚力的单元

---

## 执行摘要

这是一个**具有依赖关系感知的工件跟踪器**，通过结构化的工件管道指导迭代开发。核心创新是使用**文件系统作为数据库** - 工件完成由文件存在检测，使系统无状态且版本控制友好。

系统回答：
- "此变更存在哪些工件？"
- "我接下来可以创建什么？"（不是"我必须创建什么"）
- "什么阻止了 X？"（信息性的，而不是规定性的）

---

## 核心组件

### 1. ArtifactGraph（切片 1 - 完成）

具有 XDG 兼容 schema 解析的依赖图引擎。

| 职责 | 方法 |
|----------------|----------|
| 将工件建模为 DAG | 具有 `requires: string[]` 的 Artifact |
| 跟踪完成状态 | 已完成工件的 `Set<string>` |
| 计算构建顺序 | Kahn 算法（拓扑排序） |
| 查找就绪工件 | 检查所有依赖项是否在 `completed` 集合中 |
| 解析 schema | XDG 全局 → 包内置 |

**关键数据结构（Zod 验证）：**

```typescript
// Zod schema 定义类型 + 验证
const ArtifactSchema = z.object({
  id: z.string().min(1),
  generates: z.string().min(1),      // 例如 "proposal.md" 或 "specs/*.md"
  description: z.string(),
  template: z.string(),              // 模板文件路径
  requires: z.array(z.string()).default([]),
});

const SchemaYamlSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1),
});

// 派生类型
type Artifact = z.infer<typeof ArtifactSchema>;
type SchemaYaml = z.infer<typeof SchemaYamlSchema>;
```

**关键方法：**
- `resolveSchema(name)` - 使用 XDG 回退加载 schema
- `ArtifactGraph.fromSchema(schema)` - 从 schema 构建图
- `detectState(graph, changeDir)` - 扫描文件系统以完成
- `getNextArtifacts(graph, completed)` - 查找准备创建的工件
- `getBuildOrder(graph)` - 所有工件的拓扑排序
- `getBlocked(graph, completed)` - 具有未满足依赖项的工件

---

### 2. Change 实用程序（切片 2）

用于程序化变更创建的简单实用函数。没有类，没有抽象层。

| 职责 | 方法 |
|----------------|----------|
| 创建变更 | 在 `openspec/changes/<name>/` 下创建目录并附带 README |
| 名称验证 | 强制执行 kebab-case 命名 |

**关键路径：**

```
openspec/changes/<name>/   → 具有工件的变更实例（项目级别）
```

**关键函数**（`src/utils/change-utils.ts`）：
- `createChange(projectRoot, name, description?)` - 创建新的变更目录 + README
- `validateChangeName(name)` - 验证 kebab-case 命名，返回 `{ valid, error? }`

**注意：** 现有的 CLI 命令（`ListCommand`、`ChangeCommand`）已经处理列表、路径解析和存在性检查。无需提取该逻辑 - 它按原样工作正常。

---

### 3. InstructionLoader（切片 3）

模板解析和指令丰富。

| 职责 | 方法 |
|----------------|----------|
| 解析模板 | XDG 2 级回退（特定于 schema → 共享 → 内置） |
| 构建动态上下文 | 收集依赖状态、变更信息 |
| 丰富模板 | 将上下文注入基础模板 |
| 生成状态报告 | 带有进度的格式化 markdown |

**关键类 - ChangeState：**

```
ChangeState {
  changeName: string
  changeDir: string
  graph: ArtifactGraph
  completed: Set<string>

  // 方法
  getNextSteps(): string[]
  getStatus(artifactId): ArtifactStatus
  isComplete(): boolean
}
```

**关键函数：**
- `getTemplatePath(artifactId, schemaName?)` - 使用 2 级回退解析
- `getEnrichedInstructions(artifactId, projectRoot, changeName?)` - 主入口点
- `getChangeStatus(projectRoot, changeName?)` - 格式化状态报告

---

### 4. CLI（切片 4）

用户界面层。**所有命令都是确定性的** - 需要显式的 `--change` 参数。

| 命令 | 功能 | 状态 |
|---------|----------|--------|
| `status --change <id>` | 显示变更进度（工件图） | **新** |
| `next --change <id>` | 显示准备创建的工件 | **新** |
| `instructions <artifact> --change <id>` | 获取工件的丰富指令 | **新** |
| `list` | 列出所有变更 | 存在（`openspec change list`） |
| `new <name>` | 创建变更 | **新**（使用 `createChange()`） |
| `init` | 初始化结构 | 存在（`openspec init`） |
| `templates --change <id>` | 显示解析的模板路径 | **新** |

**注意：** 对变更进行操作的命令需要 `--change`。缺少参数 → 错误，并显示可用变更列表。代理从对话中推断变更并明确传递它。

**现有的 CLI 命令**（不属于此切片）：
- `openspec change list` / `openspec change show <id>` / `openspec change validate <id>`
- `openspec list --changes` / `openspec list --specs`
- `openspec view`（仪表板）
- `openspec init` / `openspec archive <change>`

---

### 5. Claude 命令

Claude Code 的集成层。**仅操作命令** - 通过自然语言创建工件。

| 命令 | 目的 |
|---------|---------|
| `/status` | 显示变更进度 |
| `/next` | 显示准备创建的内容 |
| `/run [artifact]` | 执行特定步骤（高级用户） |
| `/list` | 列出所有变更 |
| `/new <name>` | 创建新变更 |
| `/init` | 初始化结构 |

**工件创建：** 用户用自然语言说"创建提案"或"编写测试"。代理：
1. 从对话中推断变更（如果不确定则确认）
2. 从请求中推断工件
3. 使用显式的 `--change` 参数调用 CLI
4. 按照指令创建工件

这适用于任何 schema 中的任何工件 - 当 schema 更改时不需要新的斜杠命令。

**注意：** 遗留命令（`/openspec-proposal`、`/openspec-apply`、`/openspec-archive`）存在于主项目中以实现向后兼容性，但与此架构分离。

---

## 组件依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                     表示层                                   │
│  ┌──────────────┐                    ┌────────────────────┐ │
│  │     CLI      │ ←─shell exec───────│ Claude Commands    │ │
│  └──────┬───────┘                    └────────────────────┘ │
└─────────┼───────────────────────────────────────────────────┘
          │ imports
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    编排层                                    │
│  ┌────────────────────┐        ┌──────────────────────────┐ │
│  │ InstructionLoader  │        │  change-utils (切片 2)   │ │
│  │    (切片 3)        │        │  createChange()          │ │
│  └─────────┬──────────┘        │  validateChangeName()    │ │
│            │                   └──────────────────────────┘ │
└────────────┼────────────────────────────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      核心层                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               ArtifactGraph (切片 1)                 │   │
│  │                                                      │   │
│  │  Schema 解析 (XDG) ──→ 图 ──→ 状态检测               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
             ▲
             │ reads from
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   持久层                                     │
│  ┌──────────────────┐   ┌────────────────────────────────┐  │
│  │  XDG Schemas     │   │  项目工件                      │  │
│  │  ~/.local/share/ │   │  openspec/changes/<name>/      │  │
│  │  openspec/       │   │  - proposal.md, design.md      │  │
│  │  schemas/        │   │  - specs/*.md, tasks.md        │  │
│  └──────────────────┘   └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键设计模式

### 1. 文件系统作为数据库

没有 SQLite，没有 JSON 状态文件。`proposal.md` 的存在意味着提案已完成。

```
// 状态检测只是文件存在性检查
if (exists(artifactPath)) {
  completed.add(artifactId)
}
```

### 2. 确定性 CLI，推断代理

**CLI 层：** 始终确定性 - 需要显式的 `--change` 参数。

```
openspec status --change add-auth     # 显式，有效
openspec status                        # 错误："未指定变更"
```

**代理层：** 从对话中推断，如果不确定则确认，传递显式的 `--change`。

这种分离意味着：
- CLI 是纯粹的、可测试的，没有要损坏的状态
- 代理处理所有"智能"
- 没有跟踪"活跃变更"的 config.yaml

### 3. XDG 兼容的 Schema 解析

```
${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml   # 用户覆盖
    ↓ (未找到)
<package>/schemas/<name>/schema.yaml                    # 内置
    ↓ (未找到)
错误（未找到 schema）
```

### 4. 两级模板回退

```
${XDG_DATA_HOME}/openspec/schemas/<schema>/templates/<artifact>.md  # 用户覆盖
    ↓ (未找到)
<package>/schemas/<schema>/templates/<artifact>.md                   # 内置
    ↓ (未找到)
错误（没有静默回退以避免混淆）
```

### 5. Glob 模式支持

`specs/*.md` 允许多个文件满足单个工件：

```
if (artifact.generates.includes("*")) {
  const parentDir = changeDir / patternParts[0]
  if (exists(parentDir) && hasFiles(parentDir)) {
    completed.add(artifactId)
  }
}
```

### 6. 无状态状态检测

每个命令都重新扫描文件系统。没有要损坏的缓存状态。

---

## 工件管道（默认 Schema）

默认的 `spec-driven` schema：

```
┌──────────┐
│ proposal │  (无依赖)
└────┬─────┘
     │
     ▼
┌──────────┐
│  specs   │  (requires: proposal)
└────┬─────┘
     │
     ├──────────────┐
     ▼              ▼
┌──────────┐   ┌──────────┐
│  design  │   │          │
│          │◄──┤ proposal │
└────┬─────┘   └──────────┘
     │         (requires: proposal, specs)
     ▼
┌──────────┐
│  tasks   │  (requires: design)
└──────────┘
```

其他 schema（TDD、prototype-first）将具有不同的图。

---

## 实施顺序

结构化为**垂直切片** - 每个切片都是独立可测试的。

---

### 切片 1："什么准备好了？"（核心查询）✅ 完成

**交付：** 类型 + 图 + 状态检测 + Schema 解析

**实施：** `src/core/artifact-graph/`
- `types.ts` - Zod schema 和派生的 TypeScript 类型
- `schema.ts` - 使用 Zod 验证的 YAML 解析
- `graph.ts` - 具有拓扑排序的 ArtifactGraph 类
- `state.ts` - 基于文件系统的状态检测
- `resolver.ts` - XDG 兼容的 schema 解析
- `builtin-schemas.ts` - 包捆绑的默认 schema

**做出的关键决策：**
- Zod 用于 schema 验证（与项目一致）
- XDG 用于全局 schema 覆盖
- `Set<string>` 用于完成状态（不可变、函数式）
- `inProgress` 和 `failed` 状态延迟（需要外部跟踪）

---

### 切片 2："变更创建实用程序"

**交付：** 用于程序化变更创建的实用函数

**范围：**
- `createChange(projectRoot, name, description?)` → 创建目录 + README
- `validateChangeName(name)` → kebab-case 模式强制执行

**不在范围内（已存在于 CLI 命令中）：**
- `listChanges()` → 存在于 `ListCommand` 和 `ChangeCommand.getActiveChanges()` 中
- `getChangePath()` → 简单的内联 `path.join()`
- `changeExists()` → 简单的内联 `fs.access()`
- `isInitialized()` → 简单的内联目录检查

**为什么简化：** 将现有的 CLI 逻辑提取到类中需要类似地重构 `SpecCommand` 以保持一致性。现有代码工作正常（每个约 15 行）。唯一真正的新功能是 `createChange()` + 名称验证。

---

### 切片 3："获取指令"（丰富）

**交付：** 模板解析 + 上下文注入

**可测试行为：**
- 模板回退：特定于 schema → 共享 → 内置 → 错误
- 上下文注入：已完成的依赖项显示 ✓，缺少的显示 ✗
- 根据变更目录正确显示输出路径

---

### 切片 4："CLI + 集成"

**交付：** 新的工件图命令（基于现有 CLI 构建）

**新命令：**
- `status --change <id>` - 显示工件完成状态
- `next --change <id>` - 显示准备创建的工件
- `instructions <artifact> --change <id>` - 获取丰富的模板
- `templates --change <id>` - 显示解析的路径
- `new <name>` - 创建变更（`createChange()` 的包装器）

**已存在（不在范围内）：**
- `openspec change list/show/validate` - 变更管理
- `openspec list --changes/--specs` - 列表
- `openspec view` - 仪表板
- `openspec init` - 初始化

**可测试行为：**
- 每个新命令产生预期的输出
- 命令正确组合（status → next → instructions 流程）
- 缺少变更、无效工件等的错误处理

---

## 目录结构

```
# 全局（XDG 路径 - 用户覆盖）
~/.local/share/openspec/           # Unix/macOS ($XDG_DATA_HOME/openspec/)
%LOCALAPPDATA%/openspec/           # Windows
└── schemas/                       # Schema 覆盖
    └── custom-workflow/           # 用户定义的 schema 目录
        ├── schema.yaml            # Schema 定义
        └── templates/             # 共同位于的模板
            └── proposal.md

# 包（内置默认值）
<package>/
└── schemas/                       # 内置 schema 定义
    ├── spec-driven/               # 默认：proposal → specs → design → tasks
    │   ├── schema.yaml
    │   └── templates/
    │       ├── proposal.md
    │       ├── design.md
    │       ├── spec.md
    │       └── tasks.md
    └── tdd/                       # TDD：tests → implementation → docs
        ├── schema.yaml
        └── templates/
            ├── test.md
            ├── implementation.md
            ├── spec.md
            └── docs.md

# 项目（变更实例）
openspec/
└── changes/                       # 变更实例
    ├── add-auth/
    │   ├── README.md              # 创建时自动生成
    │   ├── proposal.md            # 创建的工件
    │   ├── design.md
    │   └── specs/
    │       └── *.md
    ├── refactor-db/
    │   └── ...
    └── archive/                   # 已完成的变更
        └── 2025-01-01-add-auth/

.claude/
├── settings.local.json            # 权限
└── commands/                      # 斜杠命令
    └── *.md
```

---

## Schema YAML 格式

```yaml
# 内置：<package>/schemas/spec-driven/schema.yaml
# 或用户覆盖：~/.local/share/openspec/schemas/spec-driven/schema.yaml
name: spec-driven
version: 1
description: 规范驱动的开发

artifacts:
  - id: proposal
    generates: "proposal.md"
    description: "创建项目提案文档"
    template: "proposal.md"          # 从共同位于的 templates/ 目录解析
    requires: []

  - id: specs
    generates: "specs/*.md"          # glob 模式
    description: "创建技术规范文档"
    template: "specs.md"
    requires:
      - proposal

  - id: design
    generates: "design.md"
    description: "创建设计文档"
    template: "design.md"
    requires:
      - proposal
      - specs

  - id: tasks
    generates: "tasks.md"
    description: "创建任务分解文档"
    template: "tasks.md"
    requires:
      - design
```

---

## 摘要

| 层 | 组件 | 职责 | 状态 |
|-------|-----------|----------------|--------|
| 核心 | ArtifactGraph | 纯依赖逻辑 + XDG schema 解析 | ✅ 切片 1 完成 |
| 实用程序 | change-utils | 仅变更创建 + 名称验证 | 切片 2（仅新功能） |
| 核心 | InstructionLoader | 模板解析 + 丰富 | 切片 3（全新） |
| 表示 | CLI | 新的工件图命令 | 切片 4（仅新命令） |
| 集成 | Claude Commands | AI 助手粘合剂 | 切片 4 |

**已存在的内容（不在此提案中）：**
- `src/utils/item-discovery.ts` 中的 `getActiveChangeIds()` - 列出变更
- `src/commands/change.ts` 中的 `ChangeCommand.list/show/validate()`
- `src/core/list.ts` 中的 `ListCommand.execute()`
- `src/core/view.ts` 中的 `ViewCommand.execute()` - 仪表板
- `src/core/init.ts` - 初始化
- `src/core/archive.ts` - 归档

**关键原则：**
- **文件系统就是数据库** - 无状态、版本控制友好
- **依赖关系是启用器** - 显示可能的内容，不强制顺序
- **确定性 CLI，推断代理** - CLI 需要显式的 `--change`，代理从上下文推断
- **XDG 兼容路径** - schema 和模板使用标准用户数据目录
- **2 级继承** - 用户覆盖 → 包内置（不更深）
- **Schema 是版本化的** - 支持按理念、版本、语言的变体
