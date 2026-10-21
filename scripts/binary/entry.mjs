// Entry point of the standalone `openspec` binary built by build.mjs. The
// binary has no package directory on disk, so the built-in schemas are
// embedded at build time and written to a real directory before the CLI runs.
import fs from 'node:fs';
import path from 'node:path';
import { getGlobalDataDir } from '../../dist/core/global-config.js';
import { setPackageSchemasDir } from '../../dist/core/artifact-graph/resolver.js';

// Replaced by build.mjs: { hash, files: { 'spec-driven/schema.yaml': '...' } }
const { hash, files } = OPENSPEC_EMBEDDED_SCHEMAS;

// Keyed by content, so a directory that exists is complete and current: it is
// only ever created by an atomic rename of a fully written one.
function extractSchemas() {
  const dir = path.join(getGlobalDataDir(), 'binary-schemas', hash);
  if (fs.existsSync(dir)) return dir;

  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const tmp = fs.mkdtempSync(`${dir}.tmp-`);
  for (const [relativePath, content] of Object.entries(files)) {
    const file = path.join(tmp, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  try {
    fs.renameSync(tmp, dir);
  } catch (error) {
    fs.rmSync(tmp, { recursive: true, force: true });
    // Another process finished first; its copy is identical.
    if (!fs.existsSync(dir)) throw error;
  }
  return dir;
}

setPackageSchemasDir(extractSchemas());
// No runCli() call: in a compiled binary process.argv[1] is the executable's
// own module path, so the CLI's "run when executed directly" check fires.
await import('../../dist/cli/index.js');
