> **声明**：本文档由 AI 翻译，使用 `mimo-v2-pro` 进行翻译。

# 工作流

本指南涵盖了 OpenSpec 的常见工作流模式以及每种模式的使用场景。基础设置请参阅[快速开始](getting-started.md)。命令参考请参阅[命令](commands.md)。

## 理念：操作，而非阶段

传统工作流强制你经历各个阶段：规划，然后实现，然后完成。但实际工作并不适合整齐地装进框里。

OPSX 采用了不同的方法：

```text
传统（阶段锁定）：

  规划 ────────► 实现 ────────► 完成
      │                    │
      │   "无法回退"  │
      └────────────────────┘

OPSX（流动操作）：

  proposal ──► specs ──► design ──► tasks ──► implement
```

**核心原则：**

- **操作，而非阶段** — 命令是你能执行的操作，而不是你被困在其中的阶段
- **依赖关系是赋能者** — 它们展示什么是可能的，而不是接下来必须做什么

> **自定义：** OPSX 工作流由定义工件序列的模式驱动。详情请参阅[自定义](customization.md)。

## 两种模式

### 默认快速路径（`core` 配置）

新安装默认使用 `core`，提供以下命令：
- `/opsx:propose`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`

典型流程：

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

### 扩展/完整工作流（自定义选择）

如果你需要显式的脚手架和构建命令（`/opsx:new`、`/opsx:continue`、`/opsx:ff`、`/opsx:verify`、`/opsx:sync`、`/opsx:bulk-archive`、`/opsx:onboard`），使用以下命令启用：

```bash
openspec config profile
openspec update
```

## 工作流模式（扩展模式）

### 快速功能

当你清楚要构建什么，只需要执行时：

```text
/opsx:new ──► /opsx:ff ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

**示例对话：**

```text
You: /opsx:new add-logout-button

AI:  已创建 openspec/changes/add-logout-button/
     准备创建：proposal

You: /opsx:ff

AI:  正在创建所有规划工件...
     ✓ proposal.md
     ✓ specs/
     ✓ design.md
     ✓ tasks.md
     准备进行实现！

You: /opsx:apply

AI:  正在处理任务...
     ✓ 已添加退出按钮到页头
     ✓ 已实现会话清除
     ✓ 已添加确认对话框
     所有任务完成！

You: /opsx:archive

AI:  ✓ 已合并 specs
     ✓ 已归档变更
```

**适用场景：** 中小型功能、Bug 修复、简单的变更。

### 探索式

当需求不明确或需要先调查时：

```text
/opsx:explore ──► /opsx:new ──► /opsx:continue ──► ... ──► /opsx:apply
```

**示例对话：**

```text
You: /opsx:explore

AI:  你想要探索什么？

You: 我想改善页面加载性能，但不确定瓶颈在哪里。

AI:  让我帮你调查...
     [分析打包大小，识别慢查询，审查组件渲染模式]

     我发现了三个主要瓶颈：
     1. 大型未优化的图片
     2. ProductList 中的同步数据获取
     3. 上下文变更引起的重新渲染

     你想先处理哪个？

You: 我们来解决数据获取的问题。

You: /opsx:new optimize-product-list-fetching

AI:  已创建变更。准备创建：proposal

You: /opsx:continue

AI:  正在基于我们的探索创建 proposal...
     [撰写融入调查发现的 proposal]

     准备创建：specs, design
     你想先创建哪个？

You: /opsx:continue

AI:  正在创建 specs...
```

**适用场景：** 性能优化、调试、架构决策、需求不明确。

### 并行变更

同时处理多个变更：

```text
变更 A: /opsx:new ──► /opsx:ff ──► /opsx:apply (进行中)
                                         │
                                    上下文切换
                                         │
变更 B: /opsx:new ──► /opsx:ff ──────► /opsx:apply
```

**示例对话：**

