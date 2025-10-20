## 为什么

目前，用户必须通过指定每个 ID 来单独验证变更和规范。这在以下情况下造成摩擦：
- 团队希望在发布前验证所有变更/规范
- 开发人员需要确保多个相关变更的一致性  
- 用户运行无参数的验证命令并收到错误而不是有用的指导
- 子命令结构要求用户提前知道他们是在验证变更还是规范

## 变更内容

- 添加新的顶级 `validate` 命令，带有直观标志（--all、--changes、--specs）
- 增强现有的 `change validate` 和 `spec validate` 以支持交互式选择（向后兼容）
- 无参数时默认交互式选择
- 支持直接项目验证：`openspec validate <item>` 带自动类型检测

## 影响

- 要创建的新规范：cli-validate
- 要增强的规范：cli-change、cli-spec（用于向后兼容）
- 受影响的代码：src/cli/index.ts、src/commands/validate.ts（新增）、src/commands/spec.ts、src/commands/change.ts