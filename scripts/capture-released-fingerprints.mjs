// Records a fingerprint of every file each released OpenSpec version
// generates, so `openspec update` can tell an untouched file from an old
// release apart from a file the user edited.
//
// For each version on npm it installs the release into a cache folder, runs
// `init --tools all` in throwaway projects with a throwaway HOME (once per
// profile and delivery the release supports), and fingerprints every file
// that appeared. It then rewrites src/core/shared/released-generated-fingerprints.ts.
//
// Usage: pnpm build && node scripts/capture-released-fingerprints.mjs [--cache DIR] [--only 1.0.0,1.16.0]
// Run it after each release so the new release's output is recognized too.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { fingerprintGeneratedContent, extractOpenSpecBlock } = await import(
  path.join(repoRoot, 'dist/core/shared/generated-fingerprint.js')
);

const PACKAGE = '@fission-ai/openspec';
const ALL_WORKFLOWS = [
  'propose', 'explore', 'new', 'continue', 'apply', 'update',
  'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
];
const OUTPUT = path.join(repoRoot, 'src/core/shared/released-generated-fingerprints.ts');

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
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
  covered.push(version);
  console.log(`${version}: ${variants.length} variant(s), ${files} files`);
}

fs.rmSync(workRoot, { recursive: true, force: true });

const sorted = [...fingerprints].sort();
const sortedPaths = [...projectPaths].sort();
const lines = [
  '// Generated by scripts/capture-released-fingerprints.mjs. Do not edit.',
  '//',
  '// Fingerprints of every file `openspec init --tools all` generated in each',
  '// release below, across every profile and delivery that release supports.',
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
