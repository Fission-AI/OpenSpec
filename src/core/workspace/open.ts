import path from 'node:path';
import { CommandAdapterRegistry, generateCommand, type CommandContent } from '../command-generation/index.js';
import type { ToolCommandAdapter } from '../command-generation/types.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { ensureGitignoreEntries } from '../setup/bootstrap.js';
import { listAvailableWorkspaceChanges, resolveWorkspaceChange } from './change.js';
import {
  getWorkspaceRepoGuidance,
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  writeWorkspaceLocalOverlay,
  type WorkspaceMetadata,
} from './metadata.js';
import {
  resolveWorkspaceRepoTargets,
  resolveWorkspaceRoot,
  type ResolvedWorkspaceRepo,
  type WorkspaceRepoResolutionIssue,
} from './registry.js';

export const DEFAULT_WORKSPACE_OPEN_AGENT = 'claude';
const WORKSPACE_OPEN_COMMAND_ID = 'workspace-open';
const GITHUB_COPILOT_WORKSPACE_OPEN_AGENT = 'github-copilot';
const WORKSPACE_OPEN_GITIGNORE_ENTRY = '/.openspec/workspace-open/';
const WORKSPACE_OPEN_STATE_PATH = path.join('.openspec', 'workspace-open');

export type WorkspaceOpenMode = 'workspace-root' | 'change-scoped';

export interface WorkspaceOpenAttachedRepo {
  alias: string;
  path: string;
  owner?: string;
  handoff?: string;
}

export interface WorkspaceOpenRegisteredRepo {
  alias: string;
  path: string | null;
  status: 'ready' | 'missing-local-path' | 'missing-repo-path' | 'repo-not-directory' | 'missing-openspec-state';
  note?: string;
  owner?: string;
  handoff?: string;
}

export interface WorkspaceOpenSurface {
  path: string;
  content: string;
}

export interface WorkspaceOpenEditorSurface extends WorkspaceOpenSurface {
  kind: 'vscode-workspace';
}

export interface WorkspaceOpenResult {
  workspaceRoot: string;
  mode: WorkspaceOpenMode;
  agent: string;
  change: {
    id: string;
    path: string;
  } | null;
  attachedRepos: WorkspaceOpenAttachedRepo[];
  registeredRepos: WorkspaceOpenRegisteredRepo[];
  availableChanges: string[];
  instructionSurface: WorkspaceOpenSurface;
  editorSurface?: WorkspaceOpenEditorSurface;
}

export interface WorkspaceOpenOptions {
  cwd?: string;
  change?: string;
  agent?: string;
}

export function getSupportedWorkspaceOpenAgents(): string[] {
  return CommandAdapterRegistry.getByCapability('supportsWorkspaceOpen').map((adapter) => adapter.toolId);
}

function getWorkspaceOpenAgentSupportError(normalizedAgent: string): Error {
  const supportedAgents = getSupportedWorkspaceOpenAgents().join(', ');
  return new Error(
    `Unsupported agent '${normalizedAgent}' for workspace open. Supported agents: ${supportedAgents}.`
  );
}

function resolveWorkspaceOpenAdapter(agent?: string): ToolCommandAdapter {
  const normalizedAgent = agent?.trim() || DEFAULT_WORKSPACE_OPEN_AGENT;
  const adapter = CommandAdapterRegistry.get(normalizedAgent);

  if (!adapter) {
    throw getWorkspaceOpenAgentSupportError(normalizedAgent);
  }

  if (!adapter.capabilities?.supportsWorkspaceOpen) {
    throw getWorkspaceOpenAgentSupportError(normalizedAgent);
  }

  return adapter;
}

function normalizeWorkspaceOpenAgent(agent?: string): string {
  const normalizedAgent = agent?.trim() || DEFAULT_WORKSPACE_OPEN_AGENT;
  if (!CommandAdapterRegistry.supports(normalizedAgent, 'supportsWorkspaceOpen')) {
    throw new Error(
      `Unsupported agent '${normalizedAgent}' for workspace open. Supported agents: ${getSupportedWorkspaceOpenAgents().join(', ')}.`
    );
  }

  return normalizedAgent;
}

