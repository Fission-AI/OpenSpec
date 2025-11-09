## MODIFIED Requirements
### Requirement: AI交互语言要求

AI编码助手SHALL使用简体中文进行所有交互，包括提案创建、讨论、实施和归档的全过程。

#### Scenario: 中文交互强制

- **WHEN** 与用户进行任何交互时
- **THEN** 必须使用简体中文进行沟通
- **AND** 所有生成的文档、注释和代码说明都必须使用中文
- **AND** 保持技术术语的准确性和专业性

### Requirement: 工作流改进

AI编码助手SHALL遵循改进后的工作流，确保提案的串行处理和明确授权。

#### Scenario: 串行提案处理

- **WHEN** 用户提出新功能请求时
- **THEN** 首先检查是否存在活跃提案：`openspec list`
- **AND** 如果存在活跃提案，提醒用户完成当前提案后再开始新提案
- **AND** 只有在确认没有活跃提案时才创建新提案

#### Scenario: 明确实施授权

- **WHEN** 提案创建和讨论完成后
- **THEN** 必须等待用户明确的实施指令
- **AND** 在收到"开始实施"、"执行此变更"等明确指令前不得进行代码实现
- **AND** 将所有讨论期间的交互视为对当前提案的更新

#### Scenario: 技术方案前置

- **WHEN** 提案内容基本确定后
- **THEN** 必须先创建技术方案文档 `design.md`
- **AND** 与用户讨论方案的可行性和具体实施细节
- **AND** 获得方案确认后才能生成任务清单 `tasks.md`

## ADDED Requirements
### Requirement: 提案讨论自动更新

在提案讨论期间，所有交互SHALL自动更新当前提案内容。

#### Scenario: 自动提案更新

- **WHEN** 用户对提案内容提出修改建议时
- **THEN** 自动更新 `proposal.md` 文件中的相关内容
- **AND** 保持提案结构的完整性
- **AND** 记录所有重要的讨论要点和决策

### Requirement: 中文模板支持

OpenSpec SHALL提供完整的中文模板支持，确保 `openspec init` 生成的都是中文文档。

#### Scenario: 中文模板生成

- **WHEN** 执行 `openspec init` 命令时
- **THEN** 生成的 `AGENTS.md`、`project.md` 和规范模板都必须是中文
- **AND** 保持与英文模板相同的功能和结构
- **AND** 遵循中文技术文档的最佳实践
