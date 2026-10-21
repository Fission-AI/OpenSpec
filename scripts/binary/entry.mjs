// Entry point of the standalone `openspec` binary built by build.mjs. The
// binary has no package directory on disk, so the built-in schemas are
// embedded at build time and written to a real directory before the CLI runs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getGlobalDataDir } from '../../dist/core/global-config.js';
import { setPackageSchemasDir } from '../../dist/core/artifact-graph/resolver.js';

// Replaced by build.mjs: { hash, files: { 'spec-driven/schema.yaml': '...' } }
const { hash, files } = OPENSPEC_EMBEDDED_SCHEMAS;

// Checked on every start, so a copy someone edited or partly deleted is
// replaced instead of breaking the CLI until they find and remove it.
function isIntact(dir) {
  try {
    return Object.entries(files).every(
      ([relativePath, content]) => fs.readFileSync(path.join(dir, relativePath), 'utf8') === content
    );
  } catch {
    return false;
  }
}

function writeFiles(dir) {
  for (const [relativePath, content] of Object.entries(files)) {
    const file = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
}

// Keyed by content and created only by an atomic rename of a fully written
// copy, so concurrent first runs never see a half-written directory.
function extractToDataDir() {
  const dir = path.join(getGlobalDataDir(), 'binary-schemas', hash);
  if (isIntact(dir)) return dir;

  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const tmp = writeFiles(fs.mkdtempSync(`${dir}.tmp-`));
  if (fs.existsSync(dir)) {
    // A rename cannot replace a non-empty directory, so move the damaged
    // copy aside first. Another process may already have done it.
    try {
      fs.renameSync(dir, `${tmp}-stale`);
    } catch {}
    fs.rmSync(`${tmp}-stale`, { recursive: true, force: true });
  }
  try {
    fs.renameSync(tmp, dir);
  } catch (error) {
    fs.rmSync(tmp, { recursive: true, force: true });
    // Another process finished first; its copy is identical.
    if (!isIntact(dir)) throw error;
  }
  return dir;
}

function extractSchemas() {
  try {
    return extractToDataDir();
  } catch {
    // Read-only home, locked-down CI: use a private copy for this run only.
    const dir = writeFiles(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schemas-')));
    process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
  }
}

let schemasDir;
setPackageSchemasDir(() => {
  try {
    schemasDir ??= extractSchemas();
  } catch (error) {
    throw new Error(`Could not write the built-in schemas to disk: ${error.message}`);
  }
  return schemasDir;
});
// No runCli() call: process.argv[1] and import.meta.url are both fixed at
// build time to the same virtual path, so the CLI's "run when executed
// directly" check always fires, whatever the user renames the binary to.
await import('../../dist/cli/index.js');
