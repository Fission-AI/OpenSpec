// Records a fingerprint of every file each released OpenSpec version
// generates, so `openspec update` can tell an untouched file from an old
// release apart from a file the user edited.
//
// For each version on npm it installs the release into a cache folder, runs
// `init --tools all` in throwaway projects with a throwaway HOME (once per
// profile, former default workflow set and delivery the release supports), and fingerprints every file
// that appeared. It also fingerprints every text the repository's `skills/`
// folder has held, from git history. It then rewrites
// src/core/shared/released-generated-fingerprints.ts.
//
// Usage: pnpm build && node scripts/capture-released-fingerprints.mjs [--cache DIR] [--only 1.0.0,1.16.0]
// Run it after each release so the new release's output is recognized too.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { fingerprintGeneratedContent, extractOpenSpecBlock } = await import(
  path.join(repoRoot, 'dist/core/shared/generated-fingerprint.js')
);

const PACKAGE = '@fission-ai/openspec';
const ALL_WORKFLOWS = [
  'propose', 'explore', 'new', 'continue', 'apply', 'update',
  'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
];
// The workflow sets earlier releases installed by default. A project keeps the
// set it started with (saved as a custom profile on its first update), and a
// file's text depends on which workflows are installed beside it, so every
// later release is captured with each of these sets too.
const FORMER_DEFAULT_WORKFLOWS = {
  // 1.0.0 to 1.1.1
  ten: ['explore', 'new', 'continue', 'apply', 'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard'],
  // 1.2.0 to 1.3.1
  four: ['propose', 'explore', 'apply', 'archive'],
  // 1.4.0 to 1.5.0
  five: ['propose', 'explore', 'apply', 'sync', 'archive'],
  // 1.6.0 onward
  six: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
};
const OUTPUT = path.join(repoRoot, 'src/core/shared/released-generated-fingerprints.ts');

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

// The history of skills/ is read further down. A shallow clone would record
// only part of it and silently drop the rest from the list.
if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: repoRoot, encoding: 'utf8' }).trim() === 'true') {
  throw new Error('This is a shallow clone. Run `git fetch --unshallow` first: the history of skills/ is recorded too.');
}

const cacheDir = path.resolve(argValue('--cache') ?? path.join(os.tmpdir(), 'openspec-release-cache'));
const only = argValue('--only')?.split(',');
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-capture-'));

const versions = JSON.parse(
  execFileSync('npm', ['view', PACKAGE, 'versions', '--json'], { encoding: 'utf8' })
).filter((v) => !v.includes('-') && (!only || only.includes(v)));

function install(version) {
  const dir = path.join(cacheDir, `v${version}`);
  const bin = path.join(dir, 'node_modules', PACKAGE, 'bin', 'openspec.js');
  if (!fs.existsSync(bin)) {
    execFileSync(
      'npm',
      ['install', '--silent', '--no-audit', '--no-fund', '--ignore-scripts', '--prefix', dir, `${PACKAGE}@${version}`],
      { stdio: 'ignore' }
    );
  }
  return bin;
}

function run(bin, args, cwd, home) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd,
    input: '',
    timeout: 120_000,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      CODEX_HOME: path.join(home, '.codex'),
      OPENSPEC_TELEMETRY: '0',
      DO_NOT_TRACK: '1',
      CI: '1',
      NO_COLOR: '1',
      TERM: 'dumb',
    },
  });
}

function listFiles(root, skip) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (skip(path.relative(root, full))) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out;
}

// The release's own config, not generated output a user might hold.
const skipHome = (rel) => rel === '.config/openspec' || rel.startsWith('.npm');

function variantsFor(bin) {
  const help = run(bin, ['init', '--help'], workRoot, path.join(workRoot, 'help-home')).stdout ?? '';
  if (!help.includes('--tools')) return null; // interactive-only release
  if (!help.includes('--profile')) return [{ name: 'default' }];
  const variants = [];
  for (const delivery of ['both', 'skills', 'commands']) {
    variants.push({ name: `core-${delivery}`, config: { profile: 'core', delivery } });
    variants.push({ name: `all-${delivery}`, config: { profile: 'custom', delivery, workflows: ALL_WORKFLOWS } });
    for (const [name, workflows] of Object.entries(FORMER_DEFAULT_WORKFLOWS)) {
      variants.push({ name: `${name}-${delivery}`, config: { profile: 'custom', delivery, workflows } });
    }
  }
  return variants;
}

const fingerprints = new Set();
// Project-relative paths releases wrote outside openspec/ and the project
// root, where only tool folders live. Root files (CLAUDE.md, AGENTS.md) are
// the user's own files that old releases only added a marked block to.
const projectPaths = new Set();
const covered = [];
const skipped = [];

