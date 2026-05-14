import * as fs from 'node:fs';
import * as path from 'node:path';
import { getSchemaDir, resolveSchema } from './resolver.js';
import { ArtifactGraph } from './graph.js';
import { detectCompleted } from './state.js';
import { resolveArtifactOutputs } from './outputs.js';
import { readChangeMetadata, resolveSchemaForChange } from '../../utils/change-metadata.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { readProjectConfig, validateConfigRules } from '../project-config.js';
import type { PlanningHome } from '../planning-home.js';
import type { Artifact, CompletedSet } from './types.js';

// Session-level cache for validation warnings (avoid repeating same warnings)
const shownWarnings = new Set<string>();

/**
 * Error thrown when loading a template fails.
 */
export class TemplateLoadError extends Error {
  constructor(
    message: string,
    public readonly templatePath: string
  ) {
    super(message);
    this.name = 'TemplateLoadError';
  }
}

/**
 * Change context containing graph, completion state, and metadata.
 */
export interface ChangeContext {
  /** The artifact dependency graph */
  graph: ArtifactGraph;
  /** Set of completed artifact IDs */
  completed: CompletedSet;
  /** Schema name being used */
  schemaName: string;
  /** Change name */
  changeName: string;
  /** Path to the change directory */
  changeDir: string;
  /** Project root directory */
  projectRoot: string;
  /** Resolved planning home for this change */
  planningHome?: PlanningHome;
}

export interface LoadChangeContextOptions {
  changeDir?: string;
  planningHome?: PlanningHome;
}

/**
 * Enriched instructions for creating an artifact.
 */
export interface ArtifactInstructions {
  /** Change name */
  changeName: string;
  /** Artifact ID */
  artifactId: string;
  /** Schema name */
  schemaName: string;
  /** Full path to change directory */
  changeDir: string;
  /** Resolved planning home for this change */
  planningHome?: PlanningHomeSummary;
  /** Output path pattern (e.g., "proposal.md") */
  outputPath: string;
  /** Absolute output path or glob pattern resolved under the change directory */
  resolvedOutputPath: string;
  /** Existing concrete output files for this artifact */
  existingOutputPaths: string[];
  /** Artifact description */
  description: string;
  /** Guidance on how to create this artifact (from schema instruction field) */
  instruction: string | undefined;
  /** Project context from config (constraints/background for AI, not to be included in output) */
  context: string | undefined;
  /** Artifact-specific rules from config (constraints for AI, not to be included in output) */
  rules: string[] | undefined;
  /** Template content (structure to follow - this IS the output format) */
  template: string;
  /** Dependencies with completion status and paths */
  dependencies: DependencyInfo[];
  /** Artifacts that become available after completing this one */
  unlocks: string[];
}

/**
 * Dependency information including path and description.
 */
export interface DependencyInfo {
  /** Artifact ID */
  id: string;
  /** Whether the dependency is completed */
  done: boolean;
  /** Relative output path of the dependency (e.g., "proposal.md") */
  path: string;
  /** Description of the dependency artifact */
  description: string;
}

/**
 * Status of a single artifact in the workflow.
 */
export interface ArtifactStatus {
  /** Artifact ID */
  id: string;
  /** Output path pattern */
  outputPath: string;
  /** Status: done, ready, or blocked */
  status: 'done' | 'ready' | 'blocked';
  /** Missing dependencies (only for blocked) */
  missingDeps?: string[];
}

/**
 * Formatted change status.
 */
export interface ChangeStatus {
  /** Change name */
  changeName: string;
  /** Schema name */
  schemaName: string;
  /** Resolved planning home for this change */
  planningHome?: PlanningHomeSummary;
  /** Full path to the change root */
  changeRoot: string;
  /** Absolute artifact path details keyed by artifact ID */
  artifactPaths: Record<string, ArtifactPathSummary>;
  /** Workspace affected-area summary, when available */
  affectedAreas?: AffectedAreasSummary;
  /** Plain-language next steps for users and agents */
  nextSteps: string[];
  /** Machine-readable action constraints for agents */
  actionContext: ActionContext;
  /** Whether all artifacts are complete */
  isComplete: boolean;
  /** Artifact IDs required before apply phase (from schema's apply.requires) */
  applyRequires: string[];
  /** Status of each artifact */
  artifacts: ArtifactStatus[];
}

