/**
 * Standalone spec sync.
 *
 * `archive` does two separable jobs in one command: it folds a change's deltas
 * into `openspec/specs/`, and it declares the change finished by moving its
 * directory. Welding the two means the fold can only happen at the moment the
 * move happens - which, on a team that reviews before merging, is after the
 * pull request closes. So a CI check for "the specs match what shipped" has
 * nothing it can assert during review: every open PR has an unarchived change
 * by definition, and a check phrased as "is everything archived?" is red as its
 * resting state, from a change's first commit to its last (#1683).
 *
 * This module unwelds them, additively:
 *
 * - `openspec sync <change>` folds one change's deltas now, leaving the change
 *   where it is. `archive` still moves it later, and re-applying an already
 *   folded delta is a no-op the merge builder has supported all along (the
 *   "early-sync pattern" `specs-apply` names in ADDED, MODIFIED, REMOVED and
 *   RENAMED alike), so nothing about the archive step changes.
 * - `openspec sync --check` asserts `shipped => folded` over the working tree.
 *   A change that has not declared itself shipped passes for free, so green is
 *   the resting state and red means a real mistake. The predicate is a pure
 *   function of files on disk - no VCS history, no timing - so a pre-commit
 *   hook, a pre-push hook and CI can all run the same command and get the same
 *   verdict.
 *
 * Two things this deliberately does NOT do, both for the same reason - they
 * would turn an additive command into a second lifecycle:
 *
 * 1. **It never deletes a spec.** When a change's REMOVED entries take a
 *    capability's last requirement, `archive` retires the capability and
 *    deletes its main spec, gated on the author's `retire_capabilities` marker
 *    and wrapped in a displace-verify-delete dance that can roll back. Sync
 *    reports that case and points at `archive` instead of reimplementing the
 *    one irreversible operation in the system.
 * 2. **It never checks archived changes.** Once a change is archived its deltas
 *    are history, and later changes supersede them; re-applying a five-month-old
 *    delta on top of everything that came after it is not a drift check, it is
 *    a merge conflict waiting to be written back over current text. The checked
 *    set is exactly the active changes that declare `status: shipped`, which is
 *    bounded and drains itself as those changes archive.
 *
 * Credit: the diagnosis, the `shipped => folded` framing, and the argument that
 * a checker which reimplements the doer eventually disagrees with it are all
 * from Matan Bendix Shenhav's proposal in #1683.
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Validator } from './validation/validator.js';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import {
  emitStoreRootBanner,
  isRootSelectionError,
  resolveOpenSpecRoot,
  toRootOutput,
  withStoreFlag,
  isStoreSelectedRoot,
  type ResolvedOpenSpecRoot,
} from './root-selection.js';
import {
  findSpecUpdates,
  buildUpdatedSpec,
  writeUpdatedSpec,
  type SpecUpdate,
} from './specs-apply.js';
import { isRetirableSpec, listActiveChangeNames } from './archive.js';
import {
  readChangeStatus,
  writeChangeStatus,
  METADATA_FILENAME,
  type ChangeStatus,
} from '../utils/change-metadata.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { folderStyleNameProblem } from './id.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SyncOptions {
  /** Report what is unfolded and exit non-zero, without writing anything. */
  check?: boolean;
  /** Set `status: shipped` on the change before folding, in one working-tree diff. */
  ship?: boolean;
  /** Proceed past incomplete tasks without asking. */
  yes?: boolean;
  /** Commander sets this to false for `--no-validate`. */
  validate?: boolean;
  json?: boolean;
  store?: string;
  storePath?: string;
}

export interface SyncSpecReport {
  /** Capability id relative to the specs root, e.g. `billing/invoices`. */
  capability: string;
  /** True when re-applying this delta would still change the main spec. */
  pending: boolean;
  counts: { added: number; modified: number; removed: number; renamed: number };
}

export interface SyncChangeReport {
  change: string;
  status: ChangeStatus;
  /** True when every delta this change carries is already in the main specs. */
  folded: boolean;
  specs: SyncSpecReport[];
  warnings: string[];
  /**
   * Reasons this change cannot be folded by `sync` at all: a delta the merge
   * refuses, a retirement only `archive` can perform, or metadata whose
   * `status` could not be determined.
   */
  blockers: string[];
}

