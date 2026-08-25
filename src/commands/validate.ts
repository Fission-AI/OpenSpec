import ora from 'ora';
import path from 'path';
import { Validator } from '../core/validation/validator.js';
import { VALIDATION_MESSAGES } from '../core/validation/constants.js';
import {
  resolveRootForCommand,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
  isStoreSelectedRoot,
} from '../core/root-selection.js';
import { isInteractive, resolveNoInteractive } from '../utils/interactive.js';
import { getSpecIds } from '../utils/item-discovery.js';
import { getAvailableChanges } from './workflow/shared.js';
import { nearestMatches } from '../utils/match.js';
import { promises as fs } from 'fs';
import { getTaskProgressDetailForChange, type SchemaGlobCache } from '../utils/task-progress.js';
import { FileSystemUtils } from '../utils/file-system.js';

type ItemType = 'change' | 'spec';

interface ExecuteOptions {
  all?: boolean;
  changes?: boolean;
  specs?: boolean;
  archived?: boolean;
  type?: string;
  strict?: boolean;
  json?: boolean;
  noInteractive?: boolean;
  interactive?: boolean; // Commander 在使用 --no-interactive 时将其设置为 false
  concurrency?: string;
  store?: string;
  storePath?: string;
}

interface BulkItemResult {
  id: string;
  type: ItemType;
  valid: boolean;
  issues: { level: 'ERROR' | 'WARNING' | 'INFO'; path: string; message: string }[];
  durationMs: number;
}

export class ValidateCommand {
  async execute(itemName: string | undefined, options: ExecuteOptions = {}): Promise<void> {
    const bulk = options.all || options.changes || options.specs;
    const root = await resolveRootForCommand(options, {
      json: options.json,
      ...(bulk ? { allowImplicitRoot: false } : {}),
    });
    if (!root) {
      return;
    }

    const interactive = isInteractive(options);

    // Archived-task linting is its own scope: it checks task completion of
    // already-archived changes, not delta specs (whose operations are already
    // applied). Handled before the other bulk flags so `--archived` is explicit
    // and never alters an existing invocation's behavior (#205).
    if (options.archived) {
      await this.runArchivedTaskValidation(root, {
        json: !!options.json,
        noInteractive: resolveNoInteractive(options),
      });
      return;
    }

    // Handle bulk flags first
    if (bulk) {
      await this.runBulkValidation(root, {
        changes: !!options.all || !!options.changes,
        specs: !!options.all || !!options.specs,
      }, { strict: !!options.strict, json: !!options.json, concurrency: options.concurrency, noInteractive: resolveNoInteractive(options) });
      return;
    }

    // No item and no flags
    if (!itemName) {
      if (interactive) {
        await this.runInteractiveSelector(root, { strict: !!options.strict, json: !!options.json, concurrency: options.concurrency });
        return;
      }
      this.printNonInteractiveHint(root);
      process.exitCode = 1;
      return;
    }

    // Direct item validation with type detection or override
    const typeOverride = this.normalizeType(options.type);
    await this.validateDirectItem(root, itemName, { typeOverride, strict: !!options.strict, json: !!options.json });
  }

  private normalizeType(value?: string): ItemType | undefined {
    if (!value) return undefined;
    const v = value.toLowerCase();
    if (v === 'change' || v === 'spec') return v;
    return undefined;
  }

  /**
   * Resolve change IDs by directory existence within the resolved root — the
   * same rule `openspec status`/`instructions` use (`getAvailableChanges`) —
   * rather than requiring `proposal.md`. This lets `validate` resolve a
   * scaffolded or still-authoring change that the sibling commands already
   * resolve (#1182). Sorted to preserve the prior `getActiveChangeIds` ordering.
   */
  private async listChangeIds(root: ResolvedOpenSpecRoot): Promise<string[]> {
    const ids = await getAvailableChanges(root.path, root.changesDir);
    return ids.sort();
  }

