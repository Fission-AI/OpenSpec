import * as nodeFs from 'node:fs';
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
  extractGeneratedByVersion,
} from '../shared/index.js';
import type { WorkspaceLocalState, WorkspaceSkillState } from './foundation.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../../package.json');
const fs = nodeFs.promises;

export interface WorkspaceSkillAgentResult {
  tool_id: string;
  name: string;
  skills_path: string;
  workflow_ids: string[];
}

export interface WorkspaceSkillRemovedResult extends WorkspaceSkillAgentResult {
  reason: 'agent_unselected' | 'workflow_unselected';
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
  added: WorkspaceSkillAgentResult[];
  refreshed: WorkspaceSkillAgentResult[];
  removed: WorkspaceSkillRemovedResult[];
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

export function getCurrentWorkspaceSkillProfileSelection(): {
  profile: Profile;
  delivery: Delivery;
  workflow_ids: string[];
} {
  const profileContext = resolveWorkspaceSkillProfileContext();
  return {
    profile: profileContext.profile,
    delivery: profileContext.delivery,
    workflow_ids: profileContext.workflowIds,
  };
}

function arraysEqual(left: readonly string[] | undefined, right: readonly string[]): boolean {
  const leftValues = left ?? [];
  if (leftValues.length !== right.length) {
    return false;
  }

  const leftSet = new Set(leftValues);
  const rightSet = new Set(right);

  if (leftSet.size !== rightSet.size) {
    return false;
  }

  return [...leftSet].every((value) => rightSet.has(value));
}

export function hasWorkspaceSkillProfileDrift(
  localState: Pick<WorkspaceLocalState, 'workspace_skills'> | null | undefined
): boolean {
  const workspaceSkills = localState?.workspace_skills;

  if (!workspaceSkills) {
    return false;
  }

  const current = getCurrentWorkspaceSkillProfileSelection();

  return (
    workspaceSkills.last_applied_profile !== current.profile ||
    workspaceSkills.last_applied_delivery !== current.delivery ||
    !arraysEqual(workspaceSkills.last_applied_workflow_ids, current.workflow_ids)
  );
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
    added: [],
    refreshed: [],
    removed: [],
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

function getWorkspaceSkillDirectoryForTool(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool
): string {
  return FileSystemUtils.joinPath(workspaceRoot, tool.skillsDir, 'skills');
}

export function getWorkspaceSkillDirectory(workspaceRoot: string, toolId: string): string {
  return getWorkspaceSkillDirectoryForTool(workspaceRoot, getWorkspaceSkillTool(toolId));
}

function makeAgentResult(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool,
  workflowIds: string[]
): WorkspaceSkillAgentResult {
  return {
    tool_id: tool.value,
    name: tool.name,
    skills_path: getWorkspaceSkillDirectoryForTool(workspaceRoot, tool),
    workflow_ids: workflowIds,
  };
}

function getManagedWorkspaceSkillEntries(): Array<{ workflowId: string; dirName: string }> {
  return getSkillTemplates().map(({ workflowId, dirName }) => ({ workflowId, dirName }));
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isOpenSpecManagedSkillDir(skillDir: string): boolean {
  const skillFile = FileSystemUtils.joinPath(skillDir, 'SKILL.md');
  return extractGeneratedByVersion(skillFile) !== null;
}

async function removeManagedWorkflowSkillDirs(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool,
  desiredWorkflowIds: readonly string[],
  reason: WorkspaceSkillRemovedResult['reason']
): Promise<WorkspaceSkillRemovedResult | null> {
  const desiredSet = new Set(desiredWorkflowIds);
  const skillsDir = getWorkspaceSkillDirectoryForTool(workspaceRoot, tool);
  const removedWorkflowIds: string[] = [];

  for (const { workflowId, dirName } of getManagedWorkspaceSkillEntries()) {
    if (desiredSet.has(workflowId)) {
      continue;
    }

    const skillDir = FileSystemUtils.joinPath(skillsDir, dirName);
    if (!(await pathExists(skillDir))) {
      continue;
    }

    if (!isOpenSpecManagedSkillDir(skillDir)) {
      continue;
    }

    await fs.rm(skillDir, { recursive: true, force: true });
    removedWorkflowIds.push(workflowId);
  }

  if (removedWorkflowIds.length === 0) {
    return null;
  }

  return {
    ...makeAgentResult(workspaceRoot, tool, removedWorkflowIds),
    reason,
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
      const skillsDir = getWorkspaceSkillDirectoryForTool(workspaceRoot, tool);
      const transformer =
        tool.value === 'opencode' || tool.value === 'pi' ? transformToHyphenCommands : undefined;

      for (const { template, dirName } of skillTemplates) {
        const skillFile = FileSystemUtils.joinPath(skillsDir, dirName, 'SKILL.md');
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

export async function updateWorkspaceAgentSkills(
  workspaceRoot: string,
  selectedAgentIds: string[],
  previousSkillState?: WorkspaceSkillState
): Promise<WorkspaceSkillInstallationReport> {
  const profileContext = resolveWorkspaceSkillProfileContext();
  const report = makeBaseWorkspaceSkillReport(selectedAgentIds, profileContext);
  const previousSelectedAgentIds = previousSkillState?.selected_agents ?? [];
  const previousSelectedSet = new Set(previousSelectedAgentIds);
  const selectedSet = new Set(selectedAgentIds);
  const skillTemplates = getSkillTemplates(profileContext.workflowIds);

  for (const toolId of previousSelectedAgentIds) {
    if (selectedSet.has(toolId)) {
      continue;
    }

    const tool = getWorkspaceSkillTool(toolId);

    try {
      const removed = await removeManagedWorkflowSkillDirs(
        workspaceRoot,
        tool,
        [],
        'agent_unselected'
      );
      if (removed) {
        report.removed.push(removed);
      }
    } catch (error) {
      report.failed.push({
        tool_id: tool.value,
        name: tool.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (selectedAgentIds.length === 0) {
    if (report.removed.length === 0) {
      report.skipped.push({
        reason: previousSkillState ? 'no_agents_selected' : 'no_stored_agent_selection',
        message: previousSkillState
          ? 'No workspace agent skills were selected.'
          : 'No workspace agent skill selection is stored. Pass --tools <ids> to install skills.',
      });
    }
    return report;
  }

  if (skillTemplates.length === 0) {
    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      try {
        const removed = await removeManagedWorkflowSkillDirs(
          workspaceRoot,
          tool,
          [],
          'workflow_unselected'
        );
        if (removed) {
          report.removed.push(removed);
        }
      } catch (error) {
        report.failed.push({
          tool_id: tool.value,
          name: tool.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
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

    try {
      const skillsDir = getWorkspaceSkillDirectoryForTool(workspaceRoot, tool);
      const transformer =
        tool.value === 'opencode' || tool.value === 'pi' ? transformToHyphenCommands : undefined;

      for (const { template, dirName } of skillTemplates) {
        const skillFile = FileSystemUtils.joinPath(skillsDir, dirName, 'SKILL.md');
        const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
        await FileSystemUtils.writeFile(skillFile, skillContent);
      }

      const removed = await removeManagedWorkflowSkillDirs(
        workspaceRoot,
        tool,
        profileContext.workflowIds,
        'workflow_unselected'
      );
      if (removed) {
        report.removed.push(removed);
      }

      const result = makeAgentResult(workspaceRoot, tool, profileContext.workflowIds);
      if (previousSelectedSet.has(toolId)) {
        report.refreshed.push(result);
      } else {
        report.added.push(result);
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