export interface SyncResult {
  /** True for `--check`: nothing was written. */
  checked: boolean;
  /** True when every examined change is folded and no change is blocked. */
  clean: boolean;
  changes: SyncChangeReport[];
  totals: { added: number; modified: number; removed: number; renamed: number };
}

/**
 * Carries the same `diagnostic` envelope RootSelectionError and StoreError do,
 * so the CLI's shared failure plumbing prints the `Fix:` line and JSON callers
 * get one status object - without this class joining their hierarchy.
 */
export class SyncBlockedError extends Error {
  readonly diagnostic: {
    severity: 'error';
    code: string;
    message: string;
    fix?: string;
  };

  constructor(code: string, message: string, fix?: string) {
    super(message);
    this.name = 'SyncBlockedError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...(fix ? { fix } : {}),
    };
  }
}

// -----------------------------------------------------------------------------
// Evaluation
// -----------------------------------------------------------------------------

interface PreparedSpec {
  update: SpecUpdate;
  rebuilt: string;
  counts: SyncSpecReport['counts'];
}

interface Evaluation {
  report: SyncChangeReport;
  /** Only the specs that still need writing. Empty when the change is folded. */
  writes: PreparedSpec[];
}

function sumCounts(counts: SyncSpecReport['counts']): number {
  return counts.added + counts.modified + counts.removed + counts.renamed;
}

/**
 * Decide whether a change's deltas are already in the main specs, by running the
 * merge builder and looking at how much it had to do.
 *
 * "Folded" is `buildUpdatedSpec` applying zero operations - the *same* predicate
 * `archive` uses to decide it has nothing to write ("Every operation was already
 * synced: rewriting the file would only churn normalization differences into
 * it"). Deliberately not a byte-comparison against the rebuilt output: the
 * rebuild normalizes blank lines, so a main spec that a human formatted by hand
 * would compare unequal while being perfectly in sync, and the gate would be red
 * for a change nobody made. Sharing archive's own predicate is also what keeps
 * checker and doer from drifting apart, which is the failure #1112 describes.
 */