  private async runInteractiveSelector(root: ResolvedOpenSpecRoot, opts: { strict: boolean; json: boolean; concurrency?: string }): Promise<void> {
    const { select } = await import('@inquirer/prompts');
    const choice = await select({
      message: '请选择要验证的内容：',
      choices: [
        { name: '全部（changes + specs）', value: 'all' },
        { name: '所有 changes', value: 'changes' },
        { name: '所有 specs', value: 'specs' },
        { name: '选择特定的 change 或 spec', value: 'one' },
      ],
    });

    if (choice === 'all') return this.runBulkValidation(root, { changes: true, specs: true }, opts);
    if (choice === 'changes') return this.runBulkValidation(root, { changes: true, specs: false }, opts);
    if (choice === 'specs') return this.runBulkValidation(root, { changes: false, specs: true }, opts);

    // one
    const [changes, specs] = await Promise.all([this.listChangeIds(root), getSpecIds(root.path)]);
    const items: { name: string; value: { type: ItemType; id: string } }[] = [];
    items.push(...changes.map(id => ({ name: `change/${id}`, value: { type: 'change' as const, id } })));
    items.push(...specs.map(id => ({ name: `spec/${id}`, value: { type: 'spec' as const, id } })));
    if (items.length === 0) {
      console.error('未找到可验证的项目。');
      process.exitCode = 1;
      return;
    }
    const picked = await select<{ type: ItemType; id: string }>({ message: '选择一个项目', choices: items });
    await this.validateByType(root, picked.type, picked.id, opts);
  }

  private printNonInteractiveHint(root: ResolvedOpenSpecRoot): void {
    console.error('没有可验证的内容。请尝试以下方法：');
    console.error(`  ${withStoreFlag(root, 'openspec validate --all')}`);
    console.error(`  ${withStoreFlag(root, 'openspec validate --changes')}`);
    console.error(`  ${withStoreFlag(root, 'openspec validate --specs')}`);
    console.error(`  ${withStoreFlag(root, 'openspec validate <item-name>')}`);
    console.error('或在交互式终端中运行。');
  }

