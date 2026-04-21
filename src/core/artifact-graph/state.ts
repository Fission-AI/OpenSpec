import * as fs from 'node:fs';
import type { CompletedSet } from './types.js';
import type { ArtifactGraph } from './graph.js';
import { artifactOutputExists } from './outputs.js';
import type { RequireSpecDeltas } from '../project-config.js';

export interface DetectCompletedOptions {
  requireSpecDeltas?: RequireSpecDeltas;
}

/**
 * Detects which artifacts are completed by checking file existence in the change directory.
 * When requireSpecDeltas is 'warn' or false, the 'specs' artifact is synthetically
 * marked complete even if no spec files exist, unblocking downstream artifacts.
 *
 * @param graph - The artifact graph to check
 * @param changeDir - The change directory to scan for files
 * @param options - Optional config for synthetic completion
 * @returns Set of artifact IDs whose generated files exist
 */
export function detectCompleted(graph: ArtifactGraph, changeDir: string, options?: DetectCompletedOptions): CompletedSet {
  const completed = new Set<string>();

  // Handle missing change directory gracefully
  if (!fs.existsSync(changeDir)) {
    return completed;
  }

  for (const artifact of graph.getAllArtifacts()) {
    if (isArtifactComplete(artifact.generates, changeDir)) {
      completed.add(artifact.id);
    }
  }

  // Synthetically mark 'specs' as complete when spec deltas are not required
  const requireSpecDeltas = options?.requireSpecDeltas;
  if (!completed.has('specs') &&
      requireSpecDeltas !== undefined &&
      requireSpecDeltas !== 'error') {
    const specsArtifact = graph.getAllArtifacts().find(a => a.id === 'specs');
    if (specsArtifact) {
      completed.add('specs');
    }
  }

  return completed;
}

/**
 * Checks if an artifact is complete by checking if its generated file(s) exist.
 * Supports both simple paths and glob patterns.
 */
function isArtifactComplete(generates: string, changeDir: string): boolean {
  return artifactOutputExists(changeDir, generates);
}
