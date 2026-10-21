#!/usr/bin/env bun
// Builds standalone `openspec` executables with `bun build --compile`, so the
// CLI can be installed without Node.js. Run `pnpm build` first.
//
//   bun scripts/binary/build.mjs                  # this machine
//   bun scripts/binary/build.mjs --all            # every release asset
//   bun scripts/binary/build.mjs linux-x64-musl   # named assets
//
// Output: dist-bin/openspec-<asset>[.exe]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Release asset → Bun target. x64 uses Bun's "baseline" builds, which drop
// the AVX2 requirement of the default ones so pre-2013 CPUs and some VMs work.
// The -musl assets are for Alpine and other non-glibc Linux.
export const ASSETS = {
  'linux-x64': 'bun-linux-x64-baseline',
  'linux-arm64': 'bun-linux-arm64',
  'linux-x64-musl': 'bun-linux-x64-musl-baseline',
  'linux-arm64-musl': 'bun-linux-arm64-musl',
  'darwin-x64': 'bun-darwin-x64-baseline',
  'darwin-arm64': 'bun-darwin-arm64',
  'windows-x64': 'bun-windows-x64-baseline',
  'windows-arm64': 'bun-windows-arm64',
};

const root = path.resolve(import.meta.dir, '../..');
const args = process.argv.slice(2);
const assets = args.includes('--all')
  ? Object.keys(ASSETS)
  : args.length > 0
    ? args
    : [`${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`];
for (const asset of assets) {
  if (!ASSETS[asset]) {
    console.error(`Unknown asset "${asset}". Known: ${Object.keys(ASSETS).join(', ')}`);
    process.exit(1);
  }
}

// Node resolves `createRequire(import.meta.url)(...)` at runtime against the
// package directory, which a binary does not have. Turning those calls into
// plain `require` lets Bun bundle package.json and cross-spawn instead.
const staticRequire = {
  name: 'static-require',
  setup(build) {
    build.onLoad({ filter: /[\\/]dist[\\/].*\.js$/ }, async (args) => {
      const contents = (await Bun.file(args.path).text())
        .replace(/const require = createRequire\(import\.meta\.url\);/g, '')
        .replaceAll('createRequire(import.meta.url)(', 'require(');
      // A new call shape would otherwise ship a binary that fails at runtime.
      if (contents.includes('createRequire(import.meta.url)')) {
        throw new Error(`Unhandled createRequire(import.meta.url) in ${args.path}`);
      }
      return { contents, loader: 'js' };
    });
  },
};

const files = {};
const schemasDir = path.join(root, 'schemas');
for (const entry of fs.readdirSync(schemasDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = path.join(entry.parentPath, entry.name);
  files[path.relative(schemasDir, file).split(path.sep).join('/')] = fs.readFileSync(file, 'utf8');
}
const hash = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16);

for (const asset of assets) {
  const outfile = path.join(root, 'dist-bin', `openspec-${asset}${asset.startsWith('windows') ? '.exe' : ''}`);
  const result = await Bun.build({
    entrypoints: [path.join(import.meta.dir, 'entry.mjs')],
    compile: { target: ASSETS[asset], outfile },
    // Unminified, a crash names the real function and shows readable code
    // (about 1 MB more), so bug reports from binary users are actionable.
    minify: false,
    define: { OPENSPEC_EMBEDDED_SCHEMAS: JSON.stringify({ hash, files }) },
    plugins: [staticRequire],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  console.log(`Built ${path.relative(root, outfile)}`);
}