async function evaluateChange(
  changeName: string,
  changeDir: string,
  mainSpecsDir: string
): Promise<Evaluation> {
  const status = readChangeStatus(changeDir);
  const report: SyncChangeReport = {
    change: changeName,
    status: status.status,
    folded: true,
    specs: [],
    warnings: [],
    blockers: [],
  };

  if (status.invalidReason) {
    // Undetermined is not "proposed". A change whose metadata broke would
    // otherwise pass a gate whose whole job is noticing that kind of rot.
    report.folded = false;
    report.blockers.push(
      `Could not read the change's lifecycle status from ${METADATA_FILENAME}: ${status.invalidReason}`
    );
    return { report, writes: [] };
  }

  let updates: SpecUpdate[];
  try {
    updates = await findSpecUpdates(changeDir, mainSpecsDir);
  } catch (error) {
    report.folded = false;
    report.blockers.push(
      `Could not read this change's delta specs: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { report, writes: [] };
  }

  const writes: PreparedSpec[] = [];
  for (const update of updates) {
    let built: Awaited<ReturnType<typeof buildUpdatedSpec>>;
    try {
      built = await buildUpdatedSpec(update, changeName, { silent: true });
    } catch (error) {
      report.folded = false;
      report.blockers.push(
        `${update.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    report.warnings.push(...built.warnings);

    // The one case sync hands back to archive. When a change's REMOVED entries
    // take a capability's last requirement, the spec that would be written has
    // no requirements and cannot be validated - archive's answer is to delete
    // the file, which needs the author's `retire_capabilities` marker and a
    // rollback-safe deletion. Reimplementing that here would put the system's
    // only irreversible operation behind a second, less careful door.
    if (
      update.exists &&
      built.counts.removed > 0 &&
      built.noRequirementBlocks &&
      (await isRetirableSpec(update.id, built.rebuilt))
    ) {
      report.folded = false;
      report.blockers.push(
        `${update.id}: this change removes the capability's last requirement. ` +
          `Retiring a capability deletes its spec, which only openspec archive does. ` +
          `Archive the change instead of syncing it.`
      );
      continue;
    }

    const pending = sumCounts(built.counts) > 0;
    report.specs.push({ capability: update.id, pending, counts: built.counts });
    if (pending) {
      report.folded = false;
      writes.push({ update, rebuilt: built.rebuilt, counts: built.counts });
    }
  }

  if (report.blockers.length > 0) report.folded = false;
  return { report, writes };
}

// -----------------------------------------------------------------------------
// Command
// -----------------------------------------------------------------------------

export class SyncCommand {
  async execute(changeName?: string, options: SyncOptions = {}): Promise<void> {
    const json = !!options.json;

    let root: ResolvedOpenSpecRoot;
    try {
      root = await resolveOpenSpecRoot({
        ...(options.store !== undefined ? { store: options.store } : {}),
        ...(options.storePath !== undefined ? { storePath: options.storePath } : {}),
      });
    } catch (error) {
      if (json && isRootSelectionError(error)) {
        this.printJsonFailure(undefined, {
          code: error.diagnostic.code,
          message: error.diagnostic.message,
          ...(error.diagnostic.fix ? { fix: error.diagnostic.fix } : {}),
        });
        return;
      }
      throw error;
    }

    if (json) {
      try {
        const result = await this.run(changeName, options, root, true);
        if (!result) return;
        console.log(
          JSON.stringify({ sync: result, root: toRootOutput(root) }, null, 2)
        );
        if (!result.clean) process.exitCode = 1;
      } catch (error) {
        this.printJsonFailure(root, toDiagnostic(error));
      }
      return;
    }

    emitStoreRootBanner(root);
    await this.run(changeName, options, root, false);
  }

  private printJsonFailure(
    root: ResolvedOpenSpecRoot | undefined,
    diagnostic: { code: string; message: string; fix?: string }
  ): void {
    console.log(
      JSON.stringify(
        {
          sync: null,
          ...(root ? { root: toRootOutput(root) } : {}),
          status: [{ severity: 'error', ...diagnostic }],
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }

  private async run(
    changeName: string | undefined,
    options: SyncOptions,
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): Promise<SyncResult | null> {
    const changesDir = root.changesDir;
    const mainSpecsDir = root.specsDir;

    for (const [allowedDirectory, managedDir] of [
      [root.path, changesDir],
      [root.path, mainSpecsDir],
    ] as const) {
      try {
        FileSystemUtils.assertPathWithin(allowedDirectory, managedDir);
      } catch {
        throw new SyncBlockedError(
          'sync_path_outside_root',
          `Refusing to sync through a path outside the OpenSpec root: ${managedDir}`
        );
      }
    }

    const check = !!options.check;
    if (options.ship && check) {
      throw new SyncBlockedError(
        'sync_ship_with_check',
        '--ship writes to the change and --check writes nothing; pass one or the other.'
      );
    }
    if (options.ship && !changeName) {
      throw new SyncBlockedError(
        'sync_ship_needs_change',
        '--ship needs the change to mark shipped.',
        withStoreFlag(root, 'openspec sync <change-name> --ship')
      );
    }

    const targets = changeName
      ? [await this.resolveNamedChange(changeName, changesDir, root)]
      : await this.shippedChanges(changesDir);

    if (targets.length === 0) {
      const result: SyncResult = {
        checked: check,
        clean: true,
        changes: [],
        totals: { added: 0, modified: 0, removed: 0, renamed: 0 },
      };
      if (!json) {
        console.log(
          check
            ? 'No change declares `status: shipped`; nothing to check.'
            : 'No change declares `status: shipped`; nothing to sync. ' +
                'Name a change to sync it directly, or add `status: shipped` to its ' +
                `${METADATA_FILENAME}.`
        );
      }
      return result;
    }

    const evaluations: Evaluation[] = [];
    for (const name of targets) {
      evaluations.push(
        await evaluateChange(name, path.join(changesDir, name), mainSpecsDir)
      );
    }

    return check
      ? this.reportCheck(evaluations, root, json)
      : this.applyFolds(evaluations, changesDir, root, options, json);
  }

  /** A named change has to exist, exactly as archive requires. */
  private async resolveNamedChange(
    changeName: string,
    changesDir: string,
    root: ResolvedOpenSpecRoot
  ): Promise<string> {
    const problem = folderStyleNameProblem(changeName, 'Change name');
    if (problem) throw new SyncBlockedError('sync_change_name_invalid', problem);

    const changeDir = path.join(changesDir, changeName);
    try {
      const stat = await fs.lstat(changeDir);
      if (stat.isSymbolicLink()) {
        throw new SyncBlockedError(
          'sync_change_symlink',
          `Change '${changeName}' is a symbolic link. Replace it with a real directory before syncing.`
        );
      }
      if (!stat.isDirectory()) throw new Error('not a directory');
    } catch (error) {
      if (error instanceof SyncBlockedError) throw error;
      const available = await listActiveChangeNames(changesDir);
      throw new SyncBlockedError(
        'sync_change_not_found',
        available.length > 0
          ? `Change '${changeName}' not found. Available changes: ${available.join(', ')}`
          : `Change '${changeName}' not found. No active changes exist in this root.`,
        withStoreFlag(root, 'openspec list')
      );
    }
    return changeName;
  }

  /**
   * Every active change that declares `status: shipped`, plus every change
   * whose status could not be read at all.
   *
   * The second half is what keeps the gate honest. Skipping an unreadable
   * `.openspec.yaml` here would be the fail-open direction: a change that
   * declared itself shipped and then had its metadata broken would silently
   * stop being checked. `evaluateChange` turns it into a named blocker.
   */
  private async shippedChanges(changesDir: string): Promise<string[]> {
    const names = await listActiveChangeNames(changesDir);
    return names.filter((name) => {
      const status = readChangeStatus(path.join(changesDir, name));
      return status.invalidReason !== undefined || status.status === 'shipped';
    });
  }

  private reportCheck(
    evaluations: Evaluation[],
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): SyncResult {
    const changes = evaluations.map((evaluation) => evaluation.report);
    const clean = changes.every((change) => change.folded);
    const result: SyncResult = {
      checked: true,
      clean,
      changes,
      totals: { added: 0, modified: 0, removed: 0, renamed: 0 },
    };

    if (json) {
      if (!clean) process.exitCode = 1;
      return result;
    }

    if (clean) {
      console.log(
        `✓ ${changes.length} shipped change(s) are folded into the main specs.`
      );
      return result;
    }

    // Titled for both shapes of failure it reports: a shipped change whose
    // deltas are not in the main specs, and a change whose lifecycle status
    // could not be determined at all.
    console.log(chalk.red('Sync check failed:\n'));
    for (const change of changes) {
      if (change.folded) continue;
      console.log(`  ${change.change}`);
      for (const spec of change.specs) {
        if (!spec.pending) continue;
        const { added, modified, removed, renamed } = spec.counts;
        const parts = [
          added ? `+${added}` : '',
          modified ? `~${modified}` : '',
          removed ? `-${removed}` : '',
          renamed ? `→${renamed}` : '',
        ].filter(Boolean);
        console.log(`    ${spec.capability}: ${parts.join(' ')} not applied`);
      }
      for (const blocker of change.blockers) {
        console.log(chalk.yellow(`    ${blocker}`));
      }
    }
    const fixable = changes.filter(
      (change) => !change.folded && change.blockers.length === 0
    );
    if (fixable.length > 0) {
      console.log(
        `\nRun ${withStoreFlag(root, 'openspec sync')} to fold them, then commit the result.`
      );
    }
    process.exitCode = 1;
    return result;
  }

  private async applyFolds(
    evaluations: Evaluation[],
    changesDir: string,
    root: ResolvedOpenSpecRoot,
    options: SyncOptions,
    json: boolean
  ): Promise<SyncResult | null> {
    const skipValidation = options.validate === false;

    const blocked = evaluations.filter(
      (evaluation) => evaluation.report.blockers.length > 0
    );
    if (blocked.length > 0) {
      const first = blocked[0];
      throw new SyncBlockedError(
        'sync_change_blocked',
        `Cannot sync '${first.report.change}': ${first.report.blockers[0]}`,
        blocked.length > 1
          ? `${blocked.length} changes are blocked; run openspec sync --check for the full list.`
          : undefined
      );
    }

    // Same guards archive runs before it writes a spec, in the same order.
    for (const { report } of evaluations) {
      const changeDir = path.join(changesDir, report.change);
      if (!skipValidation) {
        await this.assertDeltaSpecsValid(report.change, changeDir, root, json);
      }
      await this.assertTasksComplete(report.change, changesDir, options, root, json);
    }

    if (!json) {
      for (const { report } of evaluations) {
        for (const warning of report.warnings) {
          console.log(chalk.yellow(`⚠️  Warning: ${warning}`));
        }
      }
    }

    // Every rebuilt spec is validated before any of them is written, so a late
    // failure leaves every target unchanged rather than half the tree folded.
    if (!skipValidation) {
      const validator = new Validator();
      for (const { report, writes } of evaluations) {
        for (const write of writes) {
          const specReport = await validator.validateSpecContent(
            write.update.id,
            write.rebuilt
          );
          if (specReport.valid) continue;
          const details = specReport.issues
            .filter((issue) => issue.level === 'ERROR')
            .map((issue) => issue.message)
            .join('; ');
          throw new SyncBlockedError(
            'sync_spec_validation_failed',
            `The spec '${write.update.id}' would be rebuilt into an invalid state by ` +
              `change '${report.change}': ${details}. No files were changed.`,
            `Run ${withStoreFlag(root, `openspec validate ${write.update.id}`)} after fixing the change deltas.`
          );
        }
      }
    }

    const pending = evaluations.flatMap(({ writes }) => writes);
    // Sync applies one change across several capabilities, so a failure part
    // way through the loop would leave some main specs folded and others not.
    // Re-running would finish the job - the fold is idempotent - but a tree
    // nobody asked for is not a state to hand back, so the previous bytes are
    // restored instead. Simpler than archive's equivalent because sync only
    // ever writes: there is no retirement to undo and no directory move to
    // unwind.
    const snapshots = await captureTargets(pending.map((write) => write.update.target));

    const totals = { added: 0, modified: 0, removed: 0, renamed: 0 };
    let wroteAny = false;
    try {
      for (const write of pending) {
        await writeUpdatedSpec(write.update, write.rebuilt, write.counts, {
          silent: json,
          ...(isStoreSelectedRoot(root) ? { displayPath: write.update.target } : {}),
        });
        wroteAny = true;
        totals.added += write.counts.added;
        totals.modified += write.counts.modified;
        totals.removed += write.counts.removed;
        totals.renamed += write.counts.renamed;
      }
    } catch (error) {
      const restoreFailure = await restoreTargets(snapshots);
      throw new SyncBlockedError(
        'sync_write_failed',
        `Could not write the main specs: ${
          error instanceof Error ? error.message : String(error)
        }.${restoreFailure ? ` ${restoreFailure}` : ' No spec was left partly folded.'}`,
        restoreFailure ? 'Restore the named files from git, then rerun.' : undefined
      );
    }

    // Re-evaluate rather than assume. Folding is idempotent for a single
    // change, but two shipped changes can disagree about the same requirement -
    // one adding what the other removes - and a fold that does not settle would
    // otherwise report success while `--check` immediately after went red. The
    // merge builder catches the destructive shapes of that disagreement on its
    // own (a MODIFIED that would drop a scenario, an ADDED whose content
    // differs), so what reaches here is the non-convergent rest, and naming it
    // is better than looping on it.
    const unsettled: string[] = [];
    for (const { report } of evaluations) {
      const after = await evaluateChange(
        report.change,
        path.join(changesDir, report.change),
        root.specsDir
      );
      if (!after.report.folded) unsettled.push(report.change);
    }
    if (unsettled.length > 0) {
      throw new SyncBlockedError(
        'sync_did_not_converge',
        `Specs were written, but these changes still report unfolded deltas: ` +
          `${unsettled.join(', ')}. Two shipped changes are claiming the same ` +
          `requirement in ways that cannot both hold.`,
        'Reconcile the conflicting deltas, then rerun.'
      );
    }

    // Stamped last, once the specs on disk are known to be correct. Writing the
    // field any earlier means every later failure - a write that cannot
    // complete, a fold that does not settle - has to remember to take the
    // metadata back with it, and the one that forgets leaves a change claiming
    // `shipped` with its deltas absent, which is the state this flag exists to
    // prevent. Ordering removes the failure rather than compensating for it.
    //
    // The reverse order is harmless and self-correcting: a fold that lands
    // without the stamp is a proposed change whose deltas happen to already be
    // in the specs, which the gate ignores, and rerunning `--ship` folds
    // nothing and stamps the field.
    if (options.ship) {
      const shipped = evaluations[0].report;
      writeChangeStatus(path.join(changesDir, shipped.change), 'shipped');
      shipped.status = 'shipped';
      if (!json) console.log(`Marked '${shipped.change}' as shipped.`);
    }

    const changes = evaluations.map((evaluation) => ({
      ...evaluation.report,
      folded: true,
    }));
    if (!json) {
      if (wroteAny) {
        console.log(
          `Totals: + ${totals.added}, ~ ${totals.modified}, - ${totals.removed}, → ${totals.renamed}`
        );
        console.log('Specs updated successfully.');
      } else {
        console.log('Specs already in sync; no files changed.');
      }
    }

    return {
      checked: false,
      clean: true,
      changes,
      totals,
    };
  }

  /**
   * Archive's delta validation, restricted to what sync needs. Sync only ever
   * runs on a change that has deltas to fold, so the `skip_specs` reconciliation
   * archive performs (a change declaring it has no deltas, but carrying files)
   * has nothing to decide here - `findSpecUpdates` already found the files.
   */
  private async assertDeltaSpecsValid(
    changeName: string,
    changeDir: string,
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): Promise<void> {
    const report = await new Validator().validateChangeDeltaSpecs(changeDir);
    if (report.valid) return;

    if (!json) {
      console.log(chalk.red(`\nValidation errors in change delta specs:`));
      for (const issue of report.issues) {
        if (issue.level === 'ERROR') console.log(chalk.red(`  ✗ ${issue.message}`));
        else if (issue.level === 'WARNING') console.log(chalk.yellow(`  ⚠ ${issue.message}`));
      }
    }
    throw new SyncBlockedError(
      'sync_validation_failed',
      `Validation failed for change '${changeName}'. No files were changed.`,
      `Run ${withStoreFlag(root, `openspec validate ${changeName}`)} for details, fix the errors, or rerun with --no-validate.`
    );
  }

  /**
   * Folding a change whose tasks are unfinished writes requirements into
   * `specs/` that nothing implements yet - the exact drift the gate exists to
   * prevent, arriving through the gate's own command. Blocks rather than warns,
   * because sync is designed to run unattended in a hook.
   */
  private async assertTasksComplete(
    changeName: string,
    changesDir: string,
    options: SyncOptions,
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): Promise<void> {
    const progress = await getTaskProgressForChange(
      changesDir,
      changeName,
      path.resolve(changesDir, '..', '..')
    );
    const incomplete = Math.max(progress.total - progress.completed, 0);
    if (incomplete === 0) return;

    if (options.yes) {
      if (!json) {
        console.log(
          `Warning: ${incomplete} incomplete task(s) in '${changeName}'. Continuing due to --yes flag.`
        );
      }
      return;
    }

    if (!json) console.log(`Task status: ${formatTaskStatus(progress)}`);
    throw new SyncBlockedError(
      'sync_tasks_incomplete',
      `${incomplete} incomplete task(s) in '${changeName}'. Syncing now would write ` +
        `requirements into the main specs that nothing implements yet.`,
      `Complete the tasks, or rerun with ${withStoreFlag(root, `openspec sync ${changeName} --yes`)}.`
    );
  }
}

interface TargetSnapshot {
  target: string;
  /** The bytes that were there, or undefined when the file did not exist. */
  content?: Buffer;
}

/** Read the current bytes of each target so a failed write can be undone. */
async function captureTargets(targets: string[]): Promise<TargetSnapshot[]> {
  return Promise.all(
    targets.map(async (target) => {
      try {
        return { target, content: await fs.readFile(target) };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { target };
        throw error;
      }
    })
  );
}

/**
 * Put every captured target back the way it was, in reverse order.
 *
 * Returns a sentence naming what could not be restored, or undefined when the
 * tree is back to its original state. Never throws: it runs inside a failure
 * path, and losing the original error to a rollback error would hide the cause.
 */
async function restoreTargets(
  snapshots: TargetSnapshot[]
): Promise<string | undefined> {
  const failed: string[] = [];
  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (snapshot.content === undefined) {
        // The file did not exist before this run, so the rollback is removing
        // whatever was created. A missing file is already the desired state.
        await fs.unlink(snapshot.target).catch((error) => {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        });
      } else {
        // Written in place, exactly as writeUpdatedSpec does, so a symlinked or
        // hard-linked spec keeps the semantics it had before the fold.
        await fs.writeFile(snapshot.target, snapshot.content);
      }
    } catch {
      failed.push(snapshot.target);
    }
  }
  return failed.length > 0
    ? `These specs could not be restored and may hold partly folded content: ${failed.join(', ')}.`
    : undefined;
}

function toDiagnostic(error: unknown): { code: string; message: string; fix?: string } {
  if (error instanceof SyncBlockedError) {
    const { severity: _severity, ...rest } = error.diagnostic;
    return rest;
  }
  return {
    code: 'sync_error',
    message: error instanceof Error ? error.message : String(error),
  };
}
