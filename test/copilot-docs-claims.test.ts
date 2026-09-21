import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  'docs/troubleshooting.md',
  'docs/supported-tools.md',
  'docs-lab/reference/supported-tools.md',
];

describe('GitHub Copilot workflow discovery documentation', () => {
  for (const page of PAGES) {
    it(`${page} distinguishes IDE commands from CLI skills (#782)`, () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, page), 'utf-8');

      expect(content).toContain('.github/prompts/');
      expect(content).toContain('.github/skills/');
      expect(content).toContain('/opsx-');
      expect(content).toContain('/openspec-');
    });
  }

  for (const page of [
    'docs/supported-tools.md',
    'docs-lab/reference/supported-tools.md',
  ]) {
    it(`${page} documents Copilot CLI skill reload and inspection (#782)`, () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, page), 'utf-8');

      expect(content).toContain('/skills reload');
      expect(content).toContain('/skills info openspec-propose');
    });
  }
});
