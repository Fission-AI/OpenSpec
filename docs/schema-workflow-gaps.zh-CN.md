# Schema 工作流：端到端分析

本文档分析了在 OpenSpec 中使用 schema 的完整用户旅程，识别差距，并提出分阶段的解决方案。

> [English Version](schema-workflow-gaps.md)

---

## 当前状态

### 已存在的内容

| 组件 | 状态 |
|-----------|--------|
| Schema 解析（XDG） | 2 级：用户覆盖 → 包内置 |
| 内置 schema | `spec-driven`、`tdd` |
| 工件工作流命令 | 带有 `--schema` 标志的 `status`、`next`、`instructions`、`templates` |
| 变更创建 | `openspec new change <name>` — 没有 schema 绑定 |

### 缺少的内容

| 组件 | 状态 |
|-----------|--------|
| 绑定到变更的 Schema | 未存储 — 每次都必须传递 `--schema` |
| 项目本地 schema | 不支持 — 无法使用仓库进行版本控制 |
| Schema 管理 CLI | 无 — 需要手动路径发现 |
| 项目默认 schema | 无 — 硬编码为 `spec-driven` |

---

## 用户旅程分析

### 场景 1：使用非默认 Schema

**目标：** 用户想为新功能使用 TDD 工作流。

**今天的体验：**
```bash
openspec new change add-auth
# 创建目录，未存储 schema 信息

openspec status --change add-auth
# 显示 spec-driven 工件（错误 - 用户想要 TDD）

# 用户意识到错误...
openspec status --change add-auth --schema tdd
# 正确，但每次都必须记住 --schema

# 6 个月后...
openspec status --change add-auth
# 又错了 - 没人记得这是 TDD
```

**问题：**
- Schema 是运行时参数，未持久化
- 容易忘记 `--schema` 并得到错误的结果
- 没有记录预期的 schema 以供将来参考

---

### 场景 2：自定义 Schema

**目标：** 用户想在"proposal"之前添加"research"工件。

**今天的体验：**
```bash
# 步骤 1：弄清楚在哪里放置覆盖
# 必须了解 XDG 约定：
#   macOS/Linux：~/.local/share/openspec/schemas/
#   Windows：%LOCALAPPDATA%\openspec\schemas/

# 步骤 2：创建目录结构
mkdir -p ~/.local/share/openspec/schemas/my-workflow/templates

# 步骤 3：找到 npm 包以复制默认值
npm list -g openspec --parseable
# 输出因包管理器而异：
#   npm：/usr/local/lib/node_modules/openspec
#   pnpm：~/.local/share/pnpm/global/5/node_modules/openspec
#   volta：~/.volta/tools/image/packages/openspec/...
#   yarn：~/.config/yarn/global/node_modules/openspec

# 步骤 4：复制文件
cp -r <package-path>/schemas/spec-driven/* \
      ~/.local/share/openspec/schemas/my-workflow/

# 步骤 5：编辑 schema.yaml 和模板
# 无法验证覆盖是否处于活动状态
# 升级 openspec 时无法与原始版本进行差异比较
```

**问题：**
- 必须了解 XDG 路径约定
- 查找 npm 包路径因安装方法而异
- 没有工具来搭建或验证
- 升级 openspec 时没有差异比较功能

---

### 场景 3：团队共享自定义工作流

**目标：** 团队希望每个人都使用相同的自定义 schema。

**今天的选项：**
1. 每个人手动设置 XDG 覆盖 — 容易出错，存在漂移风险
2. 在 README 中记录设置 — 仍然是手动的，容易遗漏
3. 发布单独的 npm 包 — 对大多数团队来说过度
4. 将 schema 检入仓库 — **不支持**（没有项目本地解析）

**问题：**
- 没有项目本地 schema 解析
- 无法使用代码库对自定义 schema 进行版本控制
- 团队工作流没有单一真实来源

---

## 差距摘要

