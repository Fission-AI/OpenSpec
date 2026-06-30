/**
 * Next-Artifact Command
 *
 * Returns the next artifact an agent should produce for a change, bundled with
 * the full instructions for that artifact. Combines `openspec status` and
 * `openspec instructions <artifact>` into one call so a skill can drive the
 * propose loop without re-reading state between every artifact.
 *
 * Output:
 *   { "done": true }                          - all artifacts complete
 *   { "done": false, "artifactId": "...",     - next ready artifact
 *     "outputPath": ..., "resolvedOutputPath": ..., "instruction": ...,
 *     "rules": ..., "context": ..., "template": ..., "dependencies": [...] }
 *
 * Exit codes:
 *   0 success (including done=true)
 *   2 missing --change / change not found
 *   3 no runnable artifact (every pending artifact is dependency-blocked)
 */

import ora from 'ora';
import {
  loadChangeContext,
  formatChangeStatus,
  generateInstructions,
  type ArtifactInstructions,
} from '../../core/artifact-graph/index.js';
import { getChangeDir, resolveCurrentPlanningHomeSync } from '../../core/planning-home.js';
import { validateChangeExists, validateSchemaExists } from './shared.js';

export interface NextArtifactOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

export type NextArtifactPayload =
  | { done: true }
  | (ArtifactInstructions & { done: false });

export async function nextArtifactCommand(options: NextArtifactOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Resolving next artifact...').start();

  try {
    const planningHome = resolveCurrentPlanningHomeSync();
    const projectRoot = planningHome.root;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      planningHome.changesDir
    );

    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const context = loadChangeContext(projectRoot, changeName, options.schema, {
      changeDir: getChangeDir(planningHome, changeName),
      planningHome,
    });

    const status = formatChangeStatus(context);

    if (status.isComplete) {
      spinner?.stop();
      emit({ done: true }, options);
      return;
    }

    // status.artifacts is already sorted by build order, so the first 'ready'
    // entry is the artifact the agent should generate next.
    const nextReady = status.artifacts.find((a) => a.status === 'ready');

    if (!nextReady) {
      spinner?.stop();
      // Not complete, but nothing is ready — every pending artifact is blocked
      // by a missing dependency. Surface this clearly; let the caller decide.
      const blocked = status.artifacts
        .filter((a) => a.status === 'blocked')
        .map((a) => `${a.id} (missing: ${a.missingDeps?.join(', ') ?? '?'})`)
        .join('; ');
      console.error(
        `No runnable artifact for change '${changeName}'. Pending but blocked: ${blocked}`
      );
      process.exit(3);
    }

    const instructions = generateInstructions(context, nextReady.id, projectRoot);
    spinner?.stop();

    emit({ done: false, ...instructions }, options);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

function emit(payload: NextArtifactPayload, options: NextArtifactOptions): void {
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (payload.done) {
    console.log('All artifacts complete.');
    return;
  }

  // Non-JSON: print a compact summary. Agents will use --json; humans get this
  // as a sanity check.
  console.log(`Next artifact: ${payload.artifactId}`);
  console.log(`Output: ${payload.resolvedOutputPath}`);
  if (payload.description) console.log(`Description: ${payload.description}`);
  console.log();
  console.log('Use --json for the full instructions payload.');
}
