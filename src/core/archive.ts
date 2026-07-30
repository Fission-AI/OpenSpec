import { promises as fs } from 'fs';
import path from 'path';
import { formatLocalDate } from '../utils/date.js';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { Validator } from './validation/validator.js';
import { VALIDATION_MESSAGES } from './validation/constants.js';
import chalk from 'chalk';
import {
  emitStoreRootBanner,
  isRootSelectionError,
  resolveOpenSpecRoot,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
  isStoreSelectedRoot,
} from './root-selection.js';
import {
  findSpecUpdates,
  buildUpdatedSpec,
  writeUpdatedSpec,
  retireSpec,
  type SpecUpdate,
} from './specs-apply.js';
import { discoverSpecFiles, hasAnyFileUnder } from '../utils/spec-discovery.js';
import { METADATA_FILENAME, readRetireCapabilitiesMarker, readSkipSpecsMarker } from '../utils/change-metadata.js';
import { isNonInteractivePromptError } from '../utils/interactive.js';

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

/**
 * Matches the `YYYY-MM-DD-` prefix that archiving prepends to a change name.
 * A change whose name already starts with one (a common authoring convention)
 * is archived under its existing name so the prefix is never stacked (#1309).
 */
const ARCHIVE_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}-/;

/**
 * True when the ONLY thing wrong with a rebuilt spec is that it has no
 * requirements. That is the exact failure retiring a capability replaces
 * (#1302); anything else means the spec is broken in a way the author still has
 * to fix, so archive must abort exactly as it always did instead of retiring.
 *
 * Asking the validator - rather than counting requirement blocks a second time -
 * is what makes "this spec could not have been written anyway" true by
 * construction. The two counts genuinely disagree: `MarkdownParser` accepts any
 * `###` heading under `## Requirements` as a requirement, while the delta block
 * parser only indexes canonical `### Requirement:` headers and sweeps the rest
 * into the preamble, which survives into the rebuilt spec.
 */
export async function isRetirableSpec(specName: string, rebuilt: string): Promise<boolean> {
  const report = await new Validator().validateSpecContent(specName, rebuilt);
  if (report.valid) return false;
  const errors = report.issues.filter((issue) => issue.level === 'ERROR');
  return (
    errors.length > 0 &&
    errors.every((issue) => issue.message === VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS)
  );
}

/**
 * What this run should do with a rebuilt spec: write it as usual, retire the
 * capability because the delta removed its last requirement (#1302), or do
 * nothing because there is no spec to write and none to retire.
 */
type SpecOutcome = 'write' | 'retire' | 'skip';

async function decideSpecOutcome(
  update: SpecUpdate,
  built: Awaited<ReturnType<typeof buildUpdatedSpec>>,
  skipValidation: boolean,
  retirementDeclared: boolean
): Promise<SpecOutcome> {
  // The author has to have asked. Without the marker this falls through to the
  // ordinary write, which fails validation exactly as it always did - and the
  // abort names the marker, so the dead end #1302 describes now comes with its
  // own way out instead of just a rejected spec.
  if (!retirementDeclared) return 'write';

  // Retirement is decided by the validator, never by a second opinion about
  // what counts as a requirement: the block parser sweeps some shapes the
  // validator accepts into the preamble, so "no blocks left" alone would retire
  // specs that validate fine.
  //
  // Residual `###` headings veto it outright. The validator can be talked out of
  // seeing them - a stray `### Requirements` under Purpose captures its section
  // lookup - but a reader cannot, and deleting the file would take them with it.
  //
  // Under --no-validate there is no verdict to lean on, so nothing is retired:
  // the author opted out of the check that makes this safe, and the old
  // behavior (write the spec) loses nothing.
  const retirable =
    !skipValidation &&
    built.noRequirementBlocks &&
    // Nothing in the file this merge cannot account for. Asked as "did anything
    // land outside the parts I understand" rather than "does anything look like
    // a requirement" - the second question is the one six review rounds each
    // found a new way to answer wrongly.
    built.unaccountedContent.length === 0 &&
    (await isRetirableSpec(update.id, built.rebuilt));

  if (!retirable) return 'write';
  // Nothing on disk to write or retire: the capability is already retired.
  if (!update.exists) return 'skip';
  // A spec that was already requirement-less and lost nothing this run is still
  // the author's to fix, so it takes the same abort it has always produced.
  return built.counts.removed > 0 ? 'retire' : 'write';
}

async function listActiveChangeNames(changesDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    return [];
  }
}

export interface ArchiveOptions {
  yes?: boolean;
  skipSpecs?: boolean;
  noValidate?: boolean;
  validate?: boolean;
  json?: boolean;
  store?: string;
  storePath?: string;
}

interface ArchiveDiagnostic {
  severity: 'error';
  code: string;
  message: string;
  fix?: string;
}

