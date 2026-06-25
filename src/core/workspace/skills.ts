import * as nodeFs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system.js';
import { transformToHyphenCommands } from '../../utils/command-references.js';
import { AI_TOOLS, type AIToolOption } from '../config.js';
import { getGlobalConfig, type Delivery, type Profile } from '../global-config.js';
import { ALL_WORKFLOWS, getProfileWorkflows } from '../profiles.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from '../command-generation/index.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
  getToolSkillStatus,
  getToolsWithSkillsDir,
  extractGeneratedByVersion,
} from '../shared/index.js';
import type { WorkspaceSkillState } from './foundation.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../../package.json');
const fs = nodeFs.promises;
const MANAGED_COMMAND_MARKER = 'OpenSpec managed command';

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

export interface WorkspaceCommandAgentResult {
  tool_id: string;
  name: string;
  commands_path: string;
  workflow_ids: string[];
}

export interface WorkspaceCommandSkippedResult {
  tool_id: string;
  name: string;
  reason: string;
  message: string;
}

export interface WorkspaceCommandFailedResult {
  tool_id: string;
  name: string;
  error: string;
}

export interface WorkspaceSkillInstallationReport {
  profile: Profile;
  delivery: Delivery;
  workflow_ids: string[];
  selected_agents: string[];
  skills_only: boolean;
  delivery_notice: string | null;
  generated: WorkspaceSkillAgentResult[];
  added: WorkspaceSkillAgentResult[];
  refreshed: WorkspaceSkillAgentResult[];
  removed: WorkspaceSkillRemovedResult[];
  skipped: WorkspaceSkillSkippedResult[];
  failed: WorkspaceSkillFailedResult[];
  commands_generated: WorkspaceCommandAgentResult[];
  commands_refreshed: WorkspaceCommandAgentResult[];
  commands_skipped: WorkspaceCommandSkippedResult[];
  commands_failed: WorkspaceCommandFailedResult[];
}

interface WorkspaceSkillProfileContext {
  profile: Profile;
  delivery: Delivery;
  workflowIds: string[];
  deliveryNotice: string | null;
  commandGenerationEnabled: boolean;
}

interface ResolveWorkspaceSkillProfileContextOptions {
  deliveryOverride?: Delivery;
  commandGenerationEnabled?: boolean;
}

type WorkspaceSkillCapableTool = AIToolOption & { skillsDir: string };

