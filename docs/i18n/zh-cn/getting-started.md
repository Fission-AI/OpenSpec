> **声明**：本文档由 AI 翻译，使用 `mimo-v2-pro` 进行翻译。

# 快速入门

本指南解释了在安装和初始化 OpenSpec 后它的工作原理。安装说明请参阅 [主 README](../README.md#quick-start)。

## 工作原理

OpenSpec 帮助你和你的 AI 编程助手在编写任何代码之前就构建内容达成一致。

**默认快速路径（核心配置文件）：**

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

**扩展路径（自定义工作流选择）：**

```text
/opsx:new ──► /opsx:ff or /opsx:continue ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

默认全局配置文件是 `core`，包含 `propose`、`explore`、`apply` 和 `archive`。你可以使用 `openspec config profile` 启用扩展工作流命令，然后运行 `openspec update`。

## OpenSpec 创建的内容

运行 `openspec init` 后，你的项目将具有以下结构：

```
openspec/
├── specs/              # 真相来源（系统的行为描述）
│   └── <domain>/
│       └── spec.md
├── changes/            # 提议的更新（每个变更一个文件夹）
│   └── <change-name>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # 增量规范（变更内容）
│           └── <domain>/
│               └── spec.md
└── config.yaml         # 项目配置（可选）
```

**两个关键目录：**

- **`specs/`** - 真相来源。这些规范描述系统当前的行为。按领域组织（例如 `specs/auth/`、`specs/payments/`）。

- **`changes/`** - 提议的修改。每个变更都有自己的文件夹，包含所有相关工件。变更完成后，其规范会合并到主 `specs/` 目录。

## 理解工件

每个变更文件夹包含指导工作的工件：

| 工件 | 用途 |
|----------|---------|
| `proposal.md` | "为什么"和"什么" - 捕获意图、范围和方法 |
| `specs/` | 显示添加/修改/删除需求的增量规范 |
| `design.md` | "如何" - 技术方法和架构决策 |
| `tasks.md` | 带复选框的实现清单 |

**工件相互构建：**

```
proposal ──► specs ──► design ──► tasks ──► implement
    ▲           ▲          ▲                    │
    └───────────┴──────────┴────────────────────┘
             根据学习进行更新
```

你随时可以回过头来改进早期的工件，随着在实现过程中学到更多。

## 增量规范的工作原理

增量规范是 OpenSpec 中的核心概念。它们显示相对于当前规范的变更内容。

### 格式

增量规范使用章节来指示变更类型：

```markdown
# Auth 增量规范

## 添加的需求

### 需求：双因素认证
系统必须在登录时要求第二因素验证。

#### 场景：需要 OTP
- 给定一个启用了 2FA 的用户
- 当用户提交有效凭证时
- 则显示 OTP 验证提示

## 修改的需求

### 需求：会话超时
系统应在 30 分钟不活动后使会话过期。
（之前：60 分钟）

#### 场景：空闲超时
- 给定一个已认证的会话
- 当 30 分钟过去且没有活动时
- 则会话被失效

## 删除的需求

### 需求：记住我
（已弃用，改用 2FA）
```

### 归档时发生什么

当你归档一个变更时：

1. **添加的需求** 被附加到主规范
2. **修改的需求** 替换现有版本
3. **删除的需求** 从主规范中删除

变更文件夹移动到 `openspec/changes/archive/` 以供审计历史记录。

## 示例：你的第一个变更

让我们通过向应用程序添加暗色模式来演示。

### 1. 启动变更（默认方式）

```text
你：/opsx:propose add-dark-mode

AI：已创建 openspec/changes/add-dark-mode/
    ✓ proposal.md — 我们为什么要做这个，以及正在改变什么
    ✓ specs/       — 需求和场景
    ✓ design.md    — 技术方案
    ✓ tasks.md     — 实现清单
    准备好进行实现！
```

如果你已启用扩展工作流配置文件，也可以分两步完成：先 `/opsx:new`，然后 `/opsx:ff`（或 `/opsx:continue` 逐步进行）。

### 2. 创建的内容

**proposal.md** - 捕获意图：

```markdown
# 提案：添加暗色模式

## 意图
用户请求暗色模式选项，以减少夜间使用时的眼部疲劳。

## 范围
- 在设置中添加主题切换
- 支持系统偏好检测
- 将偏好持久化到 localStorage

## 方法
使用 CSS 自定义属性进行主题化，配合 React 上下文进行状态管理。
```

**specs/ui/spec.md** - 显示新需求的增量规范：

```markdown
# UI 增量规范

## 添加的需求

### 需求：主题选择
系统应允许用户在亮色和暗色主题之间选择。

#### 场景：手动切换
- 给定一个在任何页面上的用户
- 当用户点击主题切换时
- 则主题立即切换
- 且偏好在会话间持久化

#### 场景：系统偏好
- 给定一个没有保存偏好的用户
- 当应用程序加载时
- 则使用系统的首选配色方案
```

**tasks.md** - 实现清单：

```markdown
# 任务

## 1. 主题基础设施
- [ ] 1.1 创建具有亮/暗状态的 ThemeContext
- [ ] 1.2 添加颜色的 CSS 自定义属性
- [ ] 1.3 实现 localStorage 持久化

## 2. UI 组件
- [ ] 2.1 创建 ThemeToggle 组件
- [ ] 2.2 添加切换到设置页面
- [ ] 2.3 更新 Header 以包含快速切换

## 3. 样式
- [ ] 3.1 定义暗色主题调色板
- [ ] 3.2 更新组件以使用 CSS 变量
```

### 3. 实现

```
你：/opsx:apply

AI：正在处理任务...
    ✓ 1.1 创建了具有亮/暗状态的 ThemeContext
    ✓ 1.2 在 globals.css 中添加了 CSS 自定义属性
    ✓ 1.3 实现了 localStorage 持久化
    ✓ 2.1 创建了 ThemeToggle 组件
    ...
    所有任务完成！
```

在实现过程中，如果发现设计需要调整，只需更新工件并继续即可。

### 4. 归档

```
你：/opsx:archive

AI：正在归档 add-dark-mode...
    ✓ 已将规范合并到 openspec/specs/ui/spec.md
    ✓ 已移动到 openspec/changes/archive/2025-01-24-add-dark-mode/
    完成！准备好进行下一个功能。
```

你的增量规范现在已成为主规范的一部分，记录了系统的工作方式。

## 验证和审查

使用 CLI 检查你的变更：

```bash
# 列出活动变更
openspec list

# 查看变更详情
openspec show add-dark-mode

# 验证规范格式
openspec validate add-dark-mode

# 交互式仪表板
openspec view
```

## 后续步骤

- [工作流](workflows.md) - 常见模式及何时使用每个命令
- [命令](commands.md) - 所有斜杠命令的完整参考
- [概念](concepts.md) - 更深入地理解规范、变更和模式
- [自定义](customization.md) - 让 OpenSpec 按你的方式工作
