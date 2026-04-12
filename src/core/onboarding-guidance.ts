import path from 'path';
import { AI_TOOLS } from './config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import type { Delivery } from './global-config.js';

const WORKFLOW_TO_SKILL_NAME: Record<string, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

const EXPANDED_WORKFLOW_IDS = ['new', 'continue', 'ff', 'verify', 'sync'];

export interface OnboardingGuidanceOptions {
  workflows: string[];
  delivery: Delivery;
  toolIds?: string[];
  maxExamples?: number;
}

function describeDelivery(delivery: Delivery): string {
  if (delivery === 'skills') return 'skills only';
  if (delivery === 'commands') return 'commands only';
  return 'both (skills + commands)';
}

function getToolLabel(toolId: string): string {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  return tool?.successLabel ?? tool?.name ?? toolId;
}

function getPrimaryWorkflow(workflows: string[]): string | undefined {
  if (workflows.includes('propose')) return 'propose';
  if (workflows.includes('new')) return 'new';
  return workflows[0];
}

function getSkillInvocation(workflowId: string): string | null {
  const skillName = WORKFLOW_TO_SKILL_NAME[workflowId];
  if (!skillName) return null;
  return `/${skillName}`;
}

function getCommandInvocation(toolId: string, workflowId: string): string | null {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return null;

  const normalizedPath = adapter.getFilePath(workflowId).replace(/\\/g, '/');
  const basename = path.posix.basename(normalizedPath);

  if (normalizedPath.includes('/opsx/')) {
    return `/opsx:${workflowId}`;
  }

  if (basename.startsWith('opsx-')) {
    return `/opsx-${workflowId}`;
  }

  return `/opsx:${workflowId}`;
}

function getInvocationExample(toolId: string, workflowId: string, delivery: Delivery): string | null {
  if (delivery !== 'skills') {
    const commandInvocation = getCommandInvocation(toolId, workflowId);
    if (commandInvocation) {
      return `${commandInvocation} \"your idea\"`;
    }
  }

  if (delivery !== 'commands' || !getCommandInvocation(toolId, workflowId)) {
    const skillInvocation = getSkillInvocation(workflowId);
    if (skillInvocation) {
      return `${skillInvocation} \"your idea\"`;
    }
  }

  return null;
}

function getSkillOnlyTools(toolIds: string[]): string[] {
  return toolIds.filter((toolId) => CommandAdapterRegistry.get(toolId) == null);
}

function buildGroupedExamples(toolIds: string[], workflowId: string, delivery: Delivery): string[] {
  const grouped = new Map<string, string[]>();

  for (const toolId of toolIds) {
    const example = getInvocationExample(toolId, workflowId, delivery);
    if (!example) continue;

    const labels = grouped.get(example) ?? [];
    labels.push(getToolLabel(toolId));
    grouped.set(example, labels);
  }

  return [...grouped.entries()].map(([example, labels]) => `${labels.join(', ')}: ${example}`);
}

export function buildOnboardingGuidance(options: OnboardingGuidanceOptions): string[] {
  const workflows = [...options.workflows];
  const delivery = options.delivery;
  const toolIds = [...new Set(options.toolIds ?? [])];
  const maxExamples = options.maxExamples ?? 3;
  const lines: string[] = [];

  if (workflows.length > 0) {
    lines.push(`Available workflows: ${workflows.join(', ')}`);
  }
  lines.push(`Delivery: ${describeDelivery(delivery)}`);

  const primaryWorkflow = getPrimaryWorkflow(workflows);
  if (primaryWorkflow && toolIds.length > 0) {
    const examples = buildGroupedExamples(toolIds, primaryWorkflow, delivery).slice(0, maxExamples);
    if (examples.length > 0) {
      lines.push('Try:');
      for (const example of examples) {
        lines.push(`  ${example}`);
      }
    }
  }

  if (!EXPANDED_WORKFLOW_IDS.every((workflowId) => workflows.includes(workflowId))) {
    lines.push('Want expanded workflows like /opsx:new and /opsx:continue? Run `openspec config profile`, then `openspec update`.');
  }

  if (delivery === 'skills') {
    lines.push('Command files were not generated because delivery is set to skills-only.');
  }

  const skillOnlyTools = getSkillOnlyTools(toolIds);
  if (skillOnlyTools.length > 0 && delivery !== 'skills') {
    lines.push(`These tools use skill-based invocations here: ${skillOnlyTools.map(getToolLabel).join(', ')}.`);
  }

  return lines;
}