interface ArchiveResult {
  change: string;
  archivedAs: string;
  path: string;
  specsUpdated: boolean;
  totals?: { added: number; modified: number; removed: number; renamed: number };
  /** Non-blocking spec-merge warnings (e.g. a REMOVED requirement that was already gone). */
  warnings?: string[];
}

/**
 * A decision point archive cannot get past on its own. Thrown wherever the
 * flow needs an answer it has no way to obtain: in JSON mode, which never
 * prompts at all, and in human mode when a prompt failed because nothing
 * could answer it (#1479). Either way it carries a machine-readable
 * diagnostic and exits non-zero.
 */
class ArchiveBlockedError extends Error {
  readonly diagnostic: ArchiveDiagnostic;

  constructor(code: string, message: string, fix?: string) {
    super(message);
    this.name = 'ArchiveBlockedError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...(fix ? { fix } : {}),
    };
  }
}

/**
 * Quotes a change name for a `Fix:` line the reader is meant to paste.
 * Archive resolves a change by stat-ing its directory, so the name is
 * whatever the directory is called - including names with spaces or shell
 * metacharacters, which pasted unquoted would run as a second command.
 *
 * Double quotes are the one form bash, zsh, PowerShell and cmd.exe all read
 * the same way, so a POSIX-only `'...'` would be wrong on Windows. Characters
 * that stay inert inside double quotes in every one of those shells are the
 * limit of what can be quoted portably; a name containing anything else has
 * no portable spelling, so the placeholder is named instead of emitting a
 * command that might expand to something the reader did not intend.
 *
 * `%` and `!` are unquotable for the same reason even though POSIX shells
 * leave them alone inside double quotes: cmd.exe expands `%NAME%` inside
 * double quotes, and `!NAME!` expands there too under `setlocal
 * enabledelayedexpansion` (as does `!` under bash's interactive history
 * expansion). A change directory really can be named `%USERNAME%`, and a
 * rerun that silently targets a different change is worse than one the reader
 * has to fill in.
 */
function quoteChangeName(name: string): string {
  return quoteForShell(name) ?? '<change-name>';
}

/**
 * Quotes an argument for a line the reader is meant to paste, or returns
 * undefined when no portable spelling exists.
 *
 * Double quotes are the one form bash, zsh, PowerShell and cmd.exe all read the
 * same way. A value holding a character that stays special INSIDE double quotes
 * in any of them has no portable spelling, so callers say something else rather
 * than emit a command that expands to something the reader did not intend.
 */
function quoteForShell(value: string): string | undefined {
  if (/^[A-Za-z0-9._\/-]+$/.test(value)) return value;
  if (!/["\\$`\r\n%!]/.test(value)) return `"${value}"`;
  return undefined;
}

/**
 * Renders a change name inside a prose message. The name is a directory name,
 * so it can hold control characters, and human mode prints the message
 * verbatim: a raw CR or LF would let a change directory forge its own `Fix:`
 * line, which is worse here than anywhere else because `quoteChangeName`
 * degrades the real fix to the `<change-name>` placeholder for exactly those
 * names - leaving the forged line as the only pasteable command on screen.
 * An ESC could redraw the terminal. Neither survives.
 */
function describeChangeName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, '?');
}

/**
 * Builds the flags a blocked archive's suggested rerun has to reproduce. The
 * caller's own flags are carried, because suggesting a bare `--yes` rerun for
 * `archive x --skip-specs` would merge deltas into the main specs - the exact
 * thing `--skip-specs` was passed to prevent.
 */
function rerunFlags(options: ArchiveOptions): string[] {
  return [
    ...(options.skipSpecs ? ['--skip-specs'] : []),
    ...(options.validate === false || options.noValidate === true ? ['--no-validate'] : []),
    '--yes',
  ];
}

function rerunCommand(
  root: ResolvedOpenSpecRoot,
  changeName: string,
  options: ArchiveOptions
): string {
  const flags = rerunFlags(options).join(' ');
  // A name starting with a dash is read as an option wherever it sits, so it
  // goes last, behind the `--` that ends option parsing. The store flag has
  // to stay in front of that `--` to still be read as an option.
  if (changeName.startsWith('-')) {
    return `${withStoreFlag(root, `openspec archive ${flags}`)} -- ${quoteChangeName(changeName)}`;
  }
  return withStoreFlag(root, `openspec archive ${quoteChangeName(changeName)} ${flags}`);
}

/**
 * Asks a yes/no question in human mode. When no answer can be read — the
 * usual case for an AI agent or a script that runs the command with stdin
 * closed — the raw @inquirer failure is replaced with guidance for this
 * decision point, so the caller learns which flag to pass instead of reading
 * `User force closed the prompt` (#1479).
 */