async function resolvePreferredWorkspaceOpenAgent(workspaceRoot: string): Promise<string> {
  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);
  const preferredAgent = localOverlay.preferredAgent?.trim();

  if (!preferredAgent) {
    return DEFAULT_WORKSPACE_OPEN_AGENT;
  }

  return CommandAdapterRegistry.supports(preferredAgent, 'supportsWorkspaceOpen')
    ? preferredAgent
    : DEFAULT_WORKSPACE_OPEN_AGENT;
}

export async function savePreferredWorkspaceOpenAgent(workspaceRoot: string, agent: string): Promise<string> {
  const normalizedAgent = normalizeWorkspaceOpenAgent(agent);
  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);

  if (localOverlay.preferredAgent === normalizedAgent) {
    return normalizedAgent;
  }

  localOverlay.preferredAgent = normalizedAgent;
  await writeWorkspaceLocalOverlay(workspaceRoot, localOverlay);

  return normalizedAgent;
}

function buildRepoResolutionError(changeName: string, issues: WorkspaceRepoResolutionIssue[]): Error {
  const issueLabel = issues.length === 1 ? '1 targeted repo is unresolved' : `${issues.length} targeted repos are unresolved`;
  const lines = [
    `Could not open workspace change '${changeName}' because ${issueLabel}:`,
    ...issues.map((issue) => `- ${issue.message}`),
    `Run 'openspec workspace doctor' and repair the failing alias${issues.length === 1 ? '' : 'es'} before retrying.`,
  ];

  return new Error(lines.join('\n'));
}

type WorkspaceOpenSurfaceInput = Omit<WorkspaceOpenResult, 'instructionSurface' | 'editorSurface'>;

function formatRegisteredReposBlock(repos: WorkspaceOpenRegisteredRepo[]): string {
  if (repos.length === 0) {
    return 'none';
  }

  return repos.map((repo) => {
    const pathLabel = repo.path ?? '(missing local path)';
    const guidance = [
      repo.owner ? `owner: ${repo.owner}` : null,
      repo.handoff ? `handoff: ${repo.handoff}` : null,
    ].filter((detail): detail is string => detail !== null);
    const guidanceSuffix = guidance.length > 0 ? ` (${guidance.join('; ')})` : '';
    const statusSuffix = repo.status === 'ready'
      ? ''
      : ` [${repo.status}: ${repo.note ?? 'unavailable'}]`;
    return `- ${repo.alias}: ${pathLabel}${guidanceSuffix}${statusSuffix}`;
  }).join('\n');
}

function buildWorkspaceOpenBody(result: WorkspaceOpenSurfaceInput): string {
  const attachedReposBlock = result.attachedRepos.length === 0
    ? 'none'
    : result.attachedRepos
      .map((repo) => {
        const repoGuidance = [
          repo.owner ? `owner: ${repo.owner}` : null,
          repo.handoff ? `handoff: ${repo.handoff}` : null,
        ].filter((detail): detail is string => detail !== null);
        const guidanceSuffix = repoGuidance.length > 0
          ? ` (${repoGuidance.join('; ')})`
          : '';
        return `- ${repo.alias}: ${repo.path}${guidanceSuffix}`;
      })
      .join('\n');

  const lines = [
    'Prepare a workspace-scoped OpenSpec session with this exact scope.',
    '',
    `Mode: ${result.mode}`,
    `Workspace root: ${result.workspaceRoot}`,
    `Agent target: ${result.agent}`,
  ];

  if (result.change) {
    lines.push(`Change ID: ${result.change.id}`);
    lines.push(`Change path: ${result.change.path}`);
  }

  if (result.mode === 'workspace-root') {
    lines.push('Registered repos:');
    lines.push(formatRegisteredReposBlock(result.registeredRepos));
    lines.push('');
    lines.push('Active workspace changes:');
    lines.push(result.availableChanges.length === 0
      ? 'none'
      : result.availableChanges.map((changeId) => `- ${changeId}`).join('\n'));
  }

  lines.push('');
  lines.push('Attached repos:');
  lines.push(attachedReposBlock);
  lines.push('');
  lines.push('Rules:');
  lines.push('- Use only the workspace and attached repos listed above.');
  lines.push('- Do not materialize repo-local changes from this session.');

  if (result.mode === 'workspace-root') {
    lines.push(`- Registered repos are attached as the workspace working set for exploration and planning.`);
    lines.push(`- Creating or updating a targeted workspace change records proposal scope; it is not required just to inspect repos.`);
    lines.push(`- Keep repo-local materialization explicit through 'openspec apply --change <id> --repo <alias>'.`);
  } else if (result.change) {
    lines.push(`- Repo-local materialization still happens with 'openspec apply --change ${result.change.id} --repo <alias>'.`);
  }

  return `${lines.join('\n')}\n`;
}

