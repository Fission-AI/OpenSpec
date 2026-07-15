import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// The store rename (slice 1.4) retired the pre-rename vocabulary. This
// sweep keeps it retired: no live surface may reintroduce the old tokens.
// The openspec/ planning-history tree is outside the sweep roots by
// design; the committed format literals (.openspec-store, store.yaml) do
// not match these patterns at all. The forbidden tokens are built by
// concatenation so this file stays clean under its own sweep.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// .codex/ is git-ignored local skill guidance (roadmap L8); swept when
// present, skipped when a checkout does not carry it.
const SWEEP_ROOTS = ['src', 'test', 'docs', 'scripts', '.codex'];

// Built by concatenation so this file never matches itself; the optional
// separator class covers the hyphen, underscore, fused, and spaced forms.
const FORBIDDEN_PATTERN = new RegExp('context' + '[-_ ]?store', 'i');

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.sh',
  '.txt',
]);

function* walkFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      yield* walkFiles(fullPath);
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

describe('vocabulary sweep', () => {
  it('keeps published docs on sibling archives and explicit domain creation', () => {
    const archiveOffenders: string[] = [];
    const domainOffenders: string[] = [];
    const changeIdOffenders: string[] = [];
    const publishedFiles = [
      path.join(REPO_ROOT, 'README.md'),
      path.join(REPO_ROOT, 'CHANGELOG.md'),
      ...walkFiles(path.join(REPO_ROOT, 'docs')),
    ];
    const retiredArchivePath = 'changes' + '/archive';

    for (const filePath of publishedFiles) {
      const relativePath = path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');
      if (relativePath.startsWith('docs/superpowers/')) {
        continue;
      }

      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      lines.forEach((line, index) => {
        if (line.includes(retiredArchivePath)) {
          archiveOffenders.push(`${relativePath}:${index + 1}: ${line.trim()}`);
        }

        const command = line.trim();
        if (command.startsWith('openspec new change ') && !command.includes('--domain')) {
          domainOffenders.push(`${relativePath}:${index + 1}: ${command}`);
        }
        if (
          /--change (?:"<name>"|<name>)|(?:\/opsx:(?:apply|archive|continue|verify)|openspec archive) \[?change-name/u.test(line)
        ) {
          changeIdOffenders.push(`${relativePath}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      archiveOffenders,
      `retired archive path found in published docs:\n${archiveOffenders.join('\n')}`
    ).toEqual([]);
    expect(
      domainOffenders,
      `creation example without explicit domain found:\n${domainOffenders.join('\n')}`
    ).toEqual([]);
    expect(
      changeIdOffenders,
      `non-canonical lifecycle placeholder found:\n${changeIdOffenders.join('\n')}`
    ).toEqual([]);
  });

  it('keeps the retired store vocabulary out of live surfaces', () => {
    const offenders: string[] = [];

    for (const root of SWEEP_ROOTS) {
      const rootPath = path.join(REPO_ROOT, root);
      if (!fs.existsSync(rootPath)) {
        continue;
      }

      for (const filePath of walkFiles(rootPath)) {
        const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
        lines.forEach((line, index) => {
          if (FORBIDDEN_PATTERN.test(line)) {
            offenders.push(
              `${path.relative(REPO_ROOT, filePath)}:${index + 1}: ${line.trim()}`
            );
          }
        });
      }
    }

    expect(offenders, `retired vocabulary found:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps the deleted workspace/initiative token surface from regrowing', () => {
    // The command-group deletion slice's ledger records exactly these
    // survivors; a new (workspace|initiative)_ token in src/ must be a
    // deliberate decision recorded in the ledger, not drift.
    const allowed = new Set(['initiative_option_removed']);
    const found = new Set<string>();
    const pattern = /(workspace|initiative)_[a-z_]+/g;

    for (const filePath of walkFiles(path.join(REPO_ROOT, 'src'))) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const match of content.matchAll(pattern)) {
        found.add(match[0]);
      }
    }

    expect([...found].filter((token) => !allowed.has(token)).sort()).toEqual([]);
  });
});
