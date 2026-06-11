/**
 * `openspec context` (slice 4.1): the working set a root's declarations
 * describe, as an agent brief (JSON), a human listing, or an editor
 * view (`--code-workspace`). Assembly is presentation over the Phase 3
 * relationship data; doctor is the health surface. The only write this
 * command can perform is the explicitly requested workspace file.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';

import {
  resolveRootForCommand,
  type ResolvedOpenSpecRoot,
} from '../core/root-selection.js';
import { inspectRelationships } from '../core/relationship-health.js';
import {
  assembleWorkingSet,
  buildCodeWorkspaceJson,
  isAvailableMember,
  type WorkingSet,
  type WorkingSetMember,
} from '../core/working-set.js';
import { StoreError } from '../core/store/errors.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';
import { emitFailure, printJson } from './shared-output.js';
import { gatherRelationshipData } from './shared-gather.js';

const FAILURE_PAYLOAD = { root: null, members: [] };

async function gatherWorkingSet(root: ResolvedOpenSpecRoot): Promise<WorkingSet> {
  const data = await gatherRelationshipData(root);

  // A mapped path that no longer exists must not be presented as
  // available (and never written into an editor view) — "reported, not
  // guessed". Stat only the declared targets.
  let missingRepoPaths: Set<string> | undefined;
  if (data.effectiveTargets) {
    missingRepoPaths = new Set(
      data.effectiveTargets.repos
        .filter((entry) => entry.path !== undefined && !fs.existsSync(entry.path))
        .map((entry) => entry.id)
    );
  }

  // Reuse the 3.6 composition for member classification (unmapped,
  // stale, invalid); the doctor-only wrong-turn detections and store
  // facts are deliberately absent — doctor is the health surface.
  const health = inspectRelationships({
    root,
    rootHealthy: data.rootInspection.healthy,
    rootStatus: data.rootInspection.diagnostics,
    referenceEntries: data.referenceEntries,
    effectiveTargets: data.effectiveTargets,
    storeTargets: data.storeTargets,
    registryUnreadable: data.registrySnapshot.unreadable,
    ...(missingRepoPaths ? { missingRepoPaths } : {}),
    storeConfigPath: data.storeConfigPath,
  });

  return assembleWorkingSet({
    root,
    referenceEntries: data.referenceEntries,
    targets: health.targets,
    registryUnreadable: data.registrySnapshot.unreadable,
    ...(health.status[0] ? { registryUnreadableDiagnostic: health.status[0] } : {}),
  });
}

function memberLine(member: WorkingSetMember): string {
  return `  ${member.id}  ${member.path}`;
}

function printHumanWorkingSet(workingSet: WorkingSet): void {
  const rootLabel = workingSet.root.store_id ?? path.basename(workingSet.root.path);
  console.log(`Working context for ${rootLabel} (${workingSet.root.path})`);
  console.log('');
  console.log('OpenSpec root');
  console.log(`  ${rootLabel}  ${workingSet.root.path}`);

  const availableStores = workingSet.members.filter(
    (member) => member.role === 'referenced_store' && isAvailableMember(member)
  );
  const availableRepos = workingSet.members.filter(
    (member) => member.role === 'target_repo' && isAvailableMember(member)
  );
  const unavailable = workingSet.members.filter((member) => !isAvailableMember(member));

  if (availableStores.length > 0) {
    console.log('');
    console.log('Referenced stores');
    for (const member of availableStores) {
      console.log(memberLine(member));
      if (member.fetch) {
        console.log(`    Fetch: ${member.fetch}`);
      }
    }
  }

  if (availableRepos.length > 0) {
    console.log('');
    console.log('Target repos');
    for (const member of availableRepos) {
      console.log(memberLine(member));
    }
  }

  if (workingSet.members.length === 0) {
    console.log('');
    console.log('No references or targets declared; the working set is this root alone.');
  }

  if (unavailable.length > 0 || workingSet.status.length > 0) {
    console.log('');
    console.log('Not available on this machine');
    for (const member of unavailable) {
      if (member.status.length === 0) {
        console.log(`  - ${member.id}`);
        continue;
      }
      for (const diagnostic of member.status) {
        console.log(`  - ${member.id}: ${diagnostic.message}`);
        if (diagnostic.fix) {
          console.log(`    Fix: ${diagnostic.fix}`);
        }
      }
    }
    for (const diagnostic of workingSet.status) {
      console.log(`  Note: ${diagnostic.message}`);
      if (diagnostic.fix) {
        console.log(`  Fix: ${diagnostic.fix}`);
      }
    }
  }
}

function writeCodeWorkspace(
  workingSet: WorkingSet,
  outputPath: string,
  force: boolean
): void {
  const resolved = path.resolve(outputPath);
  if (fs.existsSync(resolved) && !force) {
    throw new StoreError(
      `Refusing to overwrite ${resolved}.`,
      'context_file_exists',
      {
        target: 'context.output',
        fix: `Pass --force to overwrite, or choose a different path.`,
      }
    );
  }
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent)) {
    throw new StoreError(
      `Output directory does not exist: ${parent}.`,
      'context_output_dir_missing',
      { target: 'context.output', fix: 'Create the directory first, or choose another path.' }
    );
  }

  const rootName = workingSet.root.store_id ?? path.basename(workingSet.root.path);
  fs.writeFileSync(resolved, buildCodeWorkspaceJson(workingSet, rootName));

  const written = 1 + workingSet.members.filter(isAvailableMember).length;
  const skipped = workingSet.members.length - (written - 1);
  const summary =
    skipped > 0
      ? `Wrote ${resolved} (${written} folders; ${skipped} member${skipped === 1 ? '' : 's'} not available, see above)`
      : `Wrote ${resolved} (${written} folders)`;
  // stderr keeps JSON stdout pure; for humans it reads inline.
  console.error(summary);
}

export function registerContextCommand(program: Command): void {
  const description =
    COMMAND_REGISTRY.find((entry) => entry.name === 'context')?.description ??
    'Print the working context for the resolved OpenSpec root';

  program
    .command('context')
    .description(description)
    .option('--store <id>', COMMON_FLAGS.store.description)
    .option('--json', 'Output the agent brief as JSON')
    .option('--code-workspace <path>', 'Also write a VS Code workspace file for the set')
    .option('--force', 'Overwrite an existing --code-workspace file')
    .action(
      async (options: {
        store?: string;
        json?: boolean;
        codeWorkspace?: string;
        force?: boolean;
      }) => {
        try {
          const root = await resolveRootForCommand(
            { store: options.store },
            { json: options.json, failurePayload: FAILURE_PAYLOAD, allowImplicitRoot: false }
          );
          if (!root) {
            return;
          }

          const workingSet = await gatherWorkingSet(root);

          if (options.json) {
            printJson(workingSet);
          } else {
            printHumanWorkingSet(workingSet);
          }

          if (options.codeWorkspace) {
            writeCodeWorkspace(workingSet, options.codeWorkspace, options.force === true);
          }
        } catch (error) {
          emitFailure(options.json, FAILURE_PAYLOAD, error, 'context_failed');
        }
      }
    );
}