function resolveWorkspaceSkillProfileContext(
  options: ResolveWorkspaceSkillProfileContextOptions = {}
): WorkspaceSkillProfileContext {
  const globalConfig = getGlobalConfig();
  const profile = globalConfig.profile ?? 'core';
  const delivery = options.deliveryOverride ?? globalConfig.delivery ?? 'both';
  const workflowIds = [...getProfileWorkflows(profile, globalConfig.workflows)];
  const commandGenerationEnabled = options.commandGenerationEnabled ?? false;
  const deliveryNotice =
    delivery === 'skills' || commandGenerationEnabled
      ? null
      : 'Workspace setup installs skills only; workspace command generation is not part of this slice.';

  return {
    profile,
    delivery,
    workflowIds,
    deliveryNotice,
    commandGenerationEnabled,
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
  state: { workspace_skills?: WorkspaceSkillState } | null | undefined
): boolean {
  const workspaceSkills = state?.workspace_skills;

  if (!workspaceSkills) {
    return false;
  }

  const current = getCurrentWorkspaceSkillProfileSelection();

  return (
    workspaceSkills.last_applied_profile !== current.profile ||
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
    skills_only: profileContext.delivery === 'skills' || !profileContext.commandGenerationEnabled,
    delivery_notice: profileContext.deliveryNotice,
    generated: [],
    added: [],
    refreshed: [],
    removed: [],
    skipped: [],
    failed: [],
    commands_generated: [],
    commands_refreshed: [],
    commands_skipped: [],
    commands_failed: [],
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

function resolveWorkspaceCommandFilePath(workspaceRoot: string, commandPath: string): string {
  return path.isAbsolute(commandPath)
    ? commandPath
    : FileSystemUtils.joinPath(workspaceRoot, commandPath);
}

function normalizeCommandContent(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

function markWorkspaceCommandContent(commandPath: string, content: string): string {
  if (content.includes(MANAGED_COMMAND_MARKER)) {
    return content;
  }

  const yamlFrontmatterMatch = content.match(/^---\r?\n/);
  if (yamlFrontmatterMatch) {
    return content.replace(
      /^---(\r?\n)/,
      `---$1# ${MANAGED_COMMAND_MARKER} ${OPENSPEC_VERSION}$1`
    );
  }

  if (commandPath.endsWith('.toml')) {
    return `# ${MANAGED_COMMAND_MARKER} ${OPENSPEC_VERSION}\n${content}`;
  }

  return `<!-- ${MANAGED_COMMAND_MARKER} ${OPENSPEC_VERSION} -->\n${content}`;
}

function isOpenSpecManagedCommandContent(content: string): boolean {
  return content.includes(MANAGED_COMMAND_MARKER);
}

function matchesGeneratedCommandContent(content: string, expectedContent: string | undefined): boolean {
  return expectedContent !== undefined &&
    normalizeCommandContent(content) === normalizeCommandContent(expectedContent);
}

async function isOpenSpecManagedCommandFile(
  commandFile: string,
  expectedContent?: string
): Promise<boolean> {
  try {
    const content = await fs.readFile(commandFile, 'utf-8');
    return isOpenSpecManagedCommandContent(content) ||
      matchesGeneratedCommandContent(content, expectedContent);
  } catch {
    return false;
  }
}

async function assertCanWriteWorkspaceCommandFile(
  commandFile: string,
  expectedContent: string
): Promise<boolean> {
  if (!nodeFs.existsSync(commandFile)) {
    return false;
  }

  if (!(await isOpenSpecManagedCommandFile(commandFile, expectedContent))) {
    throw new Error(`Refusing to overwrite unmanaged command file: ${commandFile}`);
  }

  return true;
}

function makeCommandAgentResult(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool,
  workflowIds: string[]
): WorkspaceCommandAgentResult {
  const adapter = CommandAdapterRegistry.get(tool.value);
  const sampleWorkflowId = workflowIds[0] ?? 'propose';
  const commandPath = adapter
    ? resolveWorkspaceCommandFilePath(workspaceRoot, adapter.getFilePath(sampleWorkflowId))
    : workspaceRoot;

  return {
    tool_id: tool.value,
    name: tool.name,
    commands_path: path.dirname(commandPath),
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

async function removeManagedWorkflowCommandFiles(
  workspaceRoot: string,
  tool: WorkspaceSkillCapableTool,
  desiredWorkflowIds: readonly string[]
): Promise<number> {
  const adapter = CommandAdapterRegistry.get(tool.value);
  if (!adapter) {
    return 0;
  }

  const desiredSet = new Set(desiredWorkflowIds);
  const commandContentsById = new Map(
    getCommandContents(ALL_WORKFLOWS).map((content) => [content.id, content])
  );
  let removed = 0;

  for (const workflowId of ALL_WORKFLOWS) {
    if (desiredSet.has(workflowId)) {
      continue;
    }

    const commandFile = resolveWorkspaceCommandFilePath(
      workspaceRoot,
      adapter.getFilePath(workflowId)
    );
    const commandContent = commandContentsById.get(workflowId);
    const expectedContent = commandContent ? adapter.formatFile(commandContent) : undefined;

    try {
      if (
        nodeFs.existsSync(commandFile) &&
        await isOpenSpecManagedCommandFile(commandFile, expectedContent)
      ) {
        await fs.unlink(commandFile);
        removed++;
      }
    } catch {
      // Keep update best-effort, matching repo-local command cleanup behavior.
    }
  }

  return removed;
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
  const profileContext = resolveWorkspaceSkillProfileContext({
    deliveryOverride: previousSkillState?.last_applied_delivery,
    commandGenerationEnabled: true,
  });
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
      if (profileContext.delivery !== 'skills') {
        await removeManagedWorkflowCommandFiles(workspaceRoot, tool, []);
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
        if (profileContext.delivery !== 'skills') {
          await removeManagedWorkflowCommandFiles(workspaceRoot, tool, []);
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
      if (profileContext.delivery !== 'skills') {
        await removeManagedWorkflowCommandFiles(
          workspaceRoot,
          tool,
          profileContext.workflowIds
        );
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

  if (profileContext.delivery !== 'skills' && profileContext.workflowIds.length > 0) {
    const commandContents = getCommandContents(profileContext.workflowIds);

    for (const toolId of selectedAgentIds) {
      const tool = getWorkspaceSkillTool(toolId);
      const adapter = CommandAdapterRegistry.get(tool.value);

      if (!adapter) {
        report.commands_skipped.push({
          tool_id: tool.value,
          name: tool.name,
          reason: 'commands_not_supported',
          message: `${tool.name} does not support OpenSpec command generation.`,
        });
        continue;
      }

      try {
        const generatedCommands = generateCommands(commandContents, adapter);
        let hadExistingCommand = false;

        for (const command of generatedCommands) {
          const commandFile = resolveWorkspaceCommandFilePath(workspaceRoot, command.path);
          hadExistingCommand =
            (await assertCanWriteWorkspaceCommandFile(commandFile, command.fileContent)) ||
            hadExistingCommand;
        }

        for (const command of generatedCommands) {
          const commandFile = resolveWorkspaceCommandFilePath(workspaceRoot, command.path);
          await FileSystemUtils.writeFile(
            commandFile,
            markWorkspaceCommandContent(command.path, command.fileContent)
          );
        }

        const result = makeCommandAgentResult(workspaceRoot, tool, profileContext.workflowIds);
        if (hadExistingCommand) {
          report.commands_refreshed.push(result);
        } else {
          report.commands_generated.push(result);
        }
      } catch (error) {
        report.commands_failed.push({
          tool_id: tool.value,
          name: tool.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return report;
}