function buildWorkspaceOpenCommandContent(result: WorkspaceOpenSurfaceInput): CommandContent {
  return {
    id: WORKSPACE_OPEN_COMMAND_ID,
    name: 'OpenSpec Workspace Open',
    description: result.mode === 'workspace-root'
      ? 'Prepare a workspace-root coordination session'
      : `Prepare a change-scoped workspace session for ${result.change?.id ?? 'a workspace change'}`,
    category: 'Workspace',
    tags: ['workspace', 'open', result.mode, result.agent],
    body: buildWorkspaceOpenBody(result),
  };
}

function resolveWorkspaceOpenSurfacePath(workspaceRoot: string, surfacePath: string): string {
  return path.isAbsolute(surfacePath)
    ? surfacePath
    : path.join(workspaceRoot, surfacePath);
}

function getGithubCopilotEditorSurfacePath(result: WorkspaceOpenSurfaceInput): string {
  const fileName = result.change === null
    ? 'planning.code-workspace'
    : `${result.change.id}.code-workspace`;
  return path.join(
    result.workspaceRoot,
    WORKSPACE_OPEN_STATE_PATH,
    GITHUB_COPILOT_WORKSPACE_OPEN_AGENT,
    fileName
  );
}

function buildGithubCopilotEditorSurfaceContent(result: WorkspaceOpenSurfaceInput): string {
  const folders = [
    {
      name: 'workspace',
      path: result.workspaceRoot,
    },
    ...result.attachedRepos.map((repo) => ({
      name: repo.alias,
      path: repo.path,
    })),
  ];

  return `${JSON.stringify({ folders }, null, 2)}\n`;
}

async function buildEditorSurface(
  result: WorkspaceOpenSurfaceInput
): Promise<WorkspaceOpenEditorSurface | undefined> {
  if (result.agent !== GITHUB_COPILOT_WORKSPACE_OPEN_AGENT) {
    return undefined;
  }

  await ensureGitignoreEntries(result.workspaceRoot, [WORKSPACE_OPEN_GITIGNORE_ENTRY]);

  const editorSurface: WorkspaceOpenEditorSurface = {
    kind: 'vscode-workspace',
    path: getGithubCopilotEditorSurfacePath(result),
    content: buildGithubCopilotEditorSurfaceContent(result),
  };
  await FileSystemUtils.writeFile(editorSurface.path, editorSurface.content);

  return editorSurface;
}

async function buildInstructionSurface(result: WorkspaceOpenSurfaceInput): Promise<WorkspaceOpenSurface> {
  const adapter = resolveWorkspaceOpenAdapter(result.agent);

  const command = generateCommand(buildWorkspaceOpenCommandContent({
    ...result,
  }), adapter);

  const instructionSurface = {
    path: command.path,
    content: command.fileContent,
  };

  if (result.agent === GITHUB_COPILOT_WORKSPACE_OPEN_AGENT) {
    await FileSystemUtils.writeFile(
      resolveWorkspaceOpenSurfacePath(result.workspaceRoot, instructionSurface.path),
      instructionSurface.content
    );
  }

  return instructionSurface;
}

function mapResolvedRepos(
  resolvedRepos: ResolvedWorkspaceRepo[],
  workspaceMetadata: WorkspaceMetadata
): WorkspaceOpenAttachedRepo[] {
  return resolvedRepos.map((repo) => ({
    alias: repo.alias,
    path: repo.resolvedPath,
    ...getWorkspaceRepoGuidance(workspaceMetadata.repos[repo.alias]),
  }));
}