export interface ArtifactPathSummary {
  outputPath: string;
  resolvedOutputPath: string;
  existingOutputPaths: string[];
}

export interface PlanningHomeSummary {
  kind: 'repo' | 'workspace';
  root: string;
  changesDir: string;
  defaultSchema: string;
  workspaceName?: string;
}

export interface AffectedAreasSummary {
  known: string[];
  unresolved: boolean;
  invalid: string[];
}

export interface ActionContext {
  mode: 'repo-local' | 'workspace-planning';
  sourceOfTruth: 'repo' | 'workspace';
  planningArtifacts: string[];
  linkedContext: Array<{ name: string }>;
  allowedEditRoots: string[];
  requiresAffectedAreaSelection: boolean;
  constraints: string[];
}

/**
 * Loads a template from a schema's templates directory.
 *
 * @param schemaName - Schema name (e.g., "spec-driven")
 * @param templatePath - Relative path within the templates directory (e.g., "proposal.md")
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The template content
 * @throws TemplateLoadError if the template cannot be loaded
 */
export function loadTemplate(
  schemaName: string,
  templatePath: string,
  projectRoot?: string
): string {
  const schemaDir = getSchemaDir(schemaName, projectRoot);
  if (!schemaDir) {
    throw new TemplateLoadError(
      `Schema '${schemaName}' not found`,
      templatePath
    );
  }

  const templatePathOnDisk = path.join(schemaDir, 'templates', templatePath);

  if (!fs.existsSync(templatePathOnDisk)) {
    throw new TemplateLoadError(
      `Template not found: ${templatePathOnDisk}`,
      templatePathOnDisk
    );
  }

  const fullPath = FileSystemUtils.canonicalizeExistingPath(templatePathOnDisk);

  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new TemplateLoadError(
      `Failed to read template: ${ioError.message}`,
      fullPath
    );
  }
}

/**
 * Loads change context combining graph and completion state.
 *
 * Schema resolution order:
 * 1. Explicit schemaName parameter (if provided)
 * 2. Schema from .openspec.yaml metadata (if exists in change directory)
 * 3. Default 'spec-driven'
 *
 * @param projectRoot - Project root directory
 * @param changeName - Change name
 * @param schemaName - Optional schema name override. If not provided, auto-detected from metadata.
 * @returns Change context with graph, completed set, and metadata
 */
export function loadChangeContext(
  projectRoot: string,
  changeName: string,
  schemaName?: string,
  options: LoadChangeContextOptions = {}
): ChangeContext {
  const changeDir = FileSystemUtils.canonicalizeExistingPath(
    options.changeDir ?? path.join(projectRoot, 'openspec', 'changes', changeName)
  );

  // Resolve schema: explicit > metadata > default
  const resolvedSchemaName = resolveSchemaForChange(changeDir, schemaName, projectRoot);

  const schema = resolveSchema(resolvedSchemaName, projectRoot);
  const graph = ArtifactGraph.fromSchema(schema);
  const completed = detectCompleted(graph, changeDir);

  return {
    graph,
    completed,
    schemaName: resolvedSchemaName,
    changeName,
    changeDir,
    projectRoot,
    ...(options.planningHome ? { planningHome: options.planningHome } : {}),
  };
}

/**
 * Generates enriched instructions for creating an artifact.
 *
 * Instruction injection order:
 * 1. <context> - Project context from config (if present)
 * 2. <rules> - Artifact-specific rules from config (if present)
 * 3. <template> - Schema's template content
 *
 * @param context - Change context
 * @param artifactId - Artifact ID to generate instructions for
 * @param projectRoot - Project root directory (for reading config)
 * @returns Enriched artifact instructions
 * @throws Error if artifact not found
 */
