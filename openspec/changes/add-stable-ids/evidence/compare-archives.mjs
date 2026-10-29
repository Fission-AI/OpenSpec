// Rebuild every archived delta against the main spec as it stood just before
// it was archived, with two OpenSpec builds, and compare the results byte for
// byte (or the refusal message). Each build is a checkout with `node build.js` run.
// Usage: node compare-archives.mjs <git-dir> <base-checkout> <patched-checkout>
// Result for #1979: OpenSpec 168, ai-dial-chat 1,318, OpenLore 350, sku 13 and
// spec-ctx 173 deltas, all identical.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [gitDir, baseRoot, patchedRoot] = process.argv.slice(2);
const git = (...args) => execFileSync('git', ['--git-dir', gitDir, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const show = (rev, p) => { try { return git('show', `${rev}:${p}`); } catch { return undefined; } };
const load = async (root) => import(pathToFileURL(join(resolve(root), 'dist/core/specs-apply.js')).href);
const builds = { base: await load(baseRoot), patched: await load(patchedRoot) };

const log = git('log', '--all', '--diff-filter=A', '--name-only', '--format=@%H', '--', ':(glob)**/changes/archive/*/specs/**/spec.md');
const items = [];
let commit;
for (const line of log.split('\n')) {
  if (line.startsWith('@')) commit = line.slice(1);
  else if (line.trim()) {
    const m = line.match(/^(.*?)changes\/archive\/([^/]+)\/specs\/(.+)\/spec\.md$/);
    if (m) items.push({ commit, delta: line, root: m[1], id: m[3] });
  }
}
const seen = new Set();
const work = realpathSync(mkdtempSync(join(tmpdir(), 'cmp-')));
let identical = 0, differ = 0, refusedBoth = 0, skipped = 0, withIds = 0;
const diffs = [];
for (const item of items) {
  const key = `${item.delta}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const delta = show(item.commit, item.delta);
  if (delta === undefined) { skipped++; continue; }
  const main = show(`${item.commit}^`, `${item.root}specs/${item.id}/spec.md`);
  if (/^#{3,4}\s*(Requirement|Scenario):\s*(\[[A-Za-z][\w-]*\d\]|[A-Z][A-Z0-9]*(-[A-Z0-9]+)*-\d+)/m.test((main ?? '') + delta)) withIds++;
  const out = {};
  for (const [name, m] of Object.entries(builds)) {
    const dir = join(work, `${seen.size}-${name}`);
    const specsRoot = join(dir, 'specs');
    const changeDir = join(dir, 'change');
    mkdirSync(join(changeDir, 'specs', item.id), { recursive: true });
    mkdirSync(join(specsRoot, item.id), { recursive: true });
    writeFileSync(join(changeDir, 'specs', item.id, 'spec.md'), delta);
    if (main !== undefined) writeFileSync(join(specsRoot, item.id, 'spec.md'), main);
    try {
      const updates = await m.findSpecUpdates(changeDir, specsRoot);
      const r = await m.buildUpdatedSpec(updates[0], 'c', { silent: true });
      out[name] = 'OK\n' + r.rebuilt;
    } catch (e) {
      out[name] = 'ERR ' + String(e.message).replaceAll(dir, '<dir>');
    }
    rmSync(dir, { recursive: true, force: true });
  }
  if (out.base === out.patched) { identical++; if (out.base.startsWith('ERR')) refusedBoth++; }
  else { differ++; diffs.push({ delta: item.delta, base: out.base.slice(0, 300), patched: out.patched.slice(0, 300) }); }
}
rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify({ gitDir: gitDir.split('/').pop(), deltas: seen.size, identical, differ, refusedBoth, skipped, withIds, diffs }, null, 1));