async function buildRegisteredRepoInventory(
  workspaceRoot: string,
  workspaceMetadata: WorkspaceMetadata
): Promise<WorkspaceOpenRegisteredRepo[]> {
  const aliases = Object.keys(workspaceMetadata.repos).sort((left, right) => left.localeCompare(right));
  const repoResolution = await resolveWorkspaceRepoTargets(workspaceRoot, aliases);
  const resolvedByAlias = new Map(
    repoResolution.resolvedRepos.map((repo) => [repo.alias, repo])
  );
  const issueByAlias = new Map(
    repoResolution.issues.map((issue) => [issue.alias, issue])
  );

  return aliases.map((alias) => {
    const guidance = getWorkspaceRepoGuidance(workspaceMetadata.repos[alias]);
    const resolved = resolvedByAlias.get(alias);

    if (resolved) {
      return {
        alias,
        path: resolved.resolvedPath,
        status: 'ready' as const,
        ...guidance,
      };
    }

    const issue = issueByAlias.get(alias);
    return {
      alias,
      path: issue?.resolvedPath ?? issue?.storedPath ?? null,
      status: (issue?.code ?? 'missing-local-path') as WorkspaceOpenRegisteredRepo['status'],
      note: issue?.message,
      ...guidance,
    };
  });
}

export function buildWorkspaceOpenLaunchPrompt(result: WorkspaceOpenResult): string {
  return buildWorkspaceOpenBody({
    workspaceRoot: result.workspaceRoot,
    mode: result.mode,
    agent: result.agent,
    change: result.change,
    attachedRepos: result.attachedRepos,
    registeredRepos: result.registeredRepos,
    availableChanges: result.availableChanges,
  });
}

export async function openWorkspace(options: WorkspaceOpenOptions = {}): Promise<WorkspaceOpenResult> {
  const workspaceRoot = FileSystemUtils.canonicalizeExistingPath(
    await resolveWorkspaceRoot(options.cwd ?? process.cwd())
  );
  const agent = options.agent?.trim()
    ? normalizeWorkspaceOpenAgent(options.agent)
    : await resolvePreferredWorkspaceOpenAgent(workspaceRoot);
  const workspaceMetadata = await readWorkspaceMetadata(workspaceRoot);
  const registeredRepos = await buildRegisteredRepoInventory(workspaceRoot, workspaceMetadata);
  const availableChanges = await listAvailableWorkspaceChanges(workspaceRoot);

  if (!options.change) {
    const attachedRepos = registeredRepos
      .filter((repo): repo is WorkspaceOpenRegisteredRepo & { path: string; status: 'ready' } => (
        repo.status === 'ready' && repo.path !== null
      ))
      .map((repo) => ({
        alias: repo.alias,
        path: repo.path,
        ...(repo.owner ? { owner: repo.owner } : {}),
        ...(repo.handoff ? { handoff: repo.handoff } : {}),
      }));
    const planningResult = {
      workspaceRoot,
      mode: 'workspace-root' as const,
      agent,
      change: null,
      attachedRepos,
      registeredRepos,
      availableChanges,
    };
    const instructionSurface = await buildInstructionSurface(planningResult);
    const editorSurface = await buildEditorSurface(planningResult);

    return {
      ...planningResult,
      instructionSurface,
      ...(editorSurface ? { editorSurface } : {}),
    };
  }

  const change = await resolveWorkspaceChange(workspaceRoot, options.change);
  const repoResolution = await resolveWorkspaceRepoTargets(workspaceRoot, change.targets);

  if (repoResolution.issues.length > 0) {
    throw buildRepoResolutionError(change.id, repoResolution.issues);
  }

  const changeScopedResult = {
    workspaceRoot,
    mode: 'change-scoped' as const,
    agent,
    change: {
      id: change.id,
      path: change.path,
    },
    attachedRepos: mapResolvedRepos(repoResolution.resolvedRepos, workspaceMetadata),
    registeredRepos,
    availableChanges,
  };
  const instructionSurface = await buildInstructionSurface(changeScopedResult);
  const editorSurface = await buildEditorSurface(changeScopedResult);

  return {
    ...changeScopedResult,
    instructionSurface,
    ...(editorSurface ? { editorSurface } : {}),
  };
}