export function generateInstructions(
  context: ChangeContext,
  artifactId: string,
  projectRoot?: string
): ArtifactInstructions {
  const artifact = context.graph.getArtifact(artifactId);
  if (!artifact) {
    throw new Error(`Artifact '${artifactId}' not found in schema '${context.schemaName}'`);
  }

  const templateContent = loadTemplate(context.schemaName, artifact.template, context.projectRoot);
  const dependencies = getDependencyInfo(artifact, context.graph, context.completed);
  const unlocks = getUnlockedArtifacts(context.graph, artifactId);

  // Use projectRoot from context if not explicitly provided
  const effectiveProjectRoot = projectRoot ?? context.projectRoot;

  // Try to read project config for context and rules
  let projectConfig = null;
  if (effectiveProjectRoot) {
    try {
      projectConfig = readProjectConfig(effectiveProjectRoot);
    } catch {
      // If config read fails, continue without config
    }
  }

  // Validate rules artifact IDs if config has rules (only once per session)
  if (projectConfig?.rules) {
    const validArtifactIds = new Set(context.graph.getAllArtifacts().map((a) => a.id));
    const warnings = validateConfigRules(
      projectConfig.rules,
      validArtifactIds,
      context.schemaName
    );

    // Show each unique warning only once per session
    for (const warning of warnings) {
      if (!shownWarnings.has(warning)) {
        console.warn(warning);
        shownWarnings.add(warning);
      }
    }
  }

  // Extract context and rules as separate fields (not prepended to template)
  const configContext = projectConfig?.context?.trim() || undefined;
  const rulesForArtifact = projectConfig?.rules?.[artifactId];
  const configRules = rulesForArtifact && rulesForArtifact.length > 0 ? rulesForArtifact : undefined;

  return {
    changeName: context.changeName,
    artifactId: artifact.id,
    schemaName: context.schemaName,
    changeDir: context.changeDir,
    planningHome: summarizePlanningHome(context.planningHome),
    outputPath: artifact.generates,
    resolvedOutputPath: path.join(context.changeDir, artifact.generates),
    existingOutputPaths: resolveArtifactOutputs(context.changeDir, artifact.generates),
    description: artifact.description,
    instruction: artifact.instruction,
    context: configContext,
    rules: configRules,
    template: templateContent,
    dependencies,
    unlocks,
  };
}

/**
 * Gets dependency info including paths and descriptions.
 */
function getDependencyInfo(
  artifact: Artifact,
  graph: ArtifactGraph,
  completed: CompletedSet
): DependencyInfo[] {
  return artifact.requires.map(id => {
    const depArtifact = graph.getArtifact(id);
    return {
      id,
      done: completed.has(id),
      path: depArtifact?.generates ?? id,
      description: depArtifact?.description ?? '',
    };
  });
}

/**
 * Gets artifacts that become available after completing the given artifact.
 */
function getUnlockedArtifacts(graph: ArtifactGraph, artifactId: string): string[] {
  const unlocks: string[] = [];

  for (const artifact of graph.getAllArtifacts()) {
    if (artifact.requires.includes(artifactId)) {
      unlocks.push(artifact.id);
    }
  }

  return unlocks.sort();
}

function summarizePlanningHome(planningHome: PlanningHome | undefined): PlanningHomeSummary | undefined {
  if (!planningHome) {
    return undefined;
  }

  return {
    kind: planningHome.kind,
    root: planningHome.root,
    changesDir: planningHome.changesDir,
    defaultSchema: planningHome.defaultSchema,
    ...(planningHome.workspace ? { workspaceName: planningHome.workspace.name } : {}),
  };
}

function getWorkspaceSpecAreaSegments(context: ChangeContext): string[] {
  if (context.planningHome?.kind !== 'workspace') {
    return [];
  }

  const specArtifact = context.graph.getArtifact('specs');
  if (!specArtifact) {
    return [];
  }

  return resolveArtifactOutputs(context.changeDir, specArtifact.generates)
    .map((outputPath) => path.relative(path.join(context.changeDir, 'specs'), outputPath))
    .filter((relativePath) => relativePath.length > 0 && !relativePath.startsWith('..'))
    .map((relativePath) => relativePath.split(path.sep)[0])
    .filter((areaName) => areaName.length > 0);
}

function getAffectedAreasSummary(context: ChangeContext): AffectedAreasSummary | undefined {
  if (context.planningHome?.kind !== 'workspace') {
    return undefined;
  }

  const metadata = readChangeMetadata(context.changeDir, context.projectRoot);
  const known = Array.from(
    new Set([...(metadata?.affected_areas ?? []), ...getWorkspaceSpecAreaSegments(context)])
  ).sort((a, b) => a.localeCompare(b));
  const validAreas = new Set(context.planningHome.workspace?.links ?? []);
  const invalid = known.filter((areaName) => validAreas.size > 0 && !validAreas.has(areaName));

  return {
    known,
    unresolved: known.length === 0,
    invalid,
  };
}

