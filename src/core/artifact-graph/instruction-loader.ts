import * as fs from 'node:fs';
import * as path from 'node:path';
import { getSchemaDir, resolveSchema } from './resolver.js';
import { ArtifactGraph } from './graph.js';
import { detectCompleted } from './state.js';
import type { Artifact, CompletedSet } from './types.js';

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
  /** Output path pattern (e.g., "proposal.md") */
  outputPath: string;
  /** Artifact description */
  description: string;
  /** Template content */
  template: string;
  /** Dependencies with completion status */
  dependencies: DependencyStatus[];
  /** Artifacts that become available after completing this one */
  unlocks: string[];
}

/**
 * Dependency status information.
 */
export interface DependencyStatus {
  /** Artifact ID */
  id: string;
  /** Whether the dependency is completed */
  done: boolean;
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
  /** Whether all artifacts are complete */
  isComplete: boolean;
  /** Status of each artifact */
  artifacts: ArtifactStatus[];
}

/**
 * Loads a template from a schema's templates directory.
 *
 * @param schemaName - Schema name (e.g., "spec-driven")
 * @param templatePath - Relative path within the templates directory (e.g., "proposal.md")
 * @returns The template content
 * @throws TemplateLoadError if the template cannot be loaded
 */
export function loadTemplate(schemaName: string, templatePath: string): string {
  const schemaDir = getSchemaDir(schemaName);
  if (!schemaDir) {
    throw new TemplateLoadError(
      `Schema '${schemaName}' not found`,
      templatePath
    );
  }

  const fullPath = path.join(schemaDir, 'templates', templatePath);

  if (!fs.existsSync(fullPath)) {
    throw new TemplateLoadError(
      `Template not found: ${fullPath}`,
      fullPath
    );
  }

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
 * @param projectRoot - Project root directory
 * @param changeName - Change name
 * @param schemaName - Optional schema name (defaults to "spec-driven")
 * @returns Change context with graph, completed set, and metadata
 */
export function loadChangeContext(
  projectRoot: string,
  changeName: string,
  schemaName: string = 'spec-driven'
): ChangeContext {
  const schema = resolveSchema(schemaName);
  const graph = ArtifactGraph.fromSchema(schema);
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);
  const completed = detectCompleted(graph, changeDir);

  return {
    graph,
    completed,
    schemaName,
    changeName,
    changeDir,
  };
}

/**
 * Generates enriched instructions for creating an artifact.
 *
 * @param context - Change context
 * @param artifactId - Artifact ID to generate instructions for
 * @returns Enriched artifact instructions
 * @throws Error if artifact not found
 */
export function generateInstructions(
  context: ChangeContext,
  artifactId: string
): ArtifactInstructions {
  const artifact = context.graph.getArtifact(artifactId);
  if (!artifact) {
    throw new Error(`Artifact '${artifactId}' not found in schema '${context.schemaName}'`);
  }

  const template = loadTemplate(context.schemaName, artifact.template);
  const dependencies = getDependencyStatus(artifact, context.completed);
  const unlocks = getUnlockedArtifacts(context.graph, artifactId);

  return {
    changeName: context.changeName,
    artifactId: artifact.id,
    schemaName: context.schemaName,
    outputPath: artifact.generates,
    description: artifact.description,
    template,
    dependencies,
    unlocks,
  };
}

/**
 * Gets dependency status for an artifact.
 */
function getDependencyStatus(
  artifact: Artifact,
  completed: CompletedSet
): DependencyStatus[] {
  return artifact.requires.map(id => ({
    id,
    done: completed.has(id),
  }));
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

/**
 * Formats the status of all artifacts in a change.
 *
 * @param context - Change context
 * @returns Formatted change status
 */
export function formatChangeStatus(context: ChangeContext): ChangeStatus {
  const artifacts = context.graph.getAllArtifacts();
  const ready = new Set(context.graph.getNextArtifacts(context.completed));
  const blocked = context.graph.getBlocked(context.completed);

  const artifactStatuses: ArtifactStatus[] = artifacts.map(artifact => {
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

  return {
    changeName: context.changeName,
    schemaName: context.schemaName,
    isComplete: context.graph.isComplete(context.completed),
    artifacts: artifactStatuses,
  };
}
