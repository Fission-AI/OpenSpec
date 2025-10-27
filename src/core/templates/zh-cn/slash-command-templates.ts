export type SlashCommandId = 'proposal' | 'apply' | 'archive';

const baseGuardrails = `**护栏**
- 优先采用直接、最小化的实现，仅在明确需要或被请求时再增加复杂度。
- 将变更严格限定在所请求的目标范围内。
- 如需更多 OpenSpec 约定或说明，请参阅 \`openspec/AGENTS.md\`（位于 \`openspec/\` 目录中——如果看不到，可运行 \`ls openspec\` 或 \`openspec update\`）。`;

const proposalGuardrails = `${baseGuardrails}\n- 在编辑文件之前，识别所有含糊或不明确的细节，并提出必要的澄清问题。`;

const proposalSteps = `**步骤**
1. 查看 \`openspec/project.md\`，运行 \`openspec list\` 和 \`openspec list --specs\`，并检查相关代码或文档（例如通过 \`rg\`/\`ls\`），使提案基于当前行为；记录任何需要澄清的空白。
2. 选择一个动词开头且唯一的 \`change-id\`，在 \`openspec/changes/<id>/\` 下生成 \`proposal.md\`、\`tasks.md\`，以及（需要时）\`design.md\` 的脚手架。
3. 将变更映射为具体的能力或需求，将多范围的工作拆分为具有清晰关系和顺序的独立规格增量。
4. 当方案跨多个系统、引入新模式，或在提交规格前需要权衡讨论时，将架构思考记录在 \`design.md\` 中。
5. 在 \`changes/<id>/specs/<capability>/spec.md\`（每个能力一个文件夹）中起草规格增量，使用 \`## ADDED|MODIFIED|REMOVED Requirements\`，并为每条需求至少撰写一个 \`#### Scenario:\`；相关能力相互交叉引用。
6. 将 \`tasks.md\` 起草为有序的小型、可验证的工作项列表，这些工作项应体现用户可见的进展，包含验证（测试、工具），并标注依赖或可并行的工作。
7. 使用 \`openspec validate <id> --strict\` 验证，并在分享提案前解决所有问题。`;

const proposalReferences = `**参考**
- 当验证失败时，使用 \`openspec show <id> --json --deltas-only\` 或 \`openspec show <spec> --type spec\` 检查细节。
- 在撰写新需求前，用 \`rg -n "Requirement:|Scenario:" openspec/specs\` 搜索现有需求。
- 通过 \`rg <keyword>\`、\`ls\` 或直接阅读文件探索代码库，确保提案与当前实现实际情况一致。`;

const applySteps = `**步骤**
将这些步骤作为 TODO 逐条跟踪并完成。
1. 阅读 \`changes/<id>/proposal.md\`、\`design.md\`（如果存在）和 \`tasks.md\`，确认范围和验收标准。
2. 按顺序完成任务，保持改动最小化并聚焦于请求的变更。
3. 在更新状态前确认完成——确保 \`tasks.md\` 中的每一项都已完成。
4. 完成所有工作后更新清单，使每个任务都标记为 \`- [x]\` 并符合事实。
5. 需要更多上下文时参考 \`openspec list\` 或 \`openspec show <item>\`。`;

const applyReferences = `**参考**
- 实施过程中若需要从提案获取更多上下文，可使用 \`openspec show <id> --json --deltas-only\`。`;

const archiveSteps = `**步骤**
1. 确定要归档的变更 ID：
   - 如果该提示已包含具体的变更 ID（例如由斜杠命令参数填充在 \`<ChangeId>\` 块中），去除空白后直接使用该值。
   - 如果对话仅笼统提到某个变更（例如按标题或摘要），运行 \`openspec list\` 以列出可能的 ID，分享相关候选项，并确认用户的意图。
   - 否则，回顾对话、运行 \`openspec list\`，并询问用户要归档哪个变更；在继续之前等待确认的变更 ID。
   - 如果仍无法确定单一变更 ID，则停止并告知用户当前无法进行归档。
2. 通过运行 \`openspec list\`（或 \`openspec show <id>\`）验证该变更 ID；若变更缺失、已归档或尚不具备归档条件，则停止。
3. 运行 \`openspec archive <id> --yes\`，使 CLI 在无提示的情况下移动该变更并应用规格更新（仅在纯工具改动时使用 \`--skip-specs\`）。
4. 查看命令输出，确认目标规格已更新且该变更已进入 \`changes/archive/\`。
5. 使用 \`openspec validate --strict\` 验证，如发现异常，使用 \`openspec show <id>\` 进一步检查。`;

const archiveReferences = `**参考**
- 在归档前使用 \`openspec list\` 确认变更 ID。
- 使用 \`openspec list --specs\` 检查更新后的规格，并在交付前处理任何验证问题。`;

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: [proposalGuardrails, proposalSteps, proposalReferences].join('\n\n'),
  apply: [baseGuardrails, applySteps, applyReferences].join('\n\n'),
  archive: [baseGuardrails, archiveSteps, archiveReferences].join('\n\n')
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}