function buildActionContext(context: ChangeContext, artifactIds: string[]): ActionContext {
  if (context.planningHome?.kind === 'workspace') {
    return {
      mode: 'workspace-planning',
      sourceOfTruth: 'workspace',
      planningArtifacts: artifactIds,
      linkedContext: (context.planningHome.workspace?.links ?? []).map((name) => ({ name })),
      allowedEditRoots: [],
      requiresAffectedAreaSelection: true,
      constraints: [
        'Use workspace-level planning artifacts as the source of truth.',
        'Treat linked repos and folders as exploration context until an affected area is selected.',
        'Do not make implementation edits without an explicit allowed edit root.',
      ],
    };
  }

  return {
    mode: 'repo-local',
    sourceOfTruth: 'repo',
    planningArtifacts: artifactIds,
    linkedContext: [],
    allowedEditRoots: [context.projectRoot],
    requiresAffectedAreaSelection: false,
    constraints: ['Repo-local change artifacts and implementation edits are scoped to this project.'],
  };
}

function buildNextSteps(
  context: ChangeContext,
  artifactStatuses: ArtifactStatus[],
  affectedAreas: AffectedAreasSummary | undefined
): string[] {
  const readyArtifact = artifactStatuses.find((artifact) => artifact.status === 'ready');
  const steps: string[] = [];

  if (readyArtifact) {
    steps.push(
      `Run openspec instructions ${readyArtifact.id} --change "${context.changeName}" --json before writing that artifact.`
    );
  } else if (context.graph.isComplete(context.completed)) {
    steps.push('All planning artifacts are complete; review tasks before implementation.');
  }

  if (context.planningHome?.kind === 'workspace') {
    if (affectedAreas?.unresolved) {
      steps.push('Identify affected areas in workspace specs or coordination tasks as planning continues.');
    }
    steps.push('Select an affected area and allowed edit root before implementation edits.');
  }

  return steps;
}

/**
 * Formats the status of all artifacts in a change.
 *
 * @param context - Change context
 * @returns Formatted change status
 */
export function formatChangeStatus(context: ChangeContext): ChangeStatus {
  // Load schema to get apply phase configuration
  const schema = resolveSchema(context.schemaName, context.projectRoot);
  const applyRequires = schema.apply?.requires ?? schema.artifacts.map(a => a.id);

  const artifacts = context.graph.getAllArtifacts();
  const ready = new Set(context.graph.getNextArtifacts(context.completed));
  const blocked = context.graph.getBlocked(context.completed);

  const artifactPaths: Record<string, ArtifactPathSummary> = {};
  const artifactStatuses: ArtifactStatus[] = artifacts.map(artifact => {
    artifactPaths[artifact.id] = {
      outputPath: artifact.generates,
      resolvedOutputPath: path.join(context.changeDir, artifact.generates),
      existingOutputPaths: resolveArtifactOutputs(context.changeDir, artifact.generates),
    };

    if (context.completed.has(artifact.id)) {
      return {
        id: artifact.id,
        outputPath: artifact.generates,
        status: 'done' as const,
      };
    }

    if (ready.has(artifact.id)) {
      return {
        id: artifact.id,
        outputPath: artifact.generates,
        status: 'ready' as const,
      };
    }

    return {
      id: artifact.id,
      outputPath: artifact.generates,
      status: 'blocked' as const,
      missingDeps: blocked[artifact.id] ?? [],
    };
  });

  // Sort by build order for consistent output
  const buildOrder = context.graph.getBuildOrder();
  const orderMap = new Map(buildOrder.map((id, idx) => [id, idx]));
  artifactStatuses.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  const affectedAreas = getAffectedAreasSummary(context);

  return {
    changeName: context.changeName,
    schemaName: context.schemaName,
    planningHome: summarizePlanningHome(context.planningHome),
    changeRoot: context.changeDir,
    artifactPaths,
    affectedAreas,
    isComplete: context.graph.isComplete(context.completed),
    applyRequires,
    nextSteps: buildNextSteps(context, artifactStatuses, affectedAreas),
    actionContext: buildActionContext(context, artifactStatuses.map((artifact) => artifact.id)),
    artifacts: artifactStatuses,
  };
}
