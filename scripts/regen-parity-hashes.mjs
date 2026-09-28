#!/usr/bin/env node

/**
 * Regenerate the golden hashes in `test/core/templates/skill-templates-parity.test.ts`.
 *
 * That test pins a SHA-256 per template so an unintended edit to any workflow
 * template fails loudly. The flip side is that every *intended* edit leaves the
 * pinned hashes stale, and two branches editing different templates collide on
 * the same hash map — so a rebase means recomputing them by hand, which is
 * where transcription mistakes creep in.
 *
 * This script recomputes every pinned hash from the built `dist/` and rewrites
 * the map in place, reporting exactly which entries moved.
 *
 * Three things are hard errors rather than silent skips, because "nothing to
 * update" has to mean it:
 *   - a `dist/` older than `src/`, which would pin hashes from a stale build
 *     that the parity test (which reads `src/`) then rejects
 *   - a pinned label with no matching export (a renamed or deleted template)
 *   - a pinned hash whose line the patterns do not recognise, which would
 *     otherwise be left stale while the run reported success
 *
 * The last two live in `parity-hash-shared.mjs` so they can be exercised against
 * fabricated input; see `test/core/templates/parity-hash-shared.test.ts`.
 *
 * It cannot silently produce wrong hashes: the parity test recomputes them
 * independently and compares. If `stableStringify` ever drifted from the test's
 * copy, the test fails. Always run the test afterwards - that check, not this
 * script, is the authority.
 *
 * Usage:
 *   pnpm build && pnpm regen:parity-hashes && pnpm vitest run test/core/templates/skill-templates-parity.test.ts
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rewriteParityHashes, stableStringify } from './parity-hash-shared.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distUrl = (p) => pathToFileURL(join(repoRoot, 'dist', p)).href;

/** Newest mtime under a directory, or -1 if it does not exist. */
function newestMtime(dir) {
  let newest = -1;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return newest;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    const mtime = entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

// Hashes are computed from dist/, but the parity test recomputes them from
// src/. Regenerating against a stale build therefore writes hashes the test
// then rejects, after reporting "nothing to update" - a false all-clear on the
// most common mistake there is, forgetting to build. Refuse to guess.
const srcMtime = newestMtime(join(repoRoot, 'src'));
const distMtime = newestMtime(join(repoRoot, 'dist'));
if (distMtime < 0) {
  throw new Error('dist/ is missing. Run `pnpm build` first - hashes are computed from the build.');
}
if (srcMtime > distMtime) {
  throw new Error(
    'dist/ is older than src/, so the hashes would be computed from a stale build\n' +
      'and the parity test - which reads src/ - would reject them. Run `pnpm build` first.'
  );
}

const templates = await import(distUrl('core/templates/skill-templates.js'));
const { getSkillTemplates, generateSkillContent } = await import(
  distUrl('core/shared/skill-generation.js')
);

const TEST_FILE = join(repoRoot, 'test/core/templates/skill-templates-parity.test.ts');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// The generated-content hashes are keyed by skill directory. Read that mapping
// from the same production helper the skills.sh generator uses, so a new
// workflow never needs a second list kept in sync here.
const PARITY_BASELINE = 'PARITY-BASELINE';
const contentByDir = new Map(
  getSkillTemplates().map(({ dirName, template }) => [
    dirName,
    sha256(generateSkillContent(template, PARITY_BASELINE)),
  ])
);

const { source, moved } = rewriteParityHashes(readFileSync(TEST_FILE, 'utf-8'), {
  resolveFunctionHash: (name) =>
    typeof templates[name] === 'function' ? sha256(stableStringify(templates[name]())) : undefined,
  resolveContentHash: (dirName) => contentByDir.get(dirName),
  knownContentKeys: contentByDir.keys(),
  sourceLabel: TEST_FILE,
});

writeFileSync(TEST_FILE, source);

if (moved.length === 0) {
  console.log('Parity hashes already match the build - nothing to update.');
} else {
  console.log(`Updated ${moved.length} parity hash(es):`);
  for (const name of moved) console.log(`  ${name}`);
}
console.log('\nNow run: pnpm vitest run test/core/templates/skill-templates-parity.test.ts');