```text
You: 我在做 add-dark-mode 但被拉去修一个 bug

You: /opsx:new fix-login-redirect

AI:  已创建 openspec/changes/fix-login-redirect/

You: /opsx:ff

AI:  ✓ 已创建规划工件

You: /opsx:apply

AI:  正在处理 fix-login-redirect...
     [实现修复]
     所有任务完成！

You: /opsx:archive

AI:  ✓ 已归档 fix-login-redirect

You: 继续做暗色模式

You: /opsx:apply add-dark-mode

AI:  正在恢复 add-dark-mode...
     从任务 2.3 继续：更新 Header...
```

**适用场景：** 并行工作流、紧急打断、团队协作。

当有多个已完成的变更时，使用 `/opsx:bulk-archive`：

```text
You: /opsx:bulk-archive

AI:  找到 3 个已完成的变更：
     - add-dark-mode（所有任务已完成）
     - fix-login-redirect（所有任务已完成）
     - update-footer（所有任务已完成）

     正在检查 spec 冲突...
     ⚠ add-dark-mode 和 update-footer 都涉及 specs/ui/

     正在检查代码库以解决冲突...
     两个变更都已实现。将按时间顺序应用。

     归档全部 3 个变更？

You: 是

AI:  ✓ 已归档 add-dark-mode
     ✓ 已归档 fix-login-redirect
     ✓ 已归档 update-footer
     Specs 按顺序合并：add-dark-mode → update-footer
```

批量归档会检测多个变更是否涉及相同的 specs，并通过检查实际实现来解决冲突。

### 完成变更

推荐的完成流程：

```text
/opsx:apply ──► /opsx:verify ──► /opsx:archive
                    │                 │
              验证实现           如果需要则提示
                                    同步
```

#### Verify：检查你的工作

`/opsx:verify` 从三个维度验证实现是否符合你的工件：

```text
You: /opsx:verify

AI:  正在验证 add-auth...

     完整性
     ✓ tasks.md 中所有 12 个任务已勾选
     ✓ specs 中所有需求已有对应代码
     ⚠ 场景"会话超时后未活动"未测试

     正确性
     ✓ 实现符合 spec 意图
     ✓ 场景中的边界情况已处理
     ✓ 错误状态符合 spec 定义

     一致性
     ✓ 设计决策已反映在代码结构中
     ✓ 命名规范与 design.md 一致
     ⚠ 设计提到"事件驱动"但实现使用了轮询

     总结
     ─────────────────────────────
     严重问题：0
     警告：2
     可以归档：是（有警告）

     建议：
     1. 添加会话超时场景的测试
     2. 考虑重构为设计中的事件驱动方式，或更新 design.md
```

**verify 检查的内容：**

| 维度 | 验证内容 |
|-----------|------------------|
| 完整性 | 所有任务完成、所有需求已实现、场景已覆盖 |
| 正确性 | 实现符合 spec 意图、边界情况已处理 |
| 一致性 | 设计决策反映在代码中、模式一致 |

Verify 不会阻止归档，但它会提示你可能需要先处理的问题。

#### Archive：完成变更

`/opsx:archive` 完成变更并将其移动到归档：

```text
You: /opsx:archive

AI:  正在归档 add-auth...

     工件状态：
     ✓ proposal.md 已存在
     ✓ specs/ 已存在
     ✓ design.md 已存在
     ✓ tasks.md 已存在（12/12 任务已完成）

     Delta specs：尚未同步到主分支
     → 是否立即同步？

You: 是

AI:  ✓ 已同步 specs 到 openspec/specs/auth/spec.md
     ✓ 已移动到 openspec/changes/archive/2025-01-24-add-auth/

     变更归档成功。
```

Archive 会在 specs 未同步时提示。它不会阻止未完成任务的归档，但会发出警告。

## 何时使用什么

### `/opsx:ff` 与 `/opsx:continue`

| 场景 | 使用 |
|-----------|-----|
| 需求明确，准备好构建 | `/opsx:ff` |
| 探索中，想审查每一步 | `/opsx:continue` |
| 想在创建 specs 前迭代 proposal | `/opsx:continue` |
| 时间紧迫，需要快速推进 | `/opsx:ff` |
| 复杂变更，想要控制 | `/opsx:continue` |

**经验法则：** 如果你能预先描述完整范围，使用 `/opsx:ff`。如果你是一边做一边想，使用 `/opsx:continue`。

### 何时更新 vs 何时重新开始