  private async validateDirectItem(root: ResolvedOpenSpecRoot, itemName: string, opts: { typeOverride?: ItemType; strict: boolean; json: boolean }): Promise<void> {
    const [changes, specs] = await Promise.all([this.listChangeIds(root), getSpecIds(root.path)]);
    const isChange = changes.includes(itemName);
    const isSpec = specs.includes(itemName);

    const type = opts.typeOverride ?? (isChange ? 'change' : isSpec ? 'spec' : undefined);

    if (!type) {
      const suggestions = nearestMatches(itemName, [...changes, ...specs]);
      const message = suggestions.length
        ? `未知项目 '${itemName}'。您是否指：${suggestions.join(', ')}？`
        : `未知项目 '${itemName}'。`;
      if (opts.json) {
        console.log(
          JSON.stringify(
            { status: [{ severity: 'error', code: 'unknown_item', message }] },
            null,
            2
          )
        );
      } else {
        console.error(message);
      }
      process.exitCode = 1;
      return;
    }

    if (!opts.typeOverride && isChange && isSpec) {
      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              status: [
                {
                  severity: 'error',
                  code: 'ambiguous_item',
                  message: `歧义项目 '${itemName}' 同时匹配 change 和 spec。`,
                  fix: '请传递 --type change|spec。',
                },
              ],
            },
            null,
            2
          )
        );
        process.exitCode = 1;
        return;
      }
      console.error(`歧义项目 '${itemName}' 同时匹配 change 和 spec。`);
      // 名词形式的命令基于当前工作目录，无法访问已选存储。
      if (isStoreSelectedRoot(root)) {
        console.error('请传递 --type change|spec。');
      } else {
        console.error('请传递 --type change|spec，或使用：openspec change validate / openspec spec validate');
      }
      process.exitCode = 1;
      return;
    }

    await this.validateByType(root, type, itemName, opts);
  }

  private async validateByType(root: ResolvedOpenSpecRoot, type: ItemType, id: string, opts: { strict: boolean; json: boolean }): Promise<void> {
    const validator = new Validator(opts.strict);
    if (type === 'change') {
      const changeDir = path.join(root.changesDir, id);
      const start = Date.now();
      const report = await validator.validateChangeDeltaSpecs(changeDir, {
        mainSpecsDir: root.specsDir,
        projectRoot: root.path,
      });
      const durationMs = Date.now() - start;
      this.printReport('change', id, report, durationMs, opts.json, root);
      // Non-zero exit if invalid (keeps enriched output test semantics)
      process.exitCode = report.valid ? 0 : 1;
      return;
    }
    const file = path.join(root.specsDir, id, 'spec.md');
    const start = Date.now();
    const report = await validator.validateSpec(file);
    const durationMs = Date.now() - start;
    this.printReport('spec', id, report, durationMs, opts.json, root);
    process.exitCode = report.valid ? 0 : 1;
  }

  private printReport(type: ItemType, id: string, report: { valid: boolean; issues: any[] }, durationMs: number, json: boolean, root: ResolvedOpenSpecRoot): void {
    if (json) {
      const out = { items: [{ id, type, valid: report.valid, issues: report.issues, durationMs }], summary: { totals: { items: 1, passed: report.valid ? 1 : 0, failed: report.valid ? 0 : 1 }, byType: { [type]: { items: 1, passed: report.valid ? 1 : 0, failed: report.valid ? 0 : 1 } } }, version: '1.0', root: toRootOutput(root) };
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (report.valid) {
      console.log(`${type === 'change' ? 'Change' : 'Specification'} '${id}' 有效`);
    } else {
      console.error(`${type === 'change' ? 'Change' : 'Specification'} '${id}' 存在问题`);
      for (const issue of report.issues) {
        const label = issue.level === 'ERROR' ? '错误' : issue.level;
        const prefix = issue.level === 'ERROR' ? '✗' : issue.level === 'WARNING' ? '⚠' : 'ℹ';
        console.error(`${prefix} [${label}] ${issue.path}: ${issue.message}`);
      }
      this.printNextSteps(type, id, root, report.issues);
    }
  }

  private printNextSteps(type: ItemType, id: string, root: ResolvedOpenSpecRoot, issues: Array<{ message: string }> = []): void {
    const bullets: string[] = [];
    // The delta-authoring bullets contradict a marker-related error ("add
    // deltas" vs "remove skip_specs or the files"), so branch on the exact
    // marker messages - the generic no-deltas guidance also mentions
    // skip_specs, which must not trigger this.
    const conflictIssue = issues.some(i =>
      i.message.includes(VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_CONFLICT)
    );
    const invalidMarkerIssue = issues.some(i =>
      i.message.includes(VALIDATION_MESSAGES.CHANGE_SKIP_SPECS_INVALID_METADATA)
    );
    if (type === 'change' && conflictIssue) {
      bullets.push('- 此 change 声明了 skip_specs（无 spec 增量）：删除 specs/ 下的文件，或在 requirements 确实变更时从 .openspec.yaml 中移除 skip_specs');
      bullets.push('- skip_specs 仅在 .openspec.yaml 是有效的 change 元数据时生效（需要 schema: <name> 来命名已知 schema）');
    } else if (type === 'change' && invalidMarkerIssue) {
      bullets.push('- 修复 .openspec.yaml 以便 skip_specs 标记可以生效（需要 schema: <name> 来命名已知 schema）');
      bullets.push('- 或从 .openspec.yaml 中移除 skip_specs 并添加 spec 增量');
    } else if (type === 'change') {
      bullets.push('- 确保 change 在 specs/ 中有增量：使用 ## ADDED/MODIFIED/REMOVED/RENAMED Requirements 标题');
      bullets.push('- 每个需求必须至少包含一个 #### Scenario: 块');
      bullets.push(`- 调试解析的增量：${withStoreFlag(root, `openspec show ${id} --json --deltas-only`)}`);
    } else {
      bullets.push('- 确保 spec 包含 ## 目的 和 ## 需求 部分');
      bullets.push('- 每个需求必须至少包含一个 #### Scenario: 块');
      bullets.push('- 使用 --json 重新运行以查看结构化报告');
    }
    console.error('后续步骤：');
    bullets.forEach(b => console.error(`  ${b}`));
  }

  private async runBulkValidation(root: ResolvedOpenSpecRoot, scope: { changes: boolean; specs: boolean }, opts: { strict: boolean; json: boolean; concurrency?: string; noInteractive?: boolean }): Promise<void> {
    const spinner = !opts.json && !opts.noInteractive ? ora('正在验证...').start() : undefined;
    const [changeIds, specIds] = await Promise.all([
      scope.changes ? this.listChangeIds(root) : Promise.resolve<string[]>([]),
      scope.specs ? getSpecIds(root.path) : Promise.resolve<string[]>([]),
    ]);

    const DEFAULT_CONCURRENCY = 6;
    const maxSuggestions = 5; // used by nearestMatches
    const concurrency = normalizeConcurrency(opts.concurrency) ?? normalizeConcurrency(process.env.OPENSPEC_CONCURRENCY) ?? DEFAULT_CONCURRENCY;
    const validator = new Validator(opts.strict);
    const queue: Array<() => Promise<BulkItemResult>> = [];

    for (const id of changeIds) {
      queue.push(async () => {
        const start = Date.now();
        const changeDir = path.join(root.changesDir, id);
        const report = await validator.validateChangeDeltaSpecs(changeDir, {
          mainSpecsDir: root.specsDir,
          projectRoot: root.path,
        });
        const durationMs = Date.now() - start;
        return { id, type: 'change' as const, valid: report.valid, issues: report.issues, durationMs };
      });
    }
    for (const id of specIds) {
      queue.push(async () => {
        const start = Date.now();
        const file = path.join(root.specsDir, id, 'spec.md');
        const report = await validator.validateSpec(file);
        const durationMs = Date.now() - start;
        return { id, type: 'spec' as const, valid: report.valid, issues: report.issues, durationMs };
      });
    }

    if (queue.length === 0) {
      spinner?.stop();

      const summary = {
        totals: { items: 0, passed: 0, failed: 0 },
        byType: {
          ...(scope.changes ? { change: { items: 0, passed: 0, failed: 0 } } : {}),
          ...(scope.specs ? { spec: { items: 0, passed: 0, failed: 0 } } : {}),
        },
      } as const;

      if (opts.json) {
        const out = { items: [] as BulkItemResult[], summary, version: '1.0', root: toRootOutput(root) };
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log('未找到可验证的项目。');
      }

      process.exitCode = 0;
      return;
    }

    const results: BulkItemResult[] = [];
    let index = 0;
    let running = 0;
    let passed = 0;
    let failed = 0;

    await new Promise<void>((resolve) => {
      const next = () => {
        while (running < concurrency && index < queue.length) {
          const currentIndex = index++;
          const task = queue[currentIndex];
          running++;
          if (spinner) spinner.text = `正在验证（${currentIndex + 1}/${queue.length}）...`;
          task()
            .then(res => {
              results.push(res);
              if (res.valid) passed++; else failed++;
            })
            .catch((error: any) => {
              const message = error?.message || 'Unknown error';
              const res: BulkItemResult = { id: getPlannedId(currentIndex, changeIds, specIds) ?? 'unknown', type: getPlannedType(currentIndex, changeIds, specIds) ?? 'change', valid: false, issues: [{ level: 'ERROR', path: 'file', message }], durationMs: 0 };
              results.push(res);
              failed++;
            })
            .finally(() => {
              running--;
              if (index >= queue.length && running === 0) resolve();
              else next();
            });
        }
      };
      next();
    });

    spinner?.stop();

    results.sort((a, b) => a.id.localeCompare(b.id));
    const summary = {
      totals: { items: results.length, passed, failed },
      byType: {
        ...(scope.changes ? { change: summarizeType(results, 'change') } : {}),
        ...(scope.specs ? { spec: summarizeType(results, 'spec') } : {}),
      },
    } as const;

    if (opts.json) {
      const out = { items: results, summary, version: '1.0', root: toRootOutput(root) };
      console.log(JSON.stringify(out, null, 2));
    } else {
      for (const res of results) {
        if (res.valid) console.log(`✓ ${res.type}/${res.id}`);
        else console.error(`✗ ${res.type}/${res.id}`);
      }
      console.log(`总计：${summary.totals.passed} 通过，${summary.totals.failed} 失败（${summary.totals.items} 个项目）`);
      const firstFailure = results.find((res) => !res.valid);
      if (firstFailure) {
        const storeFlag = isStoreSelectedRoot(root) ? ` --store ${root.storeId}` : '';
        console.log(
          `详情：openspec validate ${firstFailure.id} --type ${firstFailure.type}${storeFlag}`
        );
      }
    }

    process.exitCode = failed > 0 ? 1 : 0;
  }

  /**
   * Lists archived change ids from the resolved root's archive directory,
   * mirroring `getArchivedChangeIds` but store-aware (uses `root.archiveDir`
   * rather than a cwd-relative path). Directories only, hidden entries skipped.
   *
   * Only a missing archive directory (ENOENT) is an empty list; a permission
   * error, an I/O error, or an `archive` path that is a file (ENOTDIR) is a real
   * failure and must not read as "no archived changes" — that would let a
   * pre-commit lint pass without inspecting anything (#205).
   */
  private async listArchivedChangeIds(root: ResolvedOpenSpecRoot): Promise<string[]> {
    try {
      const entries = await fs.readdir(root.archiveDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort();
    } catch (error: any) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Validates that every archived change has all of its tasks completed.
   *
   * An archived change is expected to be finished; an archived change with
   * unchecked tasks is a real integrity problem the normal validate flow never
   * surfaces, because active-change discovery excludes the archive directory
   * (#205). Reuses the same task-progress counting `status`, `list`, and
   * `archive` rely on, so what counts as a task never forks. Changes with no
   * tasks pass (nothing to complete).
   */
  private async runArchivedTaskValidation(
    root: ResolvedOpenSpecRoot,
    opts: { json: boolean; noInteractive?: boolean }
  ): Promise<void> {
    // List first (may throw on a real archive-read failure), then start the
    // spinner so a thrown error never leaves a spinner spinning.
    const ids = await this.listArchivedChangeIds(root);
    const spinner = !opts.json && !opts.noInteractive ? ora('正在验证已归档的 changes...').start() : undefined;

    // The archive is append-only and can hold thousands of changes; a single
    // run resolves them all under one constant projectRoot (root.path), so
    // memoize the schema→glob lookup to avoid re-parsing the same schema.yaml
    // once per change. The loop is intentionally sequential: the per-change work
    // is dominated by synchronous schema/config resolution, which a promise pool
    // cannot overlap on Node's single thread — a pool would add complexity for
    // no real gain here.
    const schemaGlobCache: SchemaGlobCache = new Map();
    const results: BulkItemResult[] = [];
    let passed = 0;
    let failed = 0;
    for (const id of ids) {
      const start = Date.now();
      const issues: BulkItemResult['issues'] = [];
      try {
        // The explicit root.path override is load-bearing: an archived change
        // lives one directory deeper (changes/archive/<id>), so the default
        // "../../.." projectRoot derivation would be wrong without it.
        const progress = await getTaskProgressDetailForChange(root.archiveDir, id, root.path, schemaGlobCache);
        // A tasks file that exists but cannot be read must fail loudly, not be
        // silently counted as "no tasks" and pass. Report one issue per file,
        // pathed like every other validate issue (POSIX, root-relative).
        for (const file of progress.unreadable) {
          issues.push({
            level: 'ERROR',
            path: FileSystemUtils.toPosixPath(path.relative(root.path, file)),
            message: '无法读取任务文件',
          });
        }
        const incomplete = Math.max(progress.total - progress.completed, 0);
        if (incomplete > 0) {
          issues.push({
            level: 'ERROR',
            path: 'tasks.md',
            message: `${incomplete} 个未完成的任务（${progress.completed}/${progress.total} 已完成）`,
          });
        }
      } catch (error: any) {
        issues.push({ level: 'ERROR', path: 'tasks.md', message: error?.message || 'Unknown error' });
      }
      const valid = issues.length === 0;
      if (valid) passed++; else failed++;
      results.push({ id, type: 'change', valid, issues, durationMs: Date.now() - start });
    }

    spinner?.stop();

    const summary = {
      totals: { items: results.length, passed, failed },
      byType: { change: summarizeType(results, 'change') },
    } as const;

    if (opts.json) {
      const out = { items: results, summary, version: '1.0', root: toRootOutput(root) };
      console.log(JSON.stringify(out, null, 2));
      process.exitCode = failed > 0 ? 1 : 0;
      return;
    }

    if (results.length === 0) {
      console.log('No archived changes found.');
      process.exitCode = 0;
      return;
    }

    // Use the same `<type>/<id>` prefix bulk validation prints, so the plain
    // output maps to the JSON `type` ('change') and stays greppable the same way.
    for (const res of results) {
      if (res.valid) {
        console.log(`✓ change/${res.id}`);
      } else {
        console.error(`✗ change/${res.id}`);
        for (const issue of res.issues) {
          const prefix = issue.level === 'ERROR' ? '✗' : issue.level === 'WARNING' ? '⚠' : 'ℹ';
          console.error(`  ${prefix} ${issue.message}`);
        }
      }
    }
    console.log(`Totals: ${summary.totals.passed} passed, ${summary.totals.failed} failed (${summary.totals.items} items)`);
    process.exitCode = failed > 0 ? 1 : 0;
  }
}

function summarizeType(results: BulkItemResult[], type: ItemType) {
  const filtered = results.filter(r => r.type === type);
  const items = filtered.length;
  const passed = filtered.filter(r => r.valid).length;
  const failed = items - passed;
  return { items, passed, failed };
}

function normalizeConcurrency(value?: string): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

function getPlannedId(index: number, changeIds: string[], specIds: string[]): string | undefined {
  const totalChanges = changeIds.length;
  if (index < totalChanges) return changeIds[index];
  const specIndex = index - totalChanges;
  return specIds[specIndex];
}

function getPlannedType(index: number, changeIds: string[], specIds: string[]): ItemType | undefined {
  const totalChanges = changeIds.length;
  if (index < totalChanges) return 'change';
  const specIndex = index - totalChanges;
  if (specIndex >= 0 && specIndex < specIds.length) return 'spec';
  return undefined;
}
