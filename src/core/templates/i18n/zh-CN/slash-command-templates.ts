import { SlashCommandId } from '../../slash-command-templates.js';

const baseGuardrails = `**约束条件**
- 优先采用简单、最小化的实现，只有在明确要求或明显需要时才添加复杂性。
- 保持更改紧密围绕请求的结果。
- 如需更多 OpenSpec 约定或说明，请参考 \`openspec/AGENTS.md\`（位于 \`openspec/\` 目录中——如果看不到，请运行 \`ls openspec\` 或 \`openspec update\`）。`;

const proposalGuardrails = `${baseGuardrails}\n- 识别任何模糊或含糊的细节，在编辑文件之前提出必要的后续问题。`;

const proposalSteps = `**步骤**
1. 查看 \`openspec/project.md\`，运行 \`openspec list\` 和 \`openspec list --specs\`，并检查相关代码或文档（例如通过 \`rg\`/\`ls\`）以了解当前行为；注意任何需要澄清的空白。
2. 选择一个唯一的动词引导的 \`change-id\`，并在 \`openspec/changes/<id>/\` 下搭建 \`proposal.md\`、\`tasks.md\` 和 \`design.md\`（需要时）。
3. 将变更映射到具体的能力或需求，将多范围的工作分解为具有明确关系和顺序的不同规范增量。
4. 当解决方案跨越多个系统、引入新模式或需要在提交规范之前进行权衡讨论时，在 \`design.md\` 中捕获架构推理。
5. 在 \`changes/<id>/specs/<capability>/spec.md\` 中起草规范增量（每个能力一个文件夹），使用 \`## ADDED|MODIFIED|REMOVED Requirements\`，每个需求至少包含一个 \`#### Scenario:\`，并在相关时交叉引用相关能力。
6. 将 \`tasks.md\` 起草为有序的小型、可验证工作项列表，这些工作项提供用户可见的进度，包括验证（测试、工具），并突出依赖关系或可并行化的工作。
7. 使用 \`openspec validate <id> --strict\` 进行验证，并在分享提案之前解决所有问题。`;

const proposalReferences = `**参考**
- 当验证失败时，使用 \`openspec show <id> --json --deltas-only\` 或 \`openspec show <spec> --type spec\` 检查详细信息。
- 在编写新需求之前，使用 \`rg -n "Requirement:|Scenario:" openspec/specs\` 搜索现有需求。
- 使用 \`rg <keyword>\`、\`ls\` 或直接文件读取来探索代码库，以便提案与当前实现现实保持一致。`;

const applySteps = `**步骤**
将这些步骤作为待办事项跟踪，逐一完成。
1. 阅读 \`changes/<id>/proposal.md\`、\`design.md\`（如果存在）和 \`tasks.md\` 以确认范围和验收标准。
2. 按顺序完成任务，保持编辑最小化并专注于请求的更改。
3. 在更新状态之前确认完成——确保 \`tasks.md\` 中的每个项目都已完成。
4. 在所有工作完成后更新清单，以便每个任务都标记为 \`- [x]\` 并反映实际情况。
5. 需要额外上下文时，参考 \`openspec list\` 或 \`openspec show <item>\`。`;

const applyReferences = `**参考**
- 如果在实施过程中需要提案的额外上下文，请使用 \`openspec show <id> --json --deltas-only\`。`;

const archiveSteps = `**步骤**
1. 确定要归档的变更 ID：
   - 如果此提示已包含特定的变更 ID（例如在由斜杠命令参数填充的 \`<ChangeId>\` 块内），请在修剪空白后使用该值。
   - 如果对话中松散地引用了变更（例如通过标题或摘要），运行 \`openspec list\` 以显示可能的 ID，分享相关候选，并确认用户打算使用哪一个。
   - 否则，查看对话，运行 \`openspec list\`，并询问用户要归档哪个变更；在继续之前等待确认的变更 ID。
   - 如果您仍然无法识别单个变更 ID，请停止并告诉用户您还无法归档任何内容。
2. 通过运行 \`openspec list\`（或 \`openspec show <id>\`）验证变更 ID，如果变更缺失、已归档或尚未准备好归档，则停止。
3. 运行 \`openspec archive <id> --yes\`，以便 CLI 移动变更并应用规范更新而不提示（仅对仅工具工作使用 \`--skip-specs\`）。
4. 查看命令输出以确认目标规范已更新，并且变更已进入 \`changes/archive/\`。
5. 使用 \`openspec validate --strict\` 进行验证，如果看起来有问题，请使用 \`openspec show <id>\` 进行检查。`;

const archiveReferences = `**参考**
- 在归档之前使用 \`openspec list\` 确认变更 ID。
- 使用 \`openspec list --specs\` 检查刷新的规范，并在移交之前解决任何验证问题。`;

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: [proposalGuardrails, proposalSteps, proposalReferences].join('\n\n'),
  apply: [baseGuardrails, applySteps, applyReferences].join('\n\n'),
  archive: [baseGuardrails, archiveSteps, archiveReferences].join('\n\n')
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}