| 差距 | 影响 | 解决方法 |
|-----|--------|------------|
| Schema 未绑定到变更 | 错误的结果，遗忘的上下文 | 记住传递 `--schema` |
| 没有项目本地 schema | 无法通过仓库共享 | 每台机器手动设置 XDG |
| 没有 schema 管理 CLI | 手动路径搜索 | 了解 XDG + 查找 npm 包 |
| 没有项目默认 schema | 每次都必须指定 | 始终传递 `--schema` |
| 没有初始化时的 schema 选择 | 错过设置机会 | 手动配置 |

---

## 提议的架构

### 新文件结构

```
openspec/
├── config.yaml                 # 项目配置（新）
├── schemas/                    # 项目本地 schema（新）
│   └── my-workflow/
│       ├── schema.yaml
│       └── templates/
│           ├── research.md
│           ├── proposal.md
│           └── ...
└── changes/
    └── add-auth/
        ├── change.yaml         # 变更元数据（新）
        ├── proposal.md
        └── ...
```

### config.yaml（项目配置）

```yaml
# openspec/config.yaml
defaultSchema: spec-driven
```

设置项目范围的默认 schema。在以下情况下使用：
- 创建没有 `--schema` 的新变更
- 在没有 `change.yaml` 的变更上运行命令

### change.yaml（变更元数据）

```yaml
# openspec/changes/add-auth/change.yaml
schema: tdd
created: 2025-01-15T10:30:00Z
description: 添加用户身份验证系统
```

将特定 schema 绑定到变更。由 `openspec new change` 自动创建。

### Schema 解析顺序

```
1. ./openspec/schemas/<name>/                    # 项目本地
2. ~/.local/share/openspec/schemas/<name>/       # 用户全局（XDG）
3. <npm-package>/schemas/<name>/                 # 内置
```

项目本地优先，启用版本控制的自定义 schema。

### Schema 选择顺序（每个命令）

```
1. --schema CLI 标志                    # 显式覆盖
2. 变更目录中的 change.yaml            # 特定于变更的绑定
3. openspec/config.yaml defaultSchema   # 项目默认
4. "spec-driven"                        # 硬编码回退
```

---

## 理想的用户体验

### 创建变更

```bash
# 使用项目默认值（来自 config.yaml，或 spec-driven）
openspec new change add-auth
# 创建 openspec/changes/add-auth/change.yaml：
#   schema: spec-driven
#   created: 2025-01-15T10:30:00Z

# 此变更的显式 schema
openspec new change add-auth --schema tdd
# 创建带有 schema: tdd 的 change.yaml
```

### 使用变更

```bash
# 自动从 change.yaml 读取 schema — 不需要 --schema
openspec status --change add-auth
# 输出："Change: add-auth (schema: tdd)"

openspec next --change add-auth
# 知道使用 TDD 工件

# 显式覆盖仍然有效（带有信息性消息）
openspec status --change add-auth --schema spec-driven
# "注意：change.yaml 指定 'tdd'，根据 --schema 标志使用 'spec-driven'"
```

### 自定义 Schema

```bash
# 查看可用内容
openspec schema list
# 内置：
#   spec-driven    proposal → specs → design → tasks
#   tdd            spec → tests → implementation → docs
# 项目：（无）
# 用户：（无）

# 复制到项目以进行自定义
openspec schema copy spec-driven my-workflow
# 创建 ./openspec/schemas/my-workflow/
# 编辑 schema.yaml 和 templates/ 以自定义

# 复制到全局（用户级覆盖）
openspec schema copy spec-driven --global
# 创建 ~/.local/share/openspec/schemas/spec-driven/

# 查看 schema 从哪里解析
openspec schema which spec-driven
# ./openspec/schemas/spec-driven/ (项目)
# 或：~/.local/share/openspec/schemas/spec-driven/ (用户)
# 或：/usr/local/lib/node_modules/openspec/schemas/spec-driven/ (内置)

# 将覆盖与内置进行比较
openspec schema diff spec-driven
# 显示用户/项目版本与包内置之间的差异

# 删除覆盖，恢复到内置
openspec schema reset spec-driven
# 删除 ./openspec/schemas/spec-driven/（或用于用户目录的 --global）
```

