export const agentsChineseTemplate = `# OpenSpec 指令

为使用OpenSpec进行规范驱动开发的AI编程助手提供的指令。

## TL;DR 快速检查清单

- 搜索现有工作：\`openspec spec list --long\`，\`openspec list\`（仅使用\`rg\`进行全文搜索）
- 确定范围：新功能 vs 修改现有功能
- 选择唯一的\`change-id\`：kebab-case格式，动词开头（\`add-\`，\`update-\`，\`remove-\`，\`refactor-\`）
- 脚手架：\`proposal.md\`，\`tasks.md\`，\`design.md\`（如需要），以及每个受影响功能的增量规范
- 编写增量：使用\`## ADDED|MODIFIED|REMOVED|RENAMED Requirements\`；每个需求至少包含一个\`#### Scenario:\`
- 验证：\`openspec validate [change-id] --strict\`并修复问题
- 请求批准：在提案获得批准前不要开始实施

## 三阶段工作流

### 第一阶段：创建变更
在以下情况下创建提案：
- 添加功能或功能特性
- 进行破坏性更改（API、模式）
- 更改架构或模式  
- 优化性能（更改行为）
- 更新安全模式

触发条件（示例）：
- "帮我创建一个变更提案"
- "帮我规划一个变更"
- "帮我创建一个提案"
- "我想创建一个规范提案"
- "我想创建一个规范"

宽松匹配指导：
- 包含以下之一：\`proposal\`，\`change\`，\`spec\`
- 与以下之一搭配：\`create\`，\`plan\`，\`make\`，\`start\`，\`help\`

以下情况跳过提案：
- 修复bug（恢复预期行为）
- 拼写错误、格式化、注释
- 依赖更新（非破坏性）
- 配置更改
- 现有行为的测试

**工作流**
1. 查看\`openspec/project.md\`，\`openspec list\`和\`openspec list --specs\`以了解当前上下文。
2. 选择一个唯一的动词开头的\`change-id\`并搭建\`proposal.md\`，\`tasks.md\`，可选的\`design.md\`，以及\`openspec/changes/<id>/\`下的规范增量。
3. 使用\`## ADDED|MODIFIED|REMOVED Requirements\`起草规范增量，每个需求至少包含一个\`#### Scenario:\`。
4. 运行\`openspec validate <id> --strict\`并在分享提案前解决所有问题。

### 第二阶段：实施变更
必须在接收到明确的指令，才能开始实施变更，并将这些步骤作为TODO跟踪并逐一完成。
1. **阅读proposal.md** - 了解要构建的内容
2. **阅读design.md**（如果存在）- 查看技术决策
3. **阅读tasks.md** - 获取实施清单
4. **按顺序实施任务** - 按顺序完成
5. **确认完成** - 在更新状态前确保\`tasks.md\`中的每个项目都已完成
6. **更新清单** - 在所有工作完成后，将每个任务设置为\`- [x]\`，使清单反映实际情况
7. **批准门控** - 在提案经过审查和批准前不要开始实施

实施变更指令:
- "这个提案已经比较完整，请开始实现这个提案"
- "这个变更已经比较完整，请开始实现这个变更"
- "请开始实现这个提案"
- "请开始实现这个变更"
- "请开始实施这个提案"
- "请开始实施这个变更"

### 第三阶段：归档变更
部署后，创建单独的PR来：
- 移动\`changes/[name]/\` → \`changes/archive/YYYY-MM-DD-[name]/\`
- 如果功能已更改，则更新\`specs/\`
- 对于仅工具更改，使用\`openspec archive <change-id> --skip-specs --yes\`（始终显式传递变更ID）
- 运行\`openspec validate --strict\`以确认归档的变更通过检查

## 任何任务之前

**上下文检查清单：**
- [ ] 阅读\`specs/[capability]/spec.md\`中的相关规范
- [ ] 检查\`changes/\`中的待处理变更是否存在冲突
- [ ] 阅读\`openspec/project.md\`了解约定
- [ ] 运行\`openspec list\`查看活跃变更
- [ ] 运行\`openspec list --specs\`查看现有功能

**创建规范之前：**
- 始终检查功能是否已存在
- 优先修改现有规范而不是创建重复项
- 使用\`openspec show [spec]\`查看当前状态
- 如果请求不明确，在搭建前询问1-2个澄清问题

### 搜索指导
- 枚举规范：\`openspec spec list --long\`（或用于脚本的\`--json\`）
- 枚举变更：\`openspec list\`（或已弃用但可用的\`openspec change list --json\`）
- 显示详情：
  - 规范：\`openspec show <spec-id> --type spec\`（使用\`--json\`进行过滤）
  - 变更：\`openspec show <change-id> --json --deltas-only\`
- 全文搜索（使用ripgrep）：\`rg -n "Requirement:|Scenario:" openspec/specs\`

## 快速开始

### CLI 命令

\`\`\`bash
# 基本命令
openspec list                  # 列出活跃变更
openspec list --specs          # 列出规范
openspec show [item]           # 显示变更或规范
openspec validate [item]       # 验证变更或规范
openspec archive <change-id> [--yes|-y]   # 部署后归档（为非交互式运行添加--yes）

# 项目管理
openspec init [path]           # 初始化OpenSpec
openspec update [path]         # 更新指令文件

# 交互模式
openspec show                  # 提示选择
openspec validate              # 批量验证模式

# 调试
openspec show [change] --json --deltas-only
openspec validate [change] --strict
\`\`\`

### 命令标志

- \`--json\` - 机器可读输出
- \`--type change|spec\` - 消除项目歧义
- \`--strict\` - 全面验证
- \`--no-interactive\` - 禁用提示
- \`--skip-specs\` - 归档时不更新规范
- \`--yes\`/\`-y\` - 跳过确认提示（非交互式归档）

## 目录结构

\`\`\`
openspec/
├── project.md              # 项目约定
├── specs/                  # 当前事实 - 什么是已构建的
│   └── [capability]/       # 单一专注的功能
│       ├── spec.md         # 需求和场景
│       └── design.md       # 技术模式
├── changes/                # 提案 - 什么应该改变
│   ├── [change-name]/
│   │   ├── proposal.md     # 为什么，什么，影响
│   │   ├── tasks.md        # 实施清单
│   │   ├── design.md       # 技术决策（可选；见标准）
│   │   └── specs/          # 增量变更
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # 已完成的变更
\`\`\`

## 创建变更提案

### 决策树

\`\`\`
新请求？
├─ 修复bug恢复规范行为？ → 直接修复
├─ 拼写错误/格式/注释？ → 直接修复  
├─ 新功能/能力？ → 创建提案
├─ 破坏性变更？ → 创建提案
├─ 架构变更？ → 创建提案
└─ 不明确？ → 创建提案（更安全）
\`\`\`

### 提案结构

1. **创建目录：** \`changes/[change-id]/\`（kebab-case格式，动词开头，唯一）

2. **编写proposal.md：**
\`\`\`markdown
# 变更：[变更的简要描述]

## 为什么
[1-2句话说明问题/机会]

## 什么变更
- [变更的要点列表]
- [用**BREAKING**标记破坏性变更]

## 影响
- 受影响的规范：[功能列表]
- 受影响的代码：[关键文件/系统]
\`\`\`

3. **创建规范增量：** \`specs/[capability]/spec.md\`
\`\`\`markdown
## ADDED Requirements
### Requirement: 新功能
系统必须提供...

#### Scenario: 成功案例
- **WHEN** 用户执行操作
- **THEN** 预期结果

## MODIFIED Requirements
### Requirement: 现有功能
[完整的修改后需求]

## REMOVED Requirements
### Requirement: 旧功能
**原因**：[为什么移除]
**迁移**：[如何处理]
\`\`\`
如果影响多个功能，在\`changes/[change-id]/specs/<capability>/spec.md\`下创建多个增量文件——每个功能一个。

4. **创建tasks.md：**
\`\`\`markdown
## 1. 实施
- [ ] 1.1 创建数据库模式
- [ ] 1.2 实现API端点
- [ ] 1.3 添加前端组件
- [ ] 1.4 编写测试
\`\`\`

5. **在需要时创建design.md：**
如果以下任何情况适用，则创建\`design.md\`；否则省略：
- 跨领域变更（多个服务/模块）或新架构模式
- 新的外部依赖或重要的数据模型变更
- 安全、性能或迁移复杂性
- 在编码前从技术决策中受益的模糊性

最小\`design.md\`骨架：
\`\`\`markdown
## 上下文
[背景、约束、利益相关者]

## 目标/非目标
- 目标：[...]
- 非目标：[...]

## 决策
- 决策：[什么和为什么]
- 考虑的替代方案：[选项+理由]

## 风险/权衡
- [风险] → 缓解措施

## 迁移计划
[步骤，回滚]

## 开放问题
- [...]
\`\`\`

## 规范文件格式

### 关键：场景格式

**正确**（使用####标题）：
\`\`\`markdown
#### Scenario: 用户登录成功
- **WHEN** 提供有效凭据
- **THEN** 返回JWT令牌
\`\`\`

**错误**（不要使用项目符号或粗体）：
\`\`\`markdown
- **Scenario: 用户登录**  ❌
**Scenario**: 用户登录     ❌
### Scenario: 用户登录      ❌
\`\`\`

每个需求必须至少有一个场景。

### 需求措辞
- 对于规范性需求使用SHALL/MUST（除非故意非规范性，否则避免使用should/may）

### 增量操作

- \`## ADDED Requirements\` - 新功能
- \`## MODIFIED Requirements\` - 更改的行为
- \`## REMOVED Requirements\` - 已弃用的功能
- \`## RENAMED Requirements\` - 名称更改

使用\`trim(header)\`匹配标题 - 忽略空格。

#### 何时使用ADDED vs MODIFIED
- ADDED：引入可以独立作为需求的新功能或子功能。当变更是正交的（例如，添加"Slash Command Configuration"）而不是改变现有需求的语义时，优先使用ADDED。
- MODIFIED：更改现有需求的行为、范围或验收标准。始终粘贴完整的、更新后的需求内容（标题+所有场景）。归档器将用您在此处提供的内容替换整个需求；部分增量将丢失之前的详细信息。
- RENAMED：仅当名称更改时使用。如果您也更改了行为，请使用RENAMED（名称）加上MODIFIED（内容）引用新名称。

常见陷阱：使用MODIFIED添加新关注点而不包含之前的文本。这会导致归档时丢失详细信息。如果您没有明确更改现有需求，请在ADDED下添加新需求。

正确编写MODIFIED需求：
1) 在\`openspec/specs/<capability>/spec.md\`中找到现有需求。
2) 复制整个需求块（从\`### Requirement: ...\`到其场景）。
3) 将其粘贴到\`## MODIFIED Requirements\`下并编辑以反映新行为。
4) 确保标题文本完全匹配（忽略空格），并保留至少一个\`#### Scenario:\`。

RENAMED示例：
\`\`\`markdown
## RENAMED Requirements
- FROM: \`### Requirement: Login\`
- TO: \`### Requirement: User Authentication\`
\`\`\`

## 故障排除

### 常见错误

**"Change must have at least one delta"**
- 检查\`changes/[name]/specs/\`是否存在.md文件
- 验证文件是否有操作前缀（## ADDED Requirements）

**"Requirement must have at least one scenario"**
- 检查场景是否使用\`#### Scenario:\`格式（4个井号）
- 不要使用项目符号或粗体作为场景标题

**静默场景解析失败**
- 需要确切格式：\`#### Scenario: Name\`
- 使用调试：\`openspec show [change] --json --deltas-only\`

### 验证技巧

\`\`\`bash
# 始终使用严格模式进行全面检查
openspec validate [change] --strict

# 调试增量解析
openspec show [change] --json | jq '.deltas'

# 检查特定需求
openspec show [spec] --json -r 1
\`\`\`

## 幸运路径脚本

\`\`\`bash
# 1) 探索当前状态
openspec spec list --long
openspec list
# 可选全文搜索：
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) 选择变更ID并搭建
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Why\\n...\\n\\n## What Changes\\n- ...\\n\\n## Impact\\n- ...\\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Implementation\\n- [ ] 1.1 ...\\n" > openspec/changes/$CHANGE/tasks.md

# 3) 添加增量（示例）
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Two-Factor Authentication
用户在登录期间必须提供第二个因素。

#### Scenario: 需要OTP
- **WHEN** 提供有效凭据
- **THEN** 需要OTP挑战
EOF

# 4) 验证
openspec validate $CHANGE --strict
\`\`\`

## 多功能示例

\`\`\`
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: Two-Factor Authentication
    └── notifications/
        └── spec.md   # ADDED: OTP email notification
\`\`\`

auth/spec.md
\`\`\`markdown
## ADDED Requirements
### Requirement: Two-Factor Authentication
...
\`\`\`

notifications/spec.md
\`\`\`markdown
## ADDED Requirements
### Requirement: OTP Email Notification
...
\`\`\`

## 最佳实践

### 简单优先
- 默认<100行新代码
- 单文件实现在证明不足之前
- 没有明确理由避免框架
- 选择无聊、经过验证的模式

### 复杂性触发器
仅在以下情况下添加复杂性：
- 性能数据显示当前解决方案太慢
- 具体的规模要求（>1000用户，>100MB数据）
- 多个需要抽象的已证明用例

### 清晰引用
- 使用\`file.ts:42\`格式表示代码位置
- 将规范引用为\`specs/auth/spec.md\`
- 链接相关变更和PR

### 功能命名
- 使用动词-名词：\`user-auth\`，\`payment-capture\`
- 每个功能单一目的
- 10分钟可理解性规则
- 如果描述需要"AND"则拆分

### 变更ID命名
- 使用kebab-case格式，简短且描述性：\`add-two-factor-auth\`
- 优先使用动词开头前缀：\`add-\`，\`update-\`，\`remove-\`，\`refactor-\`
- 确保唯一性；如果已被占用，附加\`-2\`，\`-3\`等。

## 工具选择指南

| 任务 | 工具 | 原因 |
|------|------|-----|
| 按模式查找文件 | Glob | 快速模式匹配 |
| 搜索代码内容 | Grep | 优化的正则搜索 |
| 读取特定文件 | Read | 直接文件访问 |
| 探索未知范围 | Task | 多步调查 |

## 错误恢复

### 变更冲突
1. 运行\`openspec list\`查看活跃变更
2. 检查重叠规范
3. 与变更所有者协调
4. 考虑合并提案

### 验证失败
1. 使用\`--strict\`标志运行
2. 检查JSON输出获取详细信息
3. 验证规范文件格式
4. 确保场景格式正确

### 缺失上下文
1. 首先阅读project.md
2. 检查相关规范
3. 查看最近的归档
4. 请求澄清

## 快速参考

### 阶段指示器
- \`changes/\` - 已提议，尚未构建
- \`specs/\` - 已构建和部署
- \`archive/\` - 已完成的变更

### 文件用途
- \`proposal.md\` - 为什么和什么
- \`tasks.md\` - 实施步骤
- \`design.md\` - 技术决策
- \`spec.md\` - 需求和行为

### CLI 要点
\`\`\`bash
openspec list              # 什么是进行中的？
openspec show [item]       # 查看详情
openspec validate --strict # 是否正确？
openspec archive <change-id> [--yes|-y]  # 标记完成（为自动化添加--yes）
\`\`\`

记住：规范是事实。变更是提案。保持它们同步。
`;
