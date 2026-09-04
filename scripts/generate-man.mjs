#!/usr/bin/env node
// Render dist/man/openspec.1 from the compiled CLI.
//
// Runs after tsc (see build.js) because it imports the built program: the
// manual is generated from the same commander tree that answers `--help`, so
// it cannot drift from the CLI.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(repoRoot, 'dist', 'man', 'openspec.1');

/**
 * Honor SOURCE_DATE_EPOCH so packagers (Nix, distro builds) get a
 * byte-identical page from identical sources.
 */
function buildDate() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const parsed = epoch ? Number.parseInt(epoch, 10) : Number.NaN;
  const date = Number.isFinite(parsed) ? new Date(parsed * 1000) : new Date();
  return date.toISOString().slice(0, 10);
}

const cliEntry = path.join(repoRoot, 'dist', 'cli', 'index.js');

// The build script this runs from is reused by fixtures that compile a
// different package (test/package-install-scripts.test.ts). There is no manual
// to render for a package that ships no CLI.
if (!existsSync(cliEntry)) {
  console.log('Skipping man page: no compiled CLI at dist/cli/index.js');
  process.exit(0);
}

const { version } = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));
// pathToFileURL, not a bare path: importing "C:\\..." is not a valid ESM specifier.
const importFromDist = (...segments) =>
  import(pathToFileURL(path.join(repoRoot, 'dist', ...segments)).href);

const { program } = await importFromDist('cli', 'index.js');
const { renderManPage } = await importFromDist('core', 'man', 'man-page.js');

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, renderManPage(program, { version, date: buildDate() }), 'utf-8');

console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
