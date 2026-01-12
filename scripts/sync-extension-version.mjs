import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pkgPath = join(process.cwd(), 'package.json');
const extPath = join(process.cwd(), 'gemini-extension.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const ext = JSON.parse(readFileSync(extPath, 'utf-8'));

if (ext.version !== pkg.version) {
  console.log(`Syncing gemini-extension.json version from ${ext.version} to ${pkg.version}`);
  ext.version = pkg.version;
  writeFileSync(extPath, JSON.stringify(ext, null, 2) + '\n');
} else {
  console.log('gemini-extension.json version is already up to date.');
}