for (const version of versions) {
  let bin;
  try {
    bin = install(version);
  } catch (error) {
    skipped.push(`${version} (install failed)`);
    continue;
  }
  const variants = variantsFor(bin);
  if (!variants) {
    skipped.push(`${version} (no non-interactive init)`);
    continue;
  }
  let files = 0;
  for (const variant of variants) {
    const base = path.join(workRoot, version, variant.name);
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    fs.mkdirSync(path.join(home, '.config', 'openspec'), { recursive: true });
    fs.mkdirSync(project, { recursive: true });
    if (variant.config) {
      fs.writeFileSync(
        path.join(home, '.config', 'openspec', 'config.json'),
        JSON.stringify(variant.config, null, 2)
      );
    }
    const result = run(bin, ['init', '--tools', 'all'], project, home);
    if (result.status !== 0) {
      throw new Error(`${version} ${variant.name}: init failed\n${result.stdout}\n${result.stderr}`);
    }
    for (const file of [...listFiles(project, () => false), ...listFiles(home, skipHome)]) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.trim() === '') continue; // an empty file proves nothing
      fingerprints.add(fingerprintGeneratedContent(content));
      // A block older releases put into the user's own CLAUDE.md or
      // AGENTS.md is recognized on its own, apart from the rest of the file.
      const block = extractOpenSpecBlock(content);
      if (block) fingerprints.add(fingerprintGeneratedContent(block));
      files += 1;
      const rel = path.relative(project, file).split(path.sep).join('/');
      if (!rel.startsWith('..') && rel.includes('/') && !rel.startsWith('openspec/')) {
        projectPaths.add(rel);
      }
    }
  }
  // 2.0.0 wrote a skill differently for every combination of
  // workflows installed beside it, far more texts than the variants above
  // reach. Such a release can list them all itself.
  let renderings = 0;
  try {
    const dist = path.join(path.dirname(path.dirname(bin)), 'dist');
    const generation = await import(pathToFileURL(path.join(dist, 'core/shared/skill-generation.js')).href);
    const references = await import(pathToFileURL(path.join(dist, 'utils/command-references.js')).href);
    if (typeof generation.everySkillRendering === 'function') {
      const transforms = [references.transformToSharedSkillReferences, references.transformToSkillReferences].filter(
        (transform) => typeof transform === 'function'
      );
      for (const { dirName } of generation.getSkillTemplates()) {
        for (const transform of transforms) {
          for (const text of generation.everySkillRendering(dirName, version, transform)) {
            fingerprints.add(fingerprintGeneratedContent(text));
            renderings += 1;
          }
        }
      }
    }
  } catch {
    // An older release without these exports: the variants above cover it.
  }
  covered.push(version);
  console.log(`${version}: ${variants.length} variant(s), ${files} files, ${renderings} profile renderings`);
}

fs.rmSync(workRoot, { recursive: true, force: true });

// The repository also publishes its skills in `skills/`, which is what
// `npx skills add Fission-AI/OpenSpec` installs, from whatever commit was
// current that day. Every text that folder has held is OpenSpec's too, so a
// skill installed that way is never mistaken for one the user edited. Needs
// the full history: a shallow clone records only what it has.
let published = 0;
const publishedBlobs = new Set(
  execFileSync('git', ['log', '--format=', '--raw', '--no-abbrev', 'HEAD', '--', 'skills/*/SKILL.md'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .map((line) => line.split(/\s+/)[3])
    .filter((blob) => blob && !/^0+$/.test(blob))
);
for (const blob of publishedBlobs) {
  const content = execFileSync('git', ['cat-file', 'blob', blob], { cwd: repoRoot, encoding: 'utf8' });
  if (content.trim() === '') continue;
  fingerprints.add(fingerprintGeneratedContent(content));
  published += 1;
}
console.log(`skills/ history: ${published} published skill texts`);

// --only adds to what is already recorded rather than replacing it, so
// releases outside the subset keep their coverage.
if (only && fs.existsSync(OUTPUT)) {
  const existing = fs.readFileSync(OUTPUT, 'utf8');
  const section = (name) => existing.split(`export const ${name}`)[1]?.split('];')[0] ?? '';
  for (const [, fp] of section('RELEASED_GENERATED_FINGERPRINTS').matchAll(/'([0-9a-f]+)'/g)) fingerprints.add(fp);
  for (const [, p] of section('RELEASED_GENERATED_PATHS').matchAll(/"((?:[^"\\]|\\.)*)"/g)) projectPaths.add(JSON.parse(`"${p}"`));
  const earlier = existing.match(/^\/\/ Releases: (.*)$/m)?.[1].split(', ') ?? [];
  covered.unshift(...earlier.filter((v) => !covered.includes(v)));
  const notCaptured = existing.match(/^\/\/ Not captured: (.*)$/m)?.[1].split(/, (?=\d)/) ?? [];
  skipped.unshift(...notCaptured.filter((entry) => !covered.includes(entry.split(' ')[0])));
}

const sorted = [...fingerprints].sort();
const sortedPaths = [...projectPaths].sort();
const lines = [
  '// Generated by scripts/capture-released-fingerprints.mjs. Do not edit.',
  '//',
  '// Fingerprints of every file `openspec init --tools all` generated in each',
  '// release below, across every profile, former default workflow set and',
  '// delivery that release supports, and of every skill text the repository',
  '// has published in `skills/`.',
  `// Releases: ${covered.join(', ')}`,
  ...(skipped.length ? [`// Not captured: ${skipped.join(', ')}`] : []),
  'export const RELEASED_GENERATED_FINGERPRINTS: readonly string[] = [',
  ...sorted.map((f) => `  '${f}',`),
  '];',
  '',
  '// Every project-relative path those releases wrote inside a tool folder.',
  'export const RELEASED_GENERATED_PATHS: readonly string[] = [',
  ...sortedPaths.map((p) => `  ${JSON.stringify(p)},`),
  '];',
  '',
];
fs.writeFileSync(OUTPUT, lines.join('\n'));
console.log(`${sorted.length} unique fingerprints and ${sortedPaths.length} paths from ${covered.length} releases → ${path.relative(repoRoot, OUTPUT)}`);
