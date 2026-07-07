import { getCommandContents } from '../../src/core/shared/skill-generation.js';
import type { WorkflowId } from '../../src/core/profiles.js';

export function createLegacyCodexPromptContent(workflowId: WorkflowId): string {
  const commandContent = getCommandContents([workflowId])[0];
  if (!commandContent) {
    throw new Error(`No legacy Codex prompt template found for workflow "${workflowId}"`);
  }

  return `---
description: ${commandContent.description}
argument-hint: command arguments
---

${commandContent.body}
`;
}