### 项目设置

```bash
openspec init
# ? 选择默认工作流 schema：
#   > spec-driven (proposal → specs → design → tasks)
#     tdd (spec → tests → implementation → docs)
#     (如果检测到自定义 schema)
#
# 写入 openspec/config.yaml：
#   defaultSchema: spec-driven
```

---

## 实施阶段

### 阶段 1：变更元数据（change.yaml）

**优先级：** 高
**解决：** "忘记 --schema"，丢失上下文，错误结果

**范围：**
- 运行 `openspec new change` 时创建 `change.yaml`
- 存储 `schema`、`created` 时间戳
- 修改工作流命令以从 `change.yaml` 读取 schema
- `--schema` 标志覆盖（带有信息性消息）
- 向后兼容：缺少 `change.yaml` → 使用默认值

**change.yaml 格式：**
```yaml
schema: tdd
created: 2025-01-15T10:30:00Z
```

**迁移：**
- 没有 `change.yaml` 的现有变更继续工作
- 默认为 `spec-driven`（当前行为）
- 可选：`openspec migrate` 将 `change.yaml` 添加到现有变更

---

### 阶段 2：项目本地 Schema

**优先级：** 高
**解决：** 团队共享，版本控制，不需要 XDG 知识

**范围：**
- 将 `./openspec/schemas/` 添加到解析顺序（第一优先级）
- `openspec schema copy <name> [new-name]` 默认在项目中创建
- 用于用户级 XDG 目录的 `--global` 标志
- 团队可以将 `openspec/schemas/` 提交到仓库

**解析顺序：**
```
1. ./openspec/schemas/<name>/           # 项目本地（新）
2. ~/.local/share/openspec/schemas/<name>/  # 用户全局
3. <npm-package>/schemas/<name>/        # 内置
```

---

### 阶段 3：Schema 管理 CLI

**优先级：** 中
**解决：** 路径发现，脚手架，调试

**命令：**
```bash
openspec schema list              # 显示带有来源的可用 schema
openspec schema which <name>      # 显示解析路径
openspec schema copy <name> [to]  # 复制以进行自定义
openspec schema diff <name>       # 与内置比较
openspec schema reset <name>      # 删除覆盖
openspec schema validate <name>   # 验证 schema.yaml 结构
```

---

### 阶段 4：项目配置 + 初始化增强

**优先级：** 低
**解决：** 项目范围的默认值，简化设置

**范围：**
- 添加带有 `defaultSchema` 字段的 `openspec/config.yaml`
- `openspec init` 提示 schema 选择
- 将选择存储在 `config.yaml` 中
- 当不存在 `change.yaml` 时，命令使用作为回退

**config.yaml 格式：**
```yaml
defaultSchema: spec-driven
```

---

## 向后兼容性

| 场景 | 行为 |
|----------|----------|
| 没有 `change.yaml` 的现有变更 | 使用 `--schema` 标志或项目默认值或 `spec-driven` |
| 没有 `config.yaml` 的现有项目 | 回退到 `spec-driven` |
| 提供 `--schema` 标志 | 覆盖 `change.yaml`（带有信息消息） |
| 没有项目本地 schema 目录 | 在解析中跳过，检查用户/内置 |

所有现有功能继续工作。新功能是附加的。

---

## 相关文档

- [Schema 自定义](./schema-customization.zh-CN.md) — 手动覆盖流程和 CLI 差距的详细信息
- [工件 POC](./artifact_poc.zh-CN.md) — 核心工件图架构

## 相关代码

| 文件 | 目的 |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | Schema 解析逻辑 |
| `src/core/artifact-graph/instruction-loader.ts` | 模板加载 |
| `src/core/global-config.ts` | XDG 路径助手 |
| `src/commands/artifact-workflow.ts` | CLI 命令 |
| `src/utils/change-utils.ts` | 变更创建实用程序 |
