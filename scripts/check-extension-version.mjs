import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const ext = JSON.parse(fs.readFileSync('gemini-extension.json', 'utf-8'));

if (pkg.version !== ext.version) {
  console.error(`Version mismatch! package.json: ${pkg.version}, gemini-extension.json: ${ext.version}`);
  process.exit(1);
}

console.log('Version check passed.');
