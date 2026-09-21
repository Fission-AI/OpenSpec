import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAGE_CONTRACTS = [
  {
    page: 'docs/troubleshooting.md',
    ide: /run `\/opsx-propose`[^\n]+`\.github\/prompts\/opsx-propose\.prompt\.md`/,
    cli: /run `\/openspec-propose`[^\n]+`\.github\/skills\/openspec-propose\/SKILL\.md`/,
  },
  {
    page: 'docs/supported-tools.md',
    ide: /`\.github\/prompts\/\*\.prompt\.md` as `\/opsx-\*` commands/,
    cli: /`\.github\/skills\/openspec-\*\/SKILL\.md` instead\. Invoke a CLI skill as `\/openspec-<skill>`/,
  },
  {
    page: 'docs-lab/reference/supported-tools.md',
    ide: /`\.github\/prompts\/opsx-<id>\.prompt\.md` as `\/opsx-<id>`/,
    cli: /`\.github\/skills\/openspec-\*\/SKILL\.md` instead\. Invoke a skill as\s+`\/openspec-<skill>`/,
  },
];

describe('GitHub Copilot workflow discovery documentation', () => {
  for (const { page, ide, cli } of PAGE_CONTRACTS) {
    it(`${page} pairs IDE commands and CLI skills with their files (#782)`, () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, page), 'utf-8');

      expect(content).toMatch(ide);
      expect(content).toMatch(cli);
    });
  }

  for (const { page } of PAGE_CONTRACTS) {
    it(`${page} documents Copilot CLI skill reload and inspection (#782)`, () => {
      const content = fs.readFileSync(path.join(REPO_ROOT, page), 'utf-8');

      expect(content).toContain('/skills reload');
      expect(content).toContain('/skills info openspec-propose');
    });
  }
});
