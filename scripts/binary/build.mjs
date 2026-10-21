#!/usr/bin/env bun
// Builds standalone `openspec` executables with `bun build --compile`, so the
// CLI can be installed without Node.js. Run `pnpm build` first.
//
//   bun scripts/binary/build.mjs                    # host platform
//   bun scripts/binary/build.mjs bun-linux-x64 ...  # cross-compile
//
// Output: dist-bin/openspec-<os>-<arch>[.exe]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '../..');
const targets = process.argv.slice(2);
if (targets.length === 0) targets.push(`bun-${process.platform}-${process.arch}`);

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

for (const target of targets) {
  const name = target.replace(/^bun-/, 'openspec-');
  const outfile = path.join(root, 'dist-bin', target.includes('windows') ? `${name}.exe` : name);
  const result = await Bun.build({
    entrypoints: [path.join(import.meta.dir, 'entry.mjs')],
    compile: { target, outfile },
    minify: true,
    define: { OPENSPEC_EMBEDDED_SCHEMAS: JSON.stringify({ hash, files }) },
    plugins: [staticRequire],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  console.log(`Built ${path.relative(root, outfile)}`);
}
