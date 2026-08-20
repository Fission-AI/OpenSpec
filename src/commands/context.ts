/**
 * `openspec context` (slice 4.1): the working set a root's declarations
 * describe, as an agent brief (JSON), a human listing, or an editor
 * view (`--code-workspace`). Assembly is presentation over the Phase 3
 * relationship data; doctor is the health surface. The only write this
 * command can perform is the explicitly requested workspace file.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command, Option } from 'commander';

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

async function gatherWorkingSet(
  root: ResolvedOpenSpecRoot
): Promise<{ workingSet: WorkingSet; declaredReferenceCount: number }> {
  const data = await gatherRelationshipData(root);

  // Reuse the 3.6 composition for member classification; the
  // doctor-only wrong-turn detections and store facts are deliberately
  // absent — doctor is the health surface.
  const health = inspectRelationships({
    root,
    rootHealthy: data.rootInspection.healthy,
    rootStatus: data.rootInspection.diagnostics,
    referenceEntries: data.referenceEntries,
    registryUnreadable: data.registrySnapshot.unreadable,
  });

  return {
    workingSet: assembleWorkingSet({
      root,
      referenceEntries: data.referenceEntries,
      topLevelStatus: health.status,
    }),
    declaredReferenceCount: data.projectConfig?.references?.length ?? 0,
  };
}

function memberLine(member: WorkingSetMember): string {
  return `  ${member.id}  ${member.path}`;
}

function printHumanWorkingSet(workingSet: WorkingSet, declaredReferenceCount: number): void {
  const rootLabel = workingSet.root.store_id ?? path.basename(workingSet.root.path);
  console.log(`Working context for ${rootLabel} (${workingSet.root.path})`);
  console.log('');
  console.log('OpenSpec root');
  console.log(`  ${rootLabel}  ${workingSet.root.path}`);

  const availableStores = workingSet.members.filter(
    (member) => member.role === 'referenced_store' && isAvailableMember(member)
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

  if (workingSet.members.length === 0) {
    console.log('');
    // Self-references are silently omitted from the index; an
    // emptied-by-omission set must not claim nothing was declared.
    console.log(
      declaredReferenceCount > 0
        ? 'Declared references all resolve to this root; the working set is this root alone.'
        : 'No references declared; the working set is this root alone.'
    );
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

  const available = workingSet.members.filter(isAvailableMember).length;
  const skipped = workingSet.members
    .filter((member) => !isAvailableMember(member))
    .map((member) => member.id);
  const summary =
    skipped.length > 0
      ? `Wrote ${resolved} (${available + 1} folders; not available: ${skipped.join(', ')})`
      : `Wrote ${resolved} (${available + 1} folders)`;
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
    .addOption(
      new Option('--store-path <path>', 'Removed; register the store and use --store').hideHelp()
    )
    .option('--json', 'Output the agent brief as JSON')
    .option('--code-workspace <path>', 'Also write a VS Code workspace file for the set')
    .option('--force', 'Overwrite an existing --code-workspace file')
    .action(
      async (options: {
        store?: string;
        storePath?: string;
        json?: boolean;
        codeWorkspace?: string;
        force?: boolean;
      }) => {
        try {
          const root = await resolveRootForCommand(
            { store: options.store, storePath: options.storePath },
            { json: options.json, failurePayload: FAILURE_PAYLOAD, allowImplicitRoot: false }
          );
          if (!root) {
            return;
          }

          const { workingSet, declaredReferenceCount } = await gatherWorkingSet(root);

          if (options.json) {
            // The write runs FIRST: a write failure must leave stdout
            // holding exactly one JSON document (the failure payload).
            if (options.codeWorkspace) {
              writeCodeWorkspace(workingSet, options.codeWorkspace, options.force === true);
            }
            printJson(workingSet);
          } else {
            printHumanWorkingSet(workingSet, declaredReferenceCount);
            if (options.codeWorkspace) {
              writeCodeWorkspace(workingSet, options.codeWorkspace, options.force === true);
            }
          }
        } catch (error) {
          emitFailure(options.json, FAILURE_PAYLOAD, error, 'context_failed');
        }
      }
    );
}
