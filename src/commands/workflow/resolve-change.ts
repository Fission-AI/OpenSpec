/**
 * Resolve-Change Command
 *
 * Helper for AI skills and scripts. Resolves the "which change are we working
 * on?" question without forcing every caller to reimplement listing + filtering
 * + interactive picking.
 *
 * Modes:
 *   - No name, no `--auto`: emit JSON listing every active change.
 *   - `<name>` supplied: verify it exists (active, not archived); echo the name
 *     on success.
 *   - `--auto`: succeed iff exactly one active change exists; echo its name.
 *     Useful in scripts that should run when the workspace is unambiguous.
 *
 * Exit codes:
 *   0 success (echo or list)
 *   1 no active changes (only with --auto)
 *   2 named change not found
 *   3 multiple active changes (only with --auto)
 */

import * as fs from 'fs';
import path from 'path';
import { resolveCurrentPlanningHomeSync } from '../../core/planning-home.js';
import { validateChangeName } from '../../utils/change-utils.js';
import { getAvailableChanges } from './shared.js';

export interface ResolveChangeOptions {
  auto?: boolean;
  json?: boolean;
}

interface ResolvedChange {
  name: string;
  path: string;
}

async function listActiveChanges(projectRoot: string, changesDir: string): Promise<ResolvedChange[]> {
  const names = await getAvailableChanges(projectRoot, changesDir);
  const resolved: ResolvedChange[] = [];
  for (const name of names) {
    const dir = path.join(changesDir, name);
    try {
      if (fs.statSync(dir).isDirectory()) {
        resolved.push({ name, path: dir });
      }
    } catch {
      // Skip entries that disappeared between readdir and stat.
    }
  }
  return resolved;
}

/**
 * Exits with `code`. Tests and callers can intercept via process.exitCode if
 * they prefer; we use process.exit so the CLI matches existing behavior.
 */
function fail(message: string, code: number): never {
  console.error(message);
  process.exit(code);
}

export async function resolveChangeCommand(
  name: string | undefined,
  options: ResolveChangeOptions
): Promise<void> {
  const planningHome = resolveCurrentPlanningHomeSync();
  const projectRoot = planningHome.root;
  const changesDir = planningHome.changesDir;

  const changes = await listActiveChanges(projectRoot, changesDir);

  // Named lookup: validate the name and confirm it is active.
  if (name) {
    const nameValidation = validateChangeName(name);
    if (!nameValidation.valid) {
      fail(`Invalid change name '${name}': ${nameValidation.error}`, 2);
    }

    const match = changes.find((c) => c.name === name);
    if (!match) {
      const available = changes.map((c) => c.name).join(', ') || '(none)';
      fail(
        `Change '${name}' is not active. Active changes: ${available}`,
        2
      );
    }

    if (options.json) {
      console.log(JSON.stringify({ name: match.name, path: match.path }, null, 2));
    } else {
      console.log(match.name);
    }
    return;
  }

  // --auto: succeed only if exactly one active change exists.
  if (options.auto) {
    if (changes.length === 0) {
      fail('No active changes.', 1);
    }
    if (changes.length > 1) {
      const list = changes.map((c) => c.name).join(', ');
      fail(
        `Multiple active changes (${changes.length}): ${list}. Pass a name or drop --auto.`,
        3
      );
    }
    const only = changes[0];
    if (options.json) {
      console.log(JSON.stringify({ name: only.name, path: only.path }, null, 2));
    } else {
      console.log(only.name);
    }
    return;
  }

  // Default: emit JSON listing.
  console.log(JSON.stringify({ changes }, null, 2));
}
