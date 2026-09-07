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
 * Credit: this design is Matan Bendix Shenhav's, from his proposal #1683 and his
 * implementation #1684, which he closed himself. No code from it is reused here.
 * His, not ours: the diagnosis above; `shipped => folded` as a tree predicate
 * evaluable at every tier (his decision V); the argument that a checker which
 * reimplements the doer eventually disagrees with it (IV); the standalone
 * idempotent `sync` (III); status as data rather than directory position (I and
 * II); and setting the field and folding in one working-tree diff (VI, his
 * `ship`).
 *
 * One deliberate divergence. His IV decides folded-ness by byte-identical
 * regeneration; this module uses archive's zero-operations predicate instead,
 * because the rebuild normalizes blank lines - a hand-formatted main spec would
 * compare unequal while being perfectly in sync, and the gate would be red for a
 * change nobody made. Same goal as IV, reached by sharing the doer's own
 * predicate rather than comparing its output.
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
import {
  assertDistinctSpecTargets,
  changeHasDeltaSpecsToValidate,
  isRetirableSpec,
  listActiveChangeNames,
} from './archive.js';
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
  /**
   * Fold the change, then set `status: shipped` on it - one working-tree diff.
   * The stamp is last on purpose: a failed write or a non-convergent fold must
   * not leave the field claiming shipped with the deltas absent.
   */
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
  mainSpecsDir: string,
  validate = true
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

  // Run BEFORE the fold, and on the `--check` path too.
  //
  // The gate promises `shipped => folded`, and a delta the merge would refuse is
  // not folded and never will be. Leaving this to the write path made `--check`
  // certify as clean a change whose only delta sat at `specs/spec.md`, which
  // `discoverSpecFiles` does not walk (#1385): zero updates found, nothing
  // pending, green - while `openspec sync` and `openspec archive` both refused
  // the same tree. A gate that is green on a silently dropped requirement is
  // worse than no gate.
  //
  // Whether a change HAS deltas to validate is archive's own question, asked
  // through its own function, so a zero-delta change is treated identically by
  // both commands.
  if (validate) {
    let hasDeltas: boolean;
    try {
      hasDeltas = await changeHasDeltaSpecsToValidate(changeDir);
    } catch (error) {
      report.folded = false;
      report.blockers.push(
        `Could not read this change's delta specs: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { report, writes: [] };
    }
    if (hasDeltas) {
      // No mainSpecsDir, matching archive: the scenario-loss check standalone
      // validate runs (#1477) is the same one buildUpdatedSpec enforces below,
      // and reporting it here would relabel that failure.
      const deltaReport = await new Validator().validateChangeDeltaSpecs(changeDir);
      if (!deltaReport.valid) {
        report.folded = false;
        for (const issue of deltaReport.issues) {
          if (issue.level === 'ERROR') report.blockers.push(issue.message);
        }
        // A report that is invalid with no ERROR issue would otherwise pass
        // silently while claiming to have blocked.
        if (report.blockers.length === 0) {
          report.blockers.push(`Delta specs for '${changeName}' failed validation.`);
        }
        return { report, writes: [] };
      }
    }
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

    // Archive refuses to skip validation without an explicit answer, because
    // skipping it can write a spec that would never have validated. Sync is
    // unattended by design, so there is no prompt to give - `--yes` is the
    // answer, exactly as archive's own JSON path requires.
    if (options.validate === false && !options.yes && !options.check) {
      throw new SyncBlockedError(
        'sync_confirmation_required',
        'Skipping validation can fold a spec that would never have validated, so it needs confirmation.',
        withStoreFlag(root, `openspec sync ${changeName ?? '<change-name>'} --no-validate --yes`)
      );
    }

    const targets = changeName
      ? [await this.resolveNamedChange(changeName, changesDir, root)]
      : await this.shippedChanges(changesDir);

    // Checked before the fold, not after it. `writeChangeStatus` refuses a
    // change with no `.openspec.yaml`, and discovering that only once the specs
    // are written leaves a fold that is never stamped - and a rerun that fails
    // in exactly the same place, so the ordering's usual self-correction does
    // not apply.
    if (options.ship) {
      const metaPath = path.join(changesDir, targets[0], METADATA_FILENAME);
      try {
        await fs.access(metaPath);
      } catch {
        throw new SyncBlockedError(
          'sync_ship_no_metadata',
          `Change '${targets[0]}' has no ${METADATA_FILENAME}, so there is no file to record ` +
            `\`status: shipped\` in. No specs were folded.`,
          `Create the change with openspec new change, or add ${METADATA_FILENAME} by hand, then rerun.`
        );
      }
    }

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
        await evaluateChange(
          name,
          path.join(changesDir, name),
          mainSpecsDir,
          options.validate !== false
        )
      );
    }

    return check
      ? this.reportCheck(evaluations, root, json)
      : this.applyFolds(evaluations, changesDir, mainSpecsDir, root, options, json);
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
    mainSpecsDir: string,
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

    // Delta validation already ran inside `evaluateChange`, on the check path
    // too, so a blocked change never reaches here. Task completion is the one
    // guard that is about the change rather than about its deltas, and it has
    // no bearing on whether the tree satisfies the gate - so it gates the write
    // and deliberately does not make `--check` red.
    for (const { report } of evaluations) {
      await this.assertTasksComplete(report.change, changesDir, options, root, json);
    }

    // Fold ONE CHANGE AT A TIME, rebuilding each against the specs as they are
    // on disk at that moment.
    //
    // Evaluating every change up front and then writing them all would rebuild
    // each one from the same pre-write baseline, so two shipped changes adding
    // different requirements to the same capability would each produce a spec
    // containing only their own - and the second write would erase the first,
    // silently, while the console reported both as applied. That is not a
    // conflict between the changes; they compose fine. It is the batch reading
    // a stale baseline. `archive` never had the bug because it takes one change
    // per invocation, and folding sequentially is how sync inherits that.
    //
    // Every target written across the whole run is captured first, so a failure
    // on the third change still puts the first two back rather than handing
    // back a tree nobody asked for.
    const totals = { added: 0, modified: 0, removed: 0, renamed: 0 };
    const snapshots: TargetSnapshot[] = [];
    // What this run last wrote to each target, so the rollback can tell its own
    // output apart from a concurrent edit it must not clobber.
    const wrote = new Map<string, string>();
    let wroteAny = false;

    try {
      for (const evaluation of evaluations) {
        const changeName = evaluation.report.change;
        // Re-evaluated against the current tree rather than reusing the plan
        // built before the previous change was folded.
        const current = await evaluateChange(
          changeName,
          path.join(changesDir, changeName),
          mainSpecsDir,
          !skipValidation
        );
        if (current.report.blockers.length > 0) {
          throw new SyncBlockedError(
            'sync_change_blocked',
            `Cannot sync '${changeName}': ${current.report.blockers[0]}`
          );
        }
        evaluation.report.specs = current.report.specs;
        evaluation.report.warnings = current.report.warnings;
        if (current.writes.length === 0) continue;

        // Two capability ids can resolve to the SAME file - a symlinked
        // capability directory is explicitly allowed by the trust model, and a
        // case-variant id aliases on a case-insensitive filesystem. Writing
        // both in sequence is last-writer-wins, which loses one fold and files
        // the other's requirements under the wrong name. Archive refuses this
        // outright; sync uses archive's own check so the two agree on which
        // trees they will write.
        await assertDistinctSpecTargets(
          current.writes.map(({ update }) => ({ id: update.id, target: update.target })),
          'syncing'
        );

        // Validated before any of THIS change's specs is written, so a late
        // failure inside one change leaves that change wholly unapplied.
        if (!skipValidation) {
          const validator = new Validator();
          for (const write of current.writes) {
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
                `change '${changeName}': ${details}.`,
              `Run ${withStoreFlag(root, `openspec validate ${write.update.id}`)} after fixing the change deltas.`
            );
          }
        }

        if (!json) {
          for (const warning of current.report.warnings) {
            console.log(chalk.yellow(`⚠️  Warning: ${warning}`));
          }
        }

        for (const write of current.writes) {
          if (!wrote.has(write.update.target)) {
            snapshots.push(await captureTarget(write.update.target));
          }
          await writeUpdatedSpec(write.update, write.rebuilt, write.counts, {
            silent: json,
            ...(isStoreSelectedRoot(root) ? { displayPath: write.update.target } : {}),
          });
          wrote.set(write.update.target, write.rebuilt);
          wroteAny = true;
          totals.added += write.counts.added;
          totals.modified += write.counts.modified;
          totals.removed += write.counts.removed;
          totals.renamed += write.counts.renamed;
        }
      }
    } catch (error) {
      const restoreFailure = await restoreTargets(snapshots, wrote);
      if (error instanceof SyncBlockedError) {
        throw new SyncBlockedError(
          error.diagnostic.code,
          `${error.message}${
            restoreFailure ? ` ${restoreFailure}` : ' No spec was left partly folded.'
          }`,
          restoreFailure ? 'Restore the named files from git, then rerun.' : error.diagnostic.fix
        );
      }
      throw new SyncBlockedError(
        'sync_write_failed',
        `Could not write the main specs: ${
          error instanceof Error ? error.message : String(error)
        }.${restoreFailure ? ` ${restoreFailure}` : ' No spec was left partly folded.'}`,
        restoreFailure ? 'Restore the named files from git, then rerun.' : undefined
      );
    }

    // Re-evaluate rather than assume. Sequential folding removes the stale
    // baseline, but two shipped changes can still genuinely disagree - one
    // adding a requirement the other removes - and such a pair never settles.
    // The merge builder catches the destructive shapes on its own (a MODIFIED
    // that would drop a scenario, an ADDED whose content differs), so what
    // reaches here is the non-convergent rest, and naming it beats looping.
    const unsettled: string[] = [];
    for (const { report } of evaluations) {
      const after = await evaluateChange(
        report.change,
        path.join(changesDir, report.change),
        mainSpecsDir,
        !skipValidation
      );
      if (!after.report.folded) unsettled.push(report.change);
    }
    if (unsettled.length > 0) {
      const restoreFailure = await restoreTargets(snapshots, wrote);
      throw new SyncBlockedError(
        'sync_did_not_converge',
        `These changes still report unfolded deltas after a fold: ` +
          `${unsettled.join(', ')}. Two shipped changes are claiming the same ` +
          `requirement in ways that cannot both hold.${
            restoreFailure ? ` ${restoreFailure}` : ' The main specs were left unchanged.'
          }`,
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

/** Read the current bytes of a target so a failed write can be undone. */
async function captureTarget(target: string): Promise<TargetSnapshot> {
  try {
    return { target, content: await fs.readFile(target) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { target };
    throw error;
  }
}

/**
 * Put every target that this run actually changed back the way it was, in
 * reverse order.
 *
 * Two things it will not do, both mirroring `archive`'s rollback:
 *
 * - **It does not touch a target whose bytes already match the snapshot.** The
 *   write that failed is usually the one that never landed, and "restoring" an
 *   unchanged file only to fail on a read-only one produced a false "may hold
 *   partly folded content" alarm about a file nothing had written.
 * - **It does not overwrite content this run did not produce.** A target whose
 *   bytes match neither the snapshot nor what was written was changed by
 *   something else while the fold was running; clobbering it would destroy an
 *   edit to save a rollback. It is reported instead.
 *
 * Returns a sentence naming what could not be put back, or undefined when the
 * tree is back to its original state. Never throws: it runs inside a failure
 * path, and losing the original error to a rollback error would hide the cause.
 */
async function restoreTargets(
  snapshots: TargetSnapshot[],
  wrote: Map<string, string>
): Promise<string | undefined> {
  const failed: string[] = [];
  const foreign: string[] = [];
  for (const snapshot of [...snapshots].reverse()) {
    try {
      const current = await fs.readFile(snapshot.target).catch((error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
      });

      if (snapshot.content === undefined) {
        // The file did not exist before this run.
        if (current === undefined) continue;
        if (current.toString() !== wrote.get(snapshot.target)) {
          foreign.push(snapshot.target);
          continue;
        }
        await fs.unlink(snapshot.target);
        continue;
      }

      if (current !== undefined && current.equals(snapshot.content)) continue;
      if (current !== undefined && current.toString() !== wrote.get(snapshot.target)) {
        foreign.push(snapshot.target);
        continue;
      }
      // Written in place, exactly as writeUpdatedSpec does, so a symlinked or
      // hard-linked spec keeps the semantics it had before the fold.
      await fs.writeFile(snapshot.target, snapshot.content);
    } catch {
      failed.push(snapshot.target);
    }
  }

  const problems = [
    failed.length > 0
      ? `These specs could not be restored and may hold partly folded content: ${failed.join(', ')}.`
      : '',
    foreign.length > 0
      ? `These specs changed underneath this run and were left as they are: ${foreign.join(', ')}.`
      : '',
  ].filter(Boolean);
  return problems.length > 0 ? problems.join(' ') : undefined;
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
