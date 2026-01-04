# Schema 自定义

本文档描述了用户如何自定义 OpenSpec schema 和模板、当前的手动流程以及需要解决的差距。

> [English Version](schema-customization.md)

---

## 概述

OpenSpec 使用遵循 XDG 基本目录规范的 2 级 schema 解析系统：

1. **用户覆盖**：`${XDG_DATA_HOME}/openspec/schemas/<name>/`
2. **包内置**：`<npm-package>/schemas/<name>/`

当请求 schema（例如 `spec-driven`）时，解析器首先检查用户目录。如果找到，则使用整个 schema 目录。否则，它会回退到包的内置 schema。

---

## 当前的手动流程

要覆盖默认的 `spec-driven` schema，用户必须：

### 1. 确定正确的目录路径

| 平台 | 路径 |
|----------|------|
| macOS/Linux | `~/.local/share/openspec/schemas/` |
| Windows | `%LOCALAPPDATA%\openspec\schemas\` |
| 所有（如果设置） | `$XDG_DATA_HOME/openspec/schemas/` |

### 2. 创建目录结构

```bash
# macOS/Linux 示例
mkdir -p ~/.local/share/openspec/schemas/spec-driven/templates
```

### 3. 查找并复制默认 schema 文件

用户必须找到已安装的 npm 包以复制默认值：

```bash
# 查找包位置（因安装方法而异）
npm list -g openspec --parseable
# 或
which openspec && readlink -f $(which openspec)

# 从包的 schemas/ 目录复制文件
cp <package-path>/schemas/spec-driven/schema.yaml ~/.local/share/openspec/schemas/spec-driven/
cp <package-path>/schemas/spec-driven/templates/*.md ~/.local/share/openspec/schemas/spec-driven/templates/
```

### 4. 修改复制的文件

编辑 `schema.yaml` 以更改工作流结构：

```yaml
name: spec-driven
version: 1
description: 我的自定义工作流
artifacts:
  - id: proposal
    generates: proposal.md
    description: 初始提案
    template: proposal.md
    requires: []
  # 添加、删除或修改工件...
```

编辑 `templates/` 中的模板以自定义内容指导。

### 5. 验证覆盖是否处于活动状态

目前没有命令来验证正在使用哪个 schema。用户必须相信文件存在于正确的位置。

---

## 差距分析

当前流程有几个摩擦点：

| 问题 | 影响 |
|-------|--------|
| **路径发现** | 用户必须了解 XDG 约定和特定于平台的路径 |
| **包位置** | 查找 npm 包路径因安装方法而异（全局、本地、pnpm、yarn、volta 等） |
| **没有脚手架** | 用户必须手动创建目录和复制文件 |
| **没有验证** | 无法确认实际解析的是哪个 schema |
| **没有差异比较** | 升级 openspec 时，用户无法看到内置模板中的更改 |
| **需要完整复制** | 即使只更改一个模板，也必须复制整个 schema |

### 当前不支持的用户故事

1. *"我想在 `proposal` 之前添加一个 `research` 工件"* — 需要手动复制和编辑
2. *"我只想自定义提案模板"* — 必须复制整个 schema
3. *"我想看看默认 schema 是什么样子"* — 必须找到包路径
4. *"我想恢复到默认值"* — 必须删除文件并希望路径正确
5. *"我升级了 openspec，模板有变化吗？"* — 无法比较差异

---

## 提议的解决方案：Schema 配置器

一个 CLI 命令（或一组命令），为用户处理路径解析和文件操作。

### 选项 A：单个 `openspec schema` 命令

```bash
# 列出可用的 schema（内置和用户覆盖）
openspec schema list

# 显示 schema 从哪里解析
openspec schema which spec-driven
# 输出：/Users/me/.local/share/openspec/schemas/spec-driven/ (用户覆盖)
# 输出：/usr/local/lib/node_modules/openspec/schemas/spec-driven/ (内置)

# 将内置 schema 复制到用户目录以进行自定义
openspec schema copy spec-driven
# 创建 ~/.local/share/openspec/schemas/spec-driven/ 及所有文件

# 显示用户覆盖和内置之间的差异
openspec schema diff spec-driven

# 删除用户覆盖（恢复到内置）
openspec schema reset spec-driven

# 验证 schema
openspec schema validate spec-driven
```

### 选项 B：专用的 `openspec customize` 命令

```bash
# 交互式 schema 自定义
openspec customize
# 提示：哪个 schema？您想更改什么？等等。

# 复制并打开以进行编辑
openspec customize spec-driven
# 复制到用户目录，打印路径，可选择在 $EDITOR 中打开
```

### 选项 C：初始化时的 schema 选择

```bash
# 在项目初始化期间，提供 schema 自定义
openspec init
# ? 选择工作流 schema：
#   > spec-driven (默认)
#     tdd
#     minimal
#     custom (复制并编辑)
```

### 推荐方法

**选项 A** 提供了最大的灵活性并遵循 Unix 约定（用于离散操作的子命令）。按优先级顺序的关键命令：

1. `openspec schema list` — 查看可用内容
2. `openspec schema which <name>` — 调试解析
3. `openspec schema copy <name>` — 脚手架自定义
4. `openspec schema diff <name>` — 与内置比较
5. `openspec schema reset <name>` — 恢复到默认值

---

## 实施考虑

### 路径解析

解析器已存在于 `src/core/artifact-graph/resolver.ts` 中：

```typescript
export function getPackageSchemasDir(): string { ... }
export function getUserSchemasDir(): string { ... }
export function getSchemaDir(name: string): string | null { ... }
export function listSchemas(): string[] { ... }
```

新命令将利用这些现有函数。

### 文件操作

- 复制应保留文件权限
- 复制不应在没有 `--force` 的情况下覆盖现有用户文件
- 重置应提示确认

### 仅模板覆盖

未来的增强功能可以支持覆盖单个模板而无需复制整个 schema。这需要更改解析逻辑：

```
当前：schema 目录（用户）或 schema 目录（内置）
未来：来自用户或内置的 schema.yaml
      + 来自用户或内置的每个模板（独立回退）
```

这增加了复杂性，但启用了"我只想更改一个模板"的用例。

---

## 相关文档

- [Schema 工作流差距](./schema-workflow-gaps.zh-CN.md) — 端到端工作流分析和分阶段实施计划

## 相关文件

| 文件 | 目的 |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | Schema 解析逻辑 |
| `src/core/artifact-graph/instruction-loader.ts` | 模板加载 |
| `src/core/global-config.ts` | XDG 路径助手 |
| `schemas/spec-driven/` | 默认 schema 和模板 |
