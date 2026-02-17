import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const specsRoot = path.join(projectRoot, 'openspec', 'specs');

const DELTA_HEADER_PATTERN = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements$/m;
const PURPOSE_PLACEHOLDER_PATTERN = /TBD - created by archiving change .*?\. Update Purpose after archive\./;

async function getSpecFiles(): Promise<string[]> {
  const entries = await fs.readdir(specsRoot, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specFile = path.join(specsRoot, entry.name, 'spec.md');
    try {
      await fs.access(specFile);
      files.push(specFile);
    } catch {
      // Ignore directories without spec.md
    }
  }

  return files.sort();
}

describe('source-of-truth specs normalization', () => {
  it('enforces required sections and bans archive placeholders/delta headers', async () => {
    const files = await getSpecFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const relativeFile = path.relative(projectRoot, file);

      expect(content, `${relativeFile} must include ## Purpose`).toMatch(/^## Purpose$/m);
      expect(content, `${relativeFile} must include ## Requirements`).toMatch(/^## Requirements$/m);
      expect(content, `${relativeFile} must not include archive placeholder purpose text`).not.toMatch(
        PURPOSE_PLACEHOLDER_PATTERN
      );
      expect(content, `${relativeFile} must not include delta headers in source-of-truth specs`).not.toMatch(
        DELTA_HEADER_PATTERN
      );
    }
  });
});