async function confirmOrBlock(
  prompt: { message: string; default: boolean },
  blocked: () => ArchiveBlockedError
): Promise<boolean> {
  const { confirm } = await import('@inquirer/prompts');
  try {
    return await confirm(prompt);
  } catch (error) {
    if (isNonInteractivePromptError(error)) {
      throw blocked();
    }
    throw error;
  }
}

function toArchiveDiagnostic(error: unknown): ArchiveDiagnostic {
  if (error instanceof ArchiveBlockedError) {
    return error.diagnostic;
  }
  if (isRootSelectionError(error)) {
    return error.diagnostic;
  }
  return {
    severity: 'error',
    code: 'archive_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Recursively copy a directory. Used when fs.rename fails (e.g. EPERM on Windows).
 */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Move a directory from src to dest. On Windows, fs.rename() often fails with
 * EPERM when the directory is non-empty or another process has it open (IDE,
 * file watcher, antivirus). Fall back to copy-then-remove when rename fails
 * with EPERM or EXDEV.
 */
async function moveDirectory(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (err: any) {
    const code = err?.code;
    // rename onto a non-empty directory: the destination was taken while the
    // archive was running. Same condition the pre-flight check reports.
    if (code === 'ENOTEMPTY' || code === 'EEXIST') {
      throw new ArchiveBlockedError(
        'archive_target_exists',
        `Archive '${path.basename(dest)}' already exists.`
      );
    }
    if (code === 'EPERM' || code === 'EXDEV') {
      await copyDirRecursive(src, dest);
      await fs.rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

export class ArchiveCommand {
  async execute(changeName?: string, options: ArchiveOptions = {}): Promise<void> {
    const json = !!options.json;

    let root: ResolvedOpenSpecRoot;
    try {
      root = await resolveOpenSpecRoot({
        ...(options.store !== undefined ? { store: options.store } : {}),
        ...(options.storePath !== undefined ? { storePath: options.storePath } : {}),
      });
    } catch (error) {
      if (json && isRootSelectionError(error)) {
        this.printJsonFailure(undefined, toArchiveDiagnostic(error));
        return;
      }
      throw error;
    }

    if (json) {
      try {
        const result = await this.run(changeName, options, root, true);
        if (!result) {
          return;
        }
        console.log(JSON.stringify({ archive: result, root: toRootOutput(root) }, null, 2));
      } catch (error) {
        this.printJsonFailure(root, toArchiveDiagnostic(error));
      }
      return;
    }

    emitStoreRootBanner(root);
    await this.run(changeName, options, root, false);
  }

  private printJsonFailure(root: ResolvedOpenSpecRoot | undefined, diagnostic: ArchiveDiagnostic): void {
    console.log(
      JSON.stringify(
        {
          archive: null,
          ...(root ? { root: toRootOutput(root) } : {}),
          status: [diagnostic],
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }

  /**
   * Shared archive flow. In human mode (json=false) prompts and prose match
   * the historical behavior and cancellations return null. In JSON mode no
   * prose reaches stdout and every blocked path throws.
   */
  private async run(
    changeName: string | undefined,
    options: ArchiveOptions,
    root: ResolvedOpenSpecRoot,
    json: boolean
  ): Promise<ArchiveResult | null> {
    const changesDir = root.changesDir;
    const archiveDir = root.archiveDir;
    const mainSpecsDir = root.specsDir;

    // Get change name interactively if not provided
    if (!changeName) {
      if (json) {
        throw new ArchiveBlockedError(
          'archive_change_name_required',
          'A change name is required: archive --json is non-interactive.',
          withStoreFlag(root, 'openspec archive <change-name> --json')
        );
      }
      const selectedChange = await this.selectChange(changesDir, root, options);
      if (!selectedChange) {
        console.log('No change selected. Aborting.');
        return null;
      }
      changeName = selectedChange;
    }

    const changeDir = path.join(changesDir, changeName);

    // Verify change exists
    try {
      const stat = await fs.stat(changeDir);
      if (!stat.isDirectory()) {
        throw new Error(`Change '${changeName}' not found.`);
      }
    } catch {
      const available = await listActiveChangeNames(changesDir);
      throw new ArchiveBlockedError(
        'archive_change_not_found',
        available.length > 0
          ? `Change '${changeName}' not found. Available changes: ${available.join(', ')}`
          : `Change '${changeName}' not found. No active changes exist in this root.`
      );
    }

    const skipValidation = options.validate === false || options.noValidate === true;

    // Validate specs and change before archiving
    if (!skipValidation) {
      const validator = new Validator();
      let hasValidationErrors = false;

      // Validate proposal.md (informative only; human mode prints warnings)
      if (!json) {
        const changeFile = path.join(changeDir, 'proposal.md');
        try {
          await fs.access(changeFile);
          const changeReport = await validator.validateChange(changeFile);
          // Proposal validation is informative only (do not block archive).
          // `validateChange` parses the change together with its delta specs,
          // so it also raises requirement-level issues under
          // `deltas.<n>.requirement(s)`. Those
          // are not proposal problems, and reporting them here was noisy and
          // sometimes wrong (#498): the change parser records every requirement
          // under both `requirement` and `requirements`, so each defect was
          // printed twice, and REMOVED requirements — names-only by design —
          // produced a "missing scenario" warning for a correct removal.
          // Genuine delta defects are still caught below, by the delta spec
          // validation and by the rebuilt-spec check that runs before any write.
          const proposalIssues = changeReport.issues.filter(
            (issue) => !/^deltas\.\d+\.requirements?\./.test(issue.path)
          );
          if (!changeReport.valid && proposalIssues.length > 0) {
            console.log(chalk.yellow(`\nProposal warnings in proposal.md (non-blocking):`));
            for (const issue of proposalIssues) {
              const symbol = issue.level === 'ERROR' ? '⚠' : (issue.level === 'WARNING' ? '⚠' : 'ℹ');
              console.log(chalk.yellow(`  ${symbol} ${issue.message}`));
            }
          }
        } catch {
          // Change file doesn't exist, skip validation
        }
      }

      // Validate delta-formatted spec files under the change directory if present
      const changeSpecsDir = path.join(changeDir, 'specs');
      // A spec.md at the specs/ root is never merged, so archiving a change
      // that has one drops its content whether or not it carries delta headers
      // (#1385). Its existence alone must run validation, which reports it and
      // blocks the archive. A directory named spec.md is a normal capability
      // folder, so only a regular file counts.
      const rootSpecStat = await fs.stat(path.join(changeSpecsDir, 'spec.md')).catch(() => null);
      let hasDeltaSpecs = rootSpecStat?.isFile() === true;
      // A change that declares skip_specs must not carry any file under
      // specs/ — validate reports that as a conflict, so archive has to run
      // the same check instead of skipping validation because the files
      // happen to have no delta headers. A marker that cannot be honored
      // (skip_specs mentioned but the metadata fails the shared shape, or
      // names a schema that does not resolve) also
      // forces validation, so archive and validate always agree about the
      // marker. Unreadable specs/ fails closed into validation too. (An
      // UNMARKED zero-delta change still archives with only non-blocking
      // proposal warnings — a gap that predates the marker and is left
      // unchanged here.)
      if (!hasDeltaSpecs) {
        const marker = readSkipSpecsMarker(changeDir);
        if (marker.invalidReason) {
          hasDeltaSpecs = true;
        } else if (marker.declared) {
          let specsDirHasFiles = true;
          try {
            specsDirHasFiles = await hasAnyFileUnder(changeSpecsDir);
          } catch {
            // fall through with true: let validation surface the conflict
          }
          hasDeltaSpecs = specsDirHasFiles;
        }
      }
      for (const { specFile } of hasDeltaSpecs ? [] : await discoverSpecFiles(changeSpecsDir)) {
        try {
          const content = await fs.readFile(specFile, 'utf-8');
          // Case-insensitive to match the delta parser, so a lowercase header
          // routes through the same delta validation that validate runs.
          if (/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/im.test(content)) {
            hasDeltaSpecs = true;
            break;
          }
        } catch {}
      }
      if (hasDeltaSpecs) {
        // No mainSpecsDir here on purpose: the scenario-loss check standalone
        // validate runs (#1477) is the same one buildUpdatedSpec enforces a few
        // steps later, and reporting it here would relabel that failure.
        const deltaReport = await validator.validateChangeDeltaSpecs(changeDir);
        if (!deltaReport.valid) {
          hasValidationErrors = true;
          if (!json) {
            console.log(chalk.red(`\nValidation errors in change delta specs:`));
            for (const issue of deltaReport.issues) {
              if (issue.level === 'ERROR') {
                console.log(chalk.red(`  ✗ ${issue.message}`));
              } else if (issue.level === 'WARNING') {
                console.log(chalk.yellow(`  ⚠ ${issue.message}`));
              }
            }
          }
        }
      }

      if (hasValidationErrors) {
        if (json) {
          throw new ArchiveBlockedError(
            'archive_validation_failed',
            `Validation failed for change '${changeName}'.`,
            `Run ${withStoreFlag(root, `openspec validate ${changeName}`)} for details, fix the errors, or rerun with --no-validate.`
          );
        }
        console.log(chalk.red('\nValidation failed. Please fix the errors before archiving.'));
        console.log(chalk.yellow('To skip validation (not recommended), use --no-validate flag.'));
        process.exitCode = 1;
        return null;
      }
    } else if (json) {
      if (!options.yes) {
        throw new ArchiveBlockedError(
          'archive_confirmation_required',
          'Skipping validation requires confirmation: rerun with --yes.',
          withStoreFlag(root, 'openspec archive <change-name> --json --no-validate --yes')
        );
      }
    } else {
      // Log warning when validation is skipped
      const timestamp = new Date().toISOString();

      if (!options.yes) {
        const proceed = await confirmOrBlock(
          {
            message: chalk.yellow('⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)'),
            default: false
          },
          () =>
            new ArchiveBlockedError(
              'archive_confirmation_required',
              'Skipping validation requires confirmation, and no answer could be read from stdin.',
              rerunCommand(root, changeName!, options)
            )
        );
        if (!proceed) {
          console.log('Archive cancelled.');
          return null;
        }
      } else {
        console.log(chalk.yellow(`\n⚠️  WARNING: Skipping validation may archive invalid specs.`));
      }

      console.log(chalk.yellow(`[${timestamp}] Validation skipped for change: ${changeName}`));
      console.log(chalk.yellow(`Affected files: ${changeDir}`));
    }

    // Show progress and check for incomplete tasks
    const progress = await getTaskProgressForChange(changesDir, changeName, path.resolve(changesDir, '..', '..'));
    if (!json) {
      const status = formatTaskStatus(progress);
      console.log(`Task status: ${status}`);
    }

    const incompleteTasks = Math.max(progress.total - progress.completed, 0);
    if (incompleteTasks > 0) {
      if (json) {
        if (!options.yes) {
          throw new ArchiveBlockedError(
            'archive_tasks_incomplete',
            `${incompleteTasks} incomplete task(s) found for change '${changeName}'.`,
            'Complete the tasks or rerun with --yes.'
          );
        }
      } else if (!options.yes) {
        const proceed = await confirmOrBlock(
          {
            message: `Warning: ${incompleteTasks} incomplete task(s) found. Continue?`,
            default: false
          },
          () =>
            new ArchiveBlockedError(
              'archive_tasks_incomplete',
              `${incompleteTasks} incomplete task(s) found for change '${describeChangeName(changeName!)}', and no answer could be read from stdin.`,
              `Complete the tasks or rerun with ${rerunCommand(root, changeName!, options)}`
            )
        );
        if (!proceed) {
          console.log('Archive cancelled.');
          return null;
        }
      } else {
        console.log(`Warning: ${incompleteTasks} incomplete task(s) found. Continuing due to --yes flag.`);
      }
    }

    // Settle the archive destination BEFORE touching any spec. The name depends
    // only on the change, and a collision is routine (archiving twice in a day,
    // a restored change), so discovering it after the merge would leave specs
    // rewritten - or a capability retired - for an archive that never happened.
    //
    // Names that already carry a date prefix keep it: re-prefixing would stutter
    // the name, and when the archive runs on a later day the folder would sort
    // under a day on which the change did not happen (#1309).
    const archiveName = ARCHIVE_DATE_PREFIX_PATTERN.test(changeName)
      ? changeName
      : `${formatLocalDate()}-${changeName}`;
    const archivePath = path.join(archiveDir, archiveName);

    // Read once, before any spec is touched: whether this change is allowed to
    // retire a capability at all. An unhonorable marker counts as undeclared,
    // exactly as skip_specs treats one, so metadata the rest of the CLI rejects
    // can never authorise a deletion.
    const retirementMarker = readRetireCapabilitiesMarker(changeDir);
    const retirementDeclared = retirementMarker.declared;

    let archiveExists = false;
    try {
      await fs.access(archivePath);
      archiveExists = true;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    if (archiveExists) {
      throw new ArchiveBlockedError('archive_target_exists', `Archive '${archiveName}' already exists.`);
    }

    // Handle spec updates unless skipSpecs flag is set
    let specsUpdated = false;
    let totals: ArchiveResult['totals'];
    const specWarnings: string[] = [];
    if (options.skipSpecs) {
      if (!json) {
        console.log('Skipping spec updates (--skip-specs flag provided).');
      }
    } else {
      // Find specs to update
      const specUpdates = await findSpecUpdates(changeDir, mainSpecsDir);

      if (specUpdates.length > 0) {
        if (!json) {
          console.log('\nSpecs to update:');
          for (const update of specUpdates) {
            const status = update.exists ? 'update' : 'create';
            const capability = update.id;
            console.log(`  ${capability}: ${status}`);
          }
        }

        let shouldUpdateSpecs = true;
        if (!options.yes) {
          if (json) {
            throw new ArchiveBlockedError(
              'archive_confirmation_required',
              `Updating ${specUpdates.length} spec(s) requires confirmation: rerun with --yes.`,
              withStoreFlag(root, 'openspec archive <change-name> --json --yes')
            );
          }
          shouldUpdateSpecs = await confirmOrBlock(
            {
              message: 'Proceed with spec updates?',
              default: true
            },
            () =>
              new ArchiveBlockedError(
                'archive_confirmation_required',
                `Updating ${specUpdates.length} spec(s) requires confirmation, and no answer could be read from stdin.`,
                rerunCommand(root, changeName!, options)
              )
          );
          if (!shouldUpdateSpecs) {
            console.log('Skipping spec updates. Proceeding with archive.');
          }
        }

        if (shouldUpdateSpecs) {
          // Prepare all updates first (validation pass, no writes)
          const prepared: Array<{ update: SpecUpdate; rebuilt: string; counts: { added: number; modified: number; removed: number; renamed: number }; outcome: SpecOutcome; otherSections: string[]; noRequirementBlocks: boolean; unaccountedContent: string[] }> = [];
          try {
            for (const update of specUpdates) {
              const built = await buildUpdatedSpec(update, changeName!, { silent: json });
              prepared.push({
                update,
                rebuilt: built.rebuilt,
                counts: built.counts,
                outcome: await decideSpecOutcome(update, built, skipValidation, retirementDeclared),
                otherSections: built.otherSections,
                noRequirementBlocks: built.noRequirementBlocks,
                unaccountedContent: built.unaccountedContent,
              });
              // Carried into the result so JSON mode (where nothing was
              // printed) still surfaces them; human mode discards the result.
              specWarnings.push(...built.warnings);
            }
          } catch (err: any) {
            if (json) {
              throw new ArchiveBlockedError(
                'archive_spec_update_failed',
                String(err.message || err),
                'Fix the change delta specs and rerun. No files were changed.'
              );
            }
            console.log(String(err.message || err));
            console.log('Aborted. No files were changed.');
            process.exitCode = 1;
            return null;
          }

          // Validate every rebuilt spec before writing any of them, so a
          // late validation failure really does leave all targets unchanged.
          if (!skipValidation) {
            for (const p of prepared) {
              // A retirement was already put to the validator, and failed on
              // nothing but "no requirements" - there is no spec left to write,
              // so re-reporting that one error would just abort the fix (#1302).
              if (p.outcome !== 'write') continue;
              const specName = p.update.id;
              const report = await new Validator().validateSpecContent(specName, p.rebuilt);
              if (!report.valid) {
                // The dead end #1302 describes: the rebuilt spec is unwritable
                // for exactly one reason, and retiring the capability is the
                // fix - but only the author can authorise deleting the spec, so
                // the abort names the marker instead of just rejecting. Says so
                // only when the marker is the ONLY thing missing, so it never
                // sends someone after a marker that would not have helped.
                const retirementWouldFix =
                  !retirementDeclared &&
                  p.noRequirementBlocks &&
                  p.unaccountedContent.length === 0 &&
                  p.update.exists &&
                  p.counts.removed > 0 &&
                  (await isRetirableSpec(specName, p.rebuilt));
                const retirementHint = retirementWouldFix
                  ? `This change removes the last requirement '${specName}' has. To retire the` +
                    ` capability and delete its spec, add \`retire_capabilities: true\` to the` +
                    ` change's ${METADATA_FILENAME} (alongside its \`schema:\`, which that file` +
                    ` requires), then rerun.` +
                    (retirementMarker.invalidReason
                      ? ` The marker present now cannot be honored (${retirementMarker.invalidReason}).`
                      : '')
                  : undefined;
                // The marker was set and retirement was still refused. Saying
                // nothing left the author who did exactly what the docs asked
                // back in the original dead end with no signal that their
                // marker had been read at all.
                // The author asked for a retirement and got the bare
                // validation abort. Name the lines that stood in the way.
                const refusalReason =
                  retirementDeclared &&
                  p.unaccountedContent.length > 0 &&
                  (await isRetirableSpec(specName, p.rebuilt))
                    ? `'${specName}' declares retire_capabilities, but the spec holds content outside its ` +
                      `requirements that deleting the file would take with it: ` +
                      `${p.unaccountedContent.slice(0, 3).map((line) => `"${line}"`).join(', ')}` +
                      `${p.unaccountedContent.length > 3 ? `, and ${p.unaccountedContent.length - 3} more line(s)` : ''}. ` +
                      'Move it under `## Requirements`, or delete the spec by hand.'
                    : undefined;
                if (json) {
                  throw new ArchiveBlockedError(
                    'archive_spec_validation_failed',
                    `Rebuilt spec for '${specName}' failed validation. No files were changed.`,
                    refusalReason ??
                      retirementHint ??
                      `Run ${withStoreFlag(root, `openspec validate ${specName}`)} after fixing the change deltas.`
                  );
                }
                console.log(chalk.red(`\nValidation errors in rebuilt spec for ${specName} (will not write changes):`));
                for (const issue of report.issues) {
                  if (issue.level === 'ERROR') console.log(chalk.red(`  ✗ ${issue.message}`));
                  else if (issue.level === 'WARNING') console.log(chalk.yellow(`  ⚠ ${issue.message}`));
                }
                if (retirementHint) console.log(chalk.yellow(`  → ${retirementHint}`));
                if (refusalReason) console.log(chalk.yellow(`  → ${refusalReason}`));
                console.log('Aborted. No files were changed.');
                process.exitCode = 1;
                return null;
              }
            }
          }

          // All validations passed; write files and display counts
          const writeTotals = { added: 0, modified: 0, removed: 0, renamed: 0 };
          let wroteAny = false;
          for (const p of prepared) {
            // Deletions are deferred to the loop below.
            if (p.outcome !== 'write') continue;
            const { added, modified, removed, renamed } = p.counts;
            if (added + modified + removed + renamed === 0) {
              // Every operation was already synced: rewriting the file would
              // only churn normalization differences into it.
              continue;
            }
            await writeUpdatedSpec(p.update, p.rebuilt, p.counts, {
              silent: json,
              // Cross-root paths must be absolute when a store is selected.
              ...(isStoreSelectedRoot(root) ? { displayPath: p.update.target } : {}),
            });
            wroteAny = true;
            writeTotals.added += added;
            writeTotals.modified += modified;
            writeTotals.removed += removed;
            writeTotals.renamed += renamed;
          }

          // Retirements run only after every write has succeeded: they delete a
          // file, and the write loop is not transactional. Retiring several
          // capabilities is still not atomic against itself - if a second
          // deletion fails the first is already done, which the thrown message
          // names so the state is at least legible.
          for (const p of prepared) {
            if (p.outcome !== 'retire') continue;
            const { retired, sourcePath, resolvedPath } = await retireSpec(p.update, mainSpecsDir, {
              silent: json,
              ...(isStoreSelectedRoot(root) ? { displayPath: p.update.target } : {}),
            });
            if (!retired) continue;
            wroteAny = true;
            // A rename applied on the way to the retirement still happened;
            // folding every count in keeps the totals honest about the whole
            // delta.
            writeTotals.added += p.counts.added;
            writeTotals.modified += p.counts.modified;
            writeTotals.removed += p.counts.removed;
            writeTotals.renamed += p.counts.renamed;
            // Deleting a file is the one archive outcome a JSON consumer cannot
            // infer from the totals, so it is recorded the way every other
            // spec-merge divergence is. Purpose always goes with the file, so it
            // is named too rather than left to the reader to work out, and the
            // note carries the command that brings the file back.
            const lost = ['Purpose', ...p.otherSections];
            // The path the file actually lived at. A store-selected root is not
            // under `openspec/` in the caller's repo, and a symlinked capability
            // directory puts the file somewhere else entirely - naming the
            // nominal path in either case sends the reader somewhere that does
            // not exist. `sourcePath` is set only when the file escaped the
            // specs tree, so it wins when present.
            // Derived from the path that was unlinked, never rebuilt from the
            // capability id: on a case-insensitive filesystem the id and the
            // real directory can differ in case, and git is case-sensitive, so
            // an id-derived path is one git rejects. `sourcePath` is set only
            // when the file escaped the specs tree, so it wins when present.
            // `update.target` is built from the capability id, so on a
            // case-insensitive filesystem it can differ in case from the file
            // that was actually unlinked - and git is case-sensitive, so the
            // printed command is one git rejects. A capability directory
            // symlinked to a sibling has the same problem without leaving the
            // tree. `retiredPath` carries the resolved path, so it wins
            // whenever it disagrees, not only when it escapes.
            const unlinkedPath = resolvedPath ?? p.update.target;
            // Measured against the REAL root, so the platform's own
            // `/var` -> `/private/var` link does not read as an escape. A path
            // that genuinely sits outside stays absolute, which is what routes
            // it to prose guidance instead of a command git would reject.
            const realRoot = await fs.realpath(root.path).catch(() => root.path);
            const relativeToRoot = path.relative(realRoot, unlinkedPath);
            const insideRoot =
              relativeToRoot !== '' &&
              !relativeToRoot.startsWith('..') &&
              !path.isAbsolute(relativeToRoot);
            const deletedPath =
              isStoreSelectedRoot(root) || !insideRoot
                ? unlinkedPath
                : relativeToRoot.split(path.sep).join('/');
            // A command is offered only when pasting it where archive was run
            // would actually work. An absolute path here means the file did not
            // live under that directory - a selected store, or a symlinked
            // capability directory - and `git checkout HEAD -- <abs>` is rejected
            // from a different worktree however it is quoted, so that case gets
            // guidance instead of a command that cannot run. A path with no
            // portable shell spelling is handled the same way.
            //
            // Conditional on purpose, too: whether the file is in `HEAD` is not
            // something archive knows - a spec an earlier archive CREATED and
            // nobody has committed yet is not - and promising recovery is the one
            // claim this feature must not get wrong.
            const pasteablePath = path.isAbsolute(deletedPath)
              ? undefined
              : quoteForShell(deletedPath);
            const recovery = pasteablePath
              ? `If it was committed, restore it with: git checkout HEAD -- ${pasteablePath}`
              : `It was deleted from ${deletedPath}; if it was committed, restore it from that checkout's history.`;
            const retirementNote =
              `${p.update.id} - capability retired; deleted the main spec (all requirements removed` +
              `, declared by retire_capabilities) at ${deletedPath}` +
              `. Its section(s) went with it: ${lost.join(', ')}. ` +
              recovery;
            specWarnings.push(retirementNote);
            // The "Retiring ..." line already told a human the file is gone; the
            // sections it took along, and how to get them back, are the parts
            // they cannot see from the path.
            if (!json) {
              if (p.otherSections.length > 0) {
                console.log(
                  chalk.yellow(
                    `⚠️  Warning: ${p.update.id} - the deleted spec also held section(s): ${p.otherSections.join(', ')}.`
                  )
                );
              }
              console.log(`   ${recovery}`);
            }
          }

          specsUpdated = wroteAny;
          totals = writeTotals;
          if (!json) {
            console.log(
              `Totals: + ${writeTotals.added}, ~ ${writeTotals.modified}, - ${writeTotals.removed}, → ${writeTotals.renamed}`
            );
            console.log(
              wroteAny
                ? 'Specs updated successfully.'
                : 'Specs already in sync; no files changed.'
            );
          }
        }
      }
    }

    // The destination was checked before the merge, so anything claiming it now
    // appeared while we were working. Report that as the collision it is: a raw
    // ENOTEMPTY from rename would otherwise degrade to a bare `archive_error`.
    try {
      await fs.access(archivePath);
      throw new ArchiveBlockedError('archive_target_exists', `Archive '${archiveName}' already exists.`);
    } catch (error: any) {
      if (error instanceof ArchiveBlockedError) throw error;
      if (error.code !== 'ENOENT') throw error;
    }

    // Create archive directory if needed
    await fs.mkdir(archiveDir, { recursive: true });

    // Move change to archive (uses copy+remove on EPERM/EXDEV, e.g. Windows)
    await moveDirectory(changeDir, archivePath);

    if (!json) {
      console.log(`Change '${changeName}' archived as '${archiveName}'.`);
    }

    return {
      change: changeName,
      archivedAs: archiveName,
      path: archivePath,
      specsUpdated,
      ...(totals ? { totals } : {}),
      ...(specWarnings.length > 0 ? { warnings: specWarnings } : {}),
    };
  }

  private async selectChange(
    changesDir: string,
    root: ResolvedOpenSpecRoot,
    options: ArchiveOptions
  ): Promise<string | null> {
    const { select } = await import('@inquirer/prompts');
    const changeDirs = await listActiveChangeNames(changesDir);

    if (changeDirs.length === 0) {
      console.log('No active changes found.');
      return null;
    }

    // Build choices with progress inline to avoid duplicate lists
    let choices: Array<{ name: string; value: string }> = changeDirs.map(name => ({ name, value: name }));
    try {
      const progressList: Array<{ id: string; status: string }> = [];
      for (const id of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, id, path.resolve(changesDir, '..', '..'));
        const status = formatTaskStatus(progress);
        progressList.push({ id, status });
      }
      const nameWidth = Math.max(...progressList.map(p => p.id.length));
      choices = progressList.map(p => ({
        name: `${p.id.padEnd(nameWidth)}     ${p.status}`,
        value: p.id
      }));
    } catch {
      // If anything fails, fall back to simple names
      choices = changeDirs.map(name => ({ name, value: name }));
    }

    try {
      const answer = await select({
        message: 'Select a change to archive',
        choices
      });
      return answer;
    } catch (error) {
      // Nobody to pick from the list: reporting "No change selected" and
      // exiting 0 told an agent the archive had succeeded when nothing
      // happened (#1479). The suggested rerun carries --yes because the same
      // caller cannot answer the confirmations further down either, and the
      // caller's own flags because dropping --skip-specs here would suggest a
      // rerun that merges the specs it was passed to leave alone.
      if (isNonInteractivePromptError(error)) {
        throw new ArchiveBlockedError(
          'archive_change_name_required',
          'A change name is required: no answer could be read from stdin.',
          withStoreFlag(root, `openspec archive <change-name> ${rerunFlags(options).join(' ')}`)
        );
      }
      // User cancelled (Ctrl+C)
      return null;
    }
  }
}