一个常见问题：什么时候可以更新现有变更，什么时候应该创建新变更？

**更新现有变更的情况：**

- 相同意图，细化执行
- 范围缩小（先 MVP，其余稍后）
- 学习驱动的修正（代码库不是你预期的那样）
- 基于实现发现的设计调整

**创建新变更的情况：**

- 意图根本性改变
- 范围扩展为完全不同的工作
- 原始变更可以单独标记为"完成"
- 补丁会造成更多混淆而非澄清

```text
                     ┌─────────────────────────────────────┐
                     │     这是同一项工作吗？              │
                     └──────────────┬──────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          Same intent?      >50% overlap?      Can original
          Same problem?     Same scope?        be "done" without
                 │                  │          these changes?
                 │                  │                  │
       ┌────────┴────────┐  ┌──────┴──────┐   ┌───────┴───────┐
       │                 │  │             │   │               │
      YES               NO YES           NO  NO              YES
       │                 │  │             │   │               │
       ▼                 ▼  ▼             ▼   ▼               ▼
    UPDATE            NEW  UPDATE       NEW  UPDATE          NEW
```

**示例："添加暗色模式"**

- "还需要支持自定义主题" → 新变更（范围扩展）
- "系统偏好检测比预期困难" → 更新（相同意图）
- "先发布开关功能，稍后添加偏好设置" → 更新后归档，然后创建新变更

## 最佳实践

### 保持变更聚焦

每个变更包含一个逻辑工作单元。如果你在做"添加功能 X 并重构 Y"，考虑拆分为两个独立变更。

**为什么重要：**
- 更容易审查和理解
- 更清晰的归档历史
- 可以独立发布
- 需要时更容易回滚

### 使用 `/opsx:explore` 处理不明确的需求

在提交变更之前，先探索问题空间：

```text
You: /opsx:explore

AI:  你想要探索什么？

You: 我们应该如何处理 API 的速率限制？

AI:  让我调查一下你当前的设置和选项...
     [研究代码库，考虑模式]

     我们可以采用三种方案：
     1. 基于中间件（简单，按端点）
     2. 基于 Redis（可扩展，共享状态）
     3. 按用户的令牌桶（公平，复杂）

     你当前的技术栈适合方案 #1 或 #2。你的规模如何？
```

探索可以在你创建工件之前澄清思路。

### 归档前验证

使用 `/opsx:verify` 检查实现是否符合工件：

```text
You: /opsx:verify

AI:  正在验证 add-dark-mode...

     ✓ tasks.md 中所有任务已勾选
     ✓ specs 中的需求已有对应代码
     ✓ 设计决策已反映在实现中

     可以归档了！
```

在关闭变更之前发现不匹配。

### 清晰命名变更

好的名称让 `openspec list` 更有用：

```text
推荐:                          避免:
add-dark-mode                  feature-1
fix-login-redirect             update
optimize-product-query         changes
implement-2fa                  wip
```

## 命令快速参考

完整的命令详情和选项，请参阅[命令](commands.md)。

| 命令 | 目的 | 使用场景 |
|---------|---------|-------------|
| `/opsx:propose` | 创建变更 + 规划工件 | 快速默认路径（`core` 配置） |
| `/opsx:explore` | 探索想法 | 需求不明确、调查 |
| `/opsx:new` | 启动变更脚手架 | 扩展模式、显式工件控制 |
| `/opsx:continue` | 创建下一个工件 | 扩展模式、逐步创建工件 |
| `/opsx:ff` | 创建所有规划工件 | 扩展模式、范围明确 |
| `/opsx:apply` | 实现任务 | 准备编写代码 |
| `/opsx:verify` | 验证实现 | 扩展模式、归档前 |
| `/opsx:sync` | 合并 delta specs | 扩展模式、可选 |
| `/opsx:archive` | 完成变更 | 所有工作完成 |
| `/opsx:bulk-archive` | 归档多个变更 | 扩展模式、并行工作 |

## 下一步

- [命令](commands.md) - 包含选项的完整命令参考
- [概念](concepts.md) - 深入了解 specs、工件和模式
- [自定义](customization.md) - 创建自定义工作流
