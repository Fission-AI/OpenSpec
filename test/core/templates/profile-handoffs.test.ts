import { describe, expect, it } from 'vitest';
import { AI_TOOLS } from '../../../src/core/config.js';
import { ALL_WORKFLOWS, getProfileWorkflows } from '../../../src/core/profiles.js';
import {
  resolveCommandInvocation,
  resolveCommandSurfaceCapability,
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
} from '../../../src/core/command-surface.js';
import { CommandAdapterRegistry, generateCommands } from '../../../src/core/command-generation/index.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { getTransformerForTool } from '../../../src/utils/command-references.js';

const profiles = [
  { name: 'core', workflows: getProfileWorkflows('core') },
  { name: 'custom expanded', workflows: getProfileWorkflows('custom', [...ALL_WORKFLOWS]) },
  { name: 'custom update only', workflows: getProfileWorkflows('custom', ['update']) },
  { name: 'custom archive with sync dependency', workflows: getProfileWorkflows('custom', ['archive']) },
];
const skillWorkflows = new Map(getSkillTemplates().map(({ dirName, workflowId }) => [dirName, workflowId]));

// Check both invocation spellings and bare skill names (archive's sync handoff).
// Unknown references also fail: a typo must not make the guard silently pass.
function expectInstalledReferences(content: string, workflows: readonly string[], label: string): void {
  for (const match of content.matchAll(/[/@]opsx[:-]([a-z-]+)|\b(openspec-[a-z-]+)\b/g)) {
    const workflow = match[1] ?? skillWorkflows.get(match[2]);
    expect(workflows, `${label}: unavailable workflow reference ${match[0]}`).toContain(workflow);
  }
}

describe.each(profiles)('$name workflow handoffs', ({ workflows }) => {
  for (const delivery of ['skills', 'commands', 'both'] as const) {
    const tools = AI_TOOLS.filter(tool => tool.skillsDir && (
      shouldGenerateSkillsForTool(tool.value, delivery) || shouldGenerateCommandsForTool(tool.value, delivery)
    ));
    it.each(tools)(`only references installed workflows for $value (${delivery})`, (tool) => {
      if (shouldGenerateSkillsForTool(tool.value, delivery)) {
        const transformer = getTransformerForTool(
          tool.value, delivery,
          resolveCommandSurfaceCapability(tool.value),
          resolveCommandInvocation(tool.value),
        );
        for (const { template, workflowId } of getSkillTemplates(workflows)) {
          expectInstalledReferences(generateSkillContent(template, 'TEST', transformer), workflows, workflowId);
        }
      }
      if (shouldGenerateCommandsForTool(tool.value, delivery)) {
        const adapter = CommandAdapterRegistry.get(tool.value)!;
        for (const command of generateCommands(getCommandContents(workflows), adapter)) {
          expectInstalledReferences(command.fileContent, workflows, command.path);
        }
      }
    });
  }
});
