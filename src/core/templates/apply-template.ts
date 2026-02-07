import { baseGuardrails } from './skill-common-template.js';

export const applyFrontmatter = `---
name: lightspec-apply
description: Implement an approved LightSpec change and keep tasks in sync.
disable-model-invocation: true
user-invocable: true
metadata:
  source: lightspec
  workflow: apply
---`;

const applySteps = `**Steps**
Track these steps as TODOs and complete them one by one.
1. Read \`changes/<id>/proposal.md\`, \`design.md\` (if present), and \`tasks.md\` to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
3. Confirm completion before updating statuses—make sure every item in \`tasks.md\` is finished.
4. Update the checklist after all work is done so each task is marked \`- [x]\` and reflects reality.
5. Reference \`lightspec list\` or \`lightspec show <item>\` when additional context is required.`;

const applyReferences = `**Reference**
- Use \`lightspec show <id> --json --deltas-only\` if you need additional context from the proposal while implementing.`;

export const applyTemplate = [baseGuardrails, applySteps, applyReferences].join(
  '\n\n'
);
