import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange } from '../utils/task-progress.js';
import { Validator } from './validation/validator.js';
import {
  findSpecUpdates,
  buildUpdatedSpec,
  writeUpdatedSpec,
  type SpecUpdate,
} from './specs-apply.js';
import { resolveOpenSpecDir } from './path-resolver.js';
import { FileSystemUtils } from '../utils/file-system.js';

export interface ArchiveResult {
  changeName: string;
  archiveName: string;
  taskStatus: { total: number; completed: number };
  validationReport?: any;
  specUpdates: Array<{ capability: string; status: 'create' | 'update' }>;
  totals: { added: number; modified: number; removed: number; renamed: number };
  alreadyExists?: boolean;
}

export class ValidationError extends Error {
    constructor(public report: any) {
        super('Validation failed');
        this.name = 'ValidationError';
    }
}

export async function runArchive(
  changeName: string,
  options: { skipSpecs?: boolean; noValidate?: boolean; validate?: boolean; throwOnValidationError?: boolean } = {}
): Promise<ArchiveResult> {
  const targetPath = '.';
  const openspecPath = await resolveOpenSpecDir(targetPath);
  const changesDir = path.join(openspecPath, 'changes');
  const archiveDir = path.join(changesDir, 'archive');
  const mainSpecsDir = path.join(openspecPath, 'specs');

  // Check if changes directory exists
  if (!await FileSystemUtils.directoryExists(changesDir)) {
    throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
  }

  const changeDir = path.join(changesDir, changeName);

  // Verify change exists
  try {
    const stat = await fs.stat(changeDir);
    if (!stat.isDirectory()) {
      throw new Error(`Change '${changeName}' not found.`);
    }
  } catch {
    throw new Error(`Change '${changeName}' not found.`);
  }

  const skipValidation = options.validate === false || options.noValidate === true;
  let validationReport: any = { valid: true, issues: [] };

  if (!skipValidation) {
    const validator = new Validator();
    const deltaReport = await validator.validateChangeDeltaSpecs(changeDir);
    validationReport = deltaReport;
    if (!deltaReport.valid && options.throwOnValidationError) {
        throw new ValidationError(deltaReport);
    }
    // For non-throwing logic, we still might want to stop if invalid
    if (!deltaReport.valid) {
        return {
            changeName,
            archiveName: '',
            taskStatus: await getTaskProgressForChange(changesDir, changeName),
            validationReport,
            specUpdates: [],
            totals: { added: 0, modified: 0, removed: 0, renamed: 0 }
        };
    }
  }

  const progress = await getTaskProgressForChange(changesDir, changeName);
  
  const specUpdates: Array<{ capability: string; status: 'create' | 'update' }> = [];
  let totals = { added: 0, modified: 0, removed: 0, renamed: 0 };

  if (!options.skipSpecs) {
    const updates = await findSpecUpdates(changeDir, mainSpecsDir);
    for (const update of updates) {
      specUpdates.push({
        capability: path.basename(path.dirname(update.target)),
        status: update.exists ? 'update' : 'create'
      });
    }

    const prepared: Array<{ update: SpecUpdate; rebuilt: string; counts: { added: number; modified: number; removed: number; renamed: number } }> = [];
    for (const update of updates) {
      const built = await buildUpdatedSpec(update, changeName);
      prepared.push({ update, rebuilt: built.rebuilt, counts: built.counts });
    }

    for (const p of prepared) {
      const specName = path.basename(path.dirname(p.update.target));
      if (!skipValidation) {
        const report = await new Validator().validateSpecContent(specName, p.rebuilt);
        if (!report.valid) {
          if (options.throwOnValidationError) throw new ValidationError(report);
          throw new Error(`Validation failed for rebuilt spec: ${specName}`);
        }
      }
      await writeUpdatedSpec(p.update, p.rebuilt);
      totals.added += p.counts.added;
      totals.modified += p.counts.modified;
      totals.removed += p.counts.removed;
      totals.renamed += p.counts.renamed;
    }
  }

  const archiveDate = new Date().toISOString().split('T')[0];
  const archiveName = `${archiveDate}-${changeName}`;
  const archivePath = path.join(archiveDir, archiveName);

  // Check if archive already exists
  if (await FileSystemUtils.directoryExists(archivePath)) {
      return {
          changeName,
          archiveName,
          taskStatus: progress,
          specUpdates,
          totals,
          alreadyExists: true
      };
  }

  await fs.mkdir(archiveDir, { recursive: true });
  await fs.rename(changeDir, archivePath);

  return {
    changeName,
    archiveName,
    taskStatus: progress,
    validationReport,
    specUpdates,
    totals
  };
}