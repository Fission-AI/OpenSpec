import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Guard test for the ClearSpec rebrand (complete-clearspec-rebrand).
 *
 * Asserts that the term "openspec" (case-insensitive) does not reappear in
 * ClearSpec's product source or shipped schemas. This is the enforceable
 * invariant from the rebrand: ClearSpec is a fork of OpenSpec and must not carry
 * the upstream brand in the code it ships or the artifacts it generates.
 *
 * Intentionally NOT scanned (documented exceptions):
 * - `src/core/legacy-cleanup.ts` — references `openspec/` in coexistence comments
 *   explaining why ClearSpec never touches an OpenSpec-owned directory.
 * - The repository's own `openspec/` planning folder and `.claude/` skills — the
 *   OpenSpec dev instance used to build ClearSpec (design Decision 7), out of band.
 * - `docs/migration-guide.md` — a migration guide legitimately documents the
 *   legacy layout being migrated away from.
 * - `LICENSE` — retains its original MIT attribution.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const SCAN_ROOTS = ['src', 'schemas'];
const ALLOWED_FILES = new Set<string>([
  path.join('src', 'core', 'legacy-cleanup.ts'),
]);
const SKIP_DIRS = new Set(['node_modules', 'dist', '__tests__']);

async function collectFiles(dir: string, acc: string[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collectFiles(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
}

describe('no openspec branding in product surfaces', () => {
  it('contains no "openspec" references in src/ or schemas/ (except documented exceptions)', async () => {
    const files: string[] = [];
    for (const root of SCAN_ROOTS) {
      await collectFiles(path.join(repoRoot, root), files);
    }

    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(repoRoot, file);
      if (ALLOWED_FILES.has(rel)) continue;
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/openspec/i.test(line)) {
          offenders.push(`${rel}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders, `Unexpected "openspec" references:\n${offenders.join('\n')}`).toEqual([]);
  });
});
