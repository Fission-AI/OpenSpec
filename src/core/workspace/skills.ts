import * as path from 'node:path';
import { createRequire } from 'node:module';

import { FileSystemUtils } from '../../utils/file-system.js';
import { transformToHyphenCommands } from '../../utils/command-references.js';
import { AI_TOOLS, type AIToolOption } from '../config.js';
import { getGlobalConfig, type Delivery, type Profile } from '../global-config.js';
import { getProfileWorkflows } from '../profiles.js';
import {
  generateSkillContent,
  getSkillTemplates,
  getToolSkillStatus,
  getToolsWithSkillsDir,
} from '../shared/index.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../../package.json');

export interface WorkspaceSkillAgentResult {
  tool_id: string;
  name: string;
  skills_path: string;
  workflow_ids: string[];
}

export interface WorkspaceSkillSkippedResult {
  tool_id?: string;
  name?: string;
  reason: string;
  message: string;
}

export interface WorkspaceSkillFailedResult {
  tool_id: string;
  name: string;
  error: string;
}

export interface WorkspaceSkillInstallationReport {
  profile: Profile;
  delivery: Delivery;
  workflow_ids: string[];
  selected_agents: string[];
  skills_only: true;
  delivery_notice: string | null;
  generated: WorkspaceSkillAgentResult[];
  refreshed: WorkspaceSkillAgentResult[];
  skipped: WorkspaceSkillSkippedResult[];
  failed: WorkspaceSkillFailedResult[];
}

interface WorkspaceSkillProfileContext {
  profile: Profile;
  delivery: Delivery;
  workflowIds: string[];
  deliveryNotice: string | null;
}

type WorkspaceSkillCapableTool = AIToolOption & { skillsDir: string };

function resolveWorkspaceSkillProfileContext(): WorkspaceSkillProfileContext {
  const globalConfig = getGlobalConfig();
  const profile = globalConfig.profile ?? 'core';
  const delivery = globalConfig.delivery ?? 'both';
  const workflowIds = [...getProfileWorkflows(profile, globalConfig.workflows)];
  const deliveryNotice =
    delivery === 'skills'
      ? null
      : 'Workspace setup installs skills only; workspace command generation is not part of this slice.';

  return {
    profile,
    delivery,
    workflowIds,
    deliveryNotice,
  };
}

function makeBaseWorkspaceSkillReport(
  selectedAgentIds: string[],
  profileContext = resolveWorkspaceSkillProfileContext()
): WorkspaceSkillInstallationReport {
  return {
    profile: profileContext.profile,
    delivery: profileContext.delivery,
    workflow_ids: profileContext.workflowIds,
    selected_agents: selectedAgentIds,
    skills_only: true,
    delivery_notice: profileContext.deliveryNotice,
    generated: [],
    refreshed: [],
    skipped: [],
    failed: [],
  };
}

export function getWorkspaceSkillCapableTools(): WorkspaceSkillCapableTool[] {
  return AI_TOOLS.filter((tool) => Boolean(tool.skillsDir)) as WorkspaceSkillCapableTool[];
}

export function getWorkspaceSkillToolIds(): string[] {
  return getToolsWithSkillsDir();
}

export function parseWorkspaceSkillToolsValue(rawTools: string): string[] {
  const raw = rawTools.trim();
  if (raw.length === 0) {
    throw new Error(
      'The --tools option requires a value. Use "all", "none", or a comma-separated list of agent IDs.'
    );
  }

  const availableTools = getWorkspaceSkillToolIds();
  const availableSet = new Set(availableTools);
  const availableList = ['all', 'none', ...availableTools].join(', ');
  const lowerRaw = raw.toLowerCase();

  if (lowerRaw === 'all') {
    return availableTools;
  }

  if (lowerRaw === 'none') {
    return [];
  }

  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw new Error(
      'The --tools option requires at least one agent ID when not using "all" or "none".'
    );
  }

  const normalizedTokens = tokens.map((token) => token.toLowerCase());

  if (normalizedTokens.some((token) => token === 'all' || token === 'none')) {
    throw new Error('Cannot combine reserved values "all" or "none" with specific agent IDs.');
  }

  const invalidTokens = tokens.filter(
    (_token, index) => !availableSet.has(normalizedTokens[index])
  );

  if (invalidTokens.length > 0) {
    throw new Error(`Invalid agent(s): ${invalidTokens.join(', ')}. Available values: ${availableList}`);
  }

  const deduped: string[] = [];
  for (const token of normalizedTokens) {
    if (!deduped.includes(token)) {
      deduped.push(token);
    }
  }

  return deduped;
}

export function createWorkspaceSkillSkippedReport(
  reason: string,
  message: string
): WorkspaceSkillInstallationReport {
  const report = makeBaseWorkspaceSkillReport([]);
  report.skipped.push({
    reason,
    message,
  });
  return report;
}

function getWorkspaceSkillTool(toolId: string): WorkspaceSkillCapableTool {
  const tool = getWorkspaceSkillCapableTools().find((candidate) => candidate.value === toolId);
  if (!tool) {
    throw new Error(`Unknown workspace skill agent '${toolId}'.`);
  }

  return tool;
}

function makeAgentResult(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool,
  workflowIds: string[]
): WorkspaceSkillAgentResult {
  return {
    tool_id: tool.value,
    name: tool.name,
    skills_path: path.join(workspaceRoot, tool.skillsDir, 'skills'),
    workflow_ids: workflowIds,
  };
}

export async function generateWorkspaceAgentSkills(
  workspaceRoot: string,
  selectedAgentIds: string[]
): Promise<WorkspaceSkillInstallationReport> {
  const profileContext = resolveWorkspaceSkillProfileContext();
  const report = makeBaseWorkspaceSkillReport(selectedAgentIds, profileContext);

  if (selectedAgentIds.length === 0) {
    report.skipped.push({
      reason: 'no_agents_selected',
      message: 'No workspace agent skills were selected.',
    });
    return report;
  }

  const skillTemplates = getSkillTemplates(profileContext.workflowIds);

  if (skillTemplates.length === 0) {
    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      report.skipped.push({
        tool_id: tool.value,
        name: tool.name,
        reason: 'no_profile_workflows',
        message: 'The active global profile does not select any workflows.',
      });
    }
    return report;
  }

  for (const toolId of selectedAgentIds) {
    const tool = getWorkspaceSkillTool(toolId);
    const wasConfigured = getToolSkillStatus(workspaceRoot, tool.value).configured;

    try {
      const skillsDir = path.join(workspaceRoot, tool.skillsDir, 'skills');
      const transformer =
        tool.value === 'opencode' || tool.value === 'pi' ? transformToHyphenCommands : undefined;

      for (const { template, dirName } of skillTemplates) {
        const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
        const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
        await FileSystemUtils.writeFile(skillFile, skillContent);
      }

      const result = makeAgentResult(workspaceRoot, tool, profileContext.workflowIds);
      if (wasConfigured) {
        report.refreshed.push(result);
      } else {
        report.generated.push(result);
      }
    } catch (error) {
      report.failed.push({
        tool_id: tool.value,
        name: tool.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return report;
}
