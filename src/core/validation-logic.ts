import path from 'path';
import { Validator } from './validation/validator.js';
import { getActiveChangeIds, getSpecIds } from '../utils/item-discovery.js';

type ItemType = 'change' | 'spec';

export interface BulkItemResult {
  id: string;
  type: ItemType;
  valid: boolean;
  issues: { level: 'ERROR' | 'WARNING' | 'INFO'; path: string; message: string }[];
  durationMs: number;
}

export interface BulkValidationSummary {
  totals: { items: number; passed: number; failed: number };
  byType: {
    change?: { items: number; passed: number; failed: number };
    spec?: { items: number; passed: number; failed: number };
  };
}

export interface BulkValidationResult {
  items: BulkItemResult[];
  summary: BulkValidationSummary;
  version: string;
}

export async function runBulkValidation(
  scope: { changes: boolean; specs: boolean },
  opts: { strict: boolean; concurrency?: string }
): Promise<BulkValidationResult> {
  const [changeIds, specIds] = await Promise.all([
    scope.changes ? getActiveChangeIds() : Promise.resolve<string[]>([]),
    scope.specs ? getSpecIds() : Promise.resolve<string[]>([]),
  ]);

  const DEFAULT_CONCURRENCY = 6;
  const concurrency = normalizeConcurrency(opts.concurrency) ?? normalizeConcurrency(process.env.OPENSPEC_CONCURRENCY) ?? DEFAULT_CONCURRENCY;
  const validator = new Validator(opts.strict);
  const queue: Array<() => Promise<BulkItemResult>> = [];

  for (const id of changeIds) {
    queue.push(async () => {
      const start = Date.now();
      const changeDir = path.join(process.cwd(), 'openspec', 'changes', id);
      const report = await validator.validateChangeDeltaSpecs(changeDir);
      const durationMs = Date.now() - start;
      return { id, type: 'change' as const, valid: report.valid, issues: report.issues, durationMs };
    });
  }
  for (const id of specIds) {
    queue.push(async () => {
      const start = Date.now();
      const file = path.join(process.cwd(), 'openspec', 'specs', id, 'spec.md');
      const report = await validator.validateSpec(file);
      const durationMs = Date.now() - start;
      return { id, type: 'spec' as const, valid: report.valid, issues: report.issues, durationMs };
    });
  }

  const results: BulkItemResult[] = [];
  let index = 0;
  let running = 0;
  let passed = 0;
  let failed = 0;

  if (queue.length > 0) {
    await new Promise<void>((resolve) => {
      const next = () => {
        while (running < concurrency && index < queue.length) {
          const currentIndex = index++;
          const task = queue[currentIndex];
          running++;
          task()
            .then(res => {
              results.push(res);
              if (res.valid) passed++; else failed++;
            })
            .catch((error: any) => {
              const message = error?.message || 'Unknown error';
              const res: BulkItemResult = { 
                id: getPlannedId(currentIndex, changeIds, specIds) ?? 'unknown', 
                type: getPlannedType(currentIndex, changeIds, specIds) ?? 'change', 
                valid: false, 
                issues: [{ level: 'ERROR', path: 'file', message }], 
                durationMs: 0 
              };
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
  }

  results.sort((a, b) => a.id.localeCompare(b.id));

  const summary = {
    totals: { items: results.length, passed, failed },
    byType: {
      ...(scope.changes ? { change: summarizeType(results, 'change') } : {}),
      ...(scope.specs ? { spec: summarizeType(results, 'spec') } : {}),
    },
  };

  return {
    items: results,
    summary,
    version: '1.0'
  };
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
