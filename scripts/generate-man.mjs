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
const { renderManPage, resolveBuildDate, MAN_PAGE_RELATIVE_PATH } = await importFromDist(
  'core',
  'man',
  'man-page.js'
);

// One source for the location: package.json's `man` field points at the same
// path, and the packaging test holds the two together.
const outputPath = path.join(repoRoot, 'dist', ...MAN_PAGE_RELATIVE_PATH.split('/'));

mkdirSync(path.dirname(outputPath), { recursive: true });
// SOURCE_DATE_EPOCH keeps packagers (Nix, distro builds) reproducible.
const date = resolveBuildDate(process.env.SOURCE_DATE_EPOCH, new Date());

writeFileSync(outputPath, renderManPage(program, { version, date }), 'utf-8');

console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
