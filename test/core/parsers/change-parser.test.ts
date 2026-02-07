import { describe, it, expect } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { ChangeParser } from '../../../src/core/parsers/change-parser.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lightspec-change-parser-'));
  try {
    await run(dir);
  } finally {
    // Best-effort cleanup
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
}

describe('ChangeParser', () => {
  it('parses simple What Changes bullet list', async () => {
    const content = `# Test Change\n\n## Why\nWe need it because reasons that are sufficiently long.\n\n## What Changes\n- **spec-a:** Add a new requirement to A\n- **spec-b:** Rename requirement X to Y\n- **spec-c:** Remove obsolete requirement`;

    const parser = new ChangeParser(content, process.cwd());
    const change = await parser.parseChangeWithDeltas('test-change');

    expect(change.name).toBe('test-change');
    expect(change.deltas.length).toBe(3);
    expect(change.deltas[0].spec).toBe('spec-a');
    expect(['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED']).toContain(change.deltas[1].operation);
  });

  it('prefers delta-format specs over simple bullets when both exist', async () => {
    await withTempDir(async (dir) => {
      const changeDir = dir;
      const specsDir = path.join(changeDir, 'specs', 'foo');
      await fs.mkdir(specsDir, { recursive: true });

      const content = `# Test Change\n\n## Why\nWe need it because reasons that are sufficiently long.\n\n## What Changes\n- **foo:** Add something via bullets (should be overridden)`;
      const deltaSpec = `# Delta for Foo\n\n## ADDED Requirements\n\n### Requirement: New thing\n\n#### Scenario: basic\nGiven X\nWhen Y\nThen Z`;

      await fs.writeFile(path.join(specsDir, 'spec.md'), deltaSpec, 'utf8');

      const parser = new ChangeParser(content, changeDir);
      const change = await parser.parseChangeWithDeltas('test-change');

      expect(change.deltas.length).toBeGreaterThan(0);
      // Since delta spec exists, the description should reflect delta-derived entries
      expect(change.deltas[0].spec).toBe('foo');
      expect(change.deltas[0].description).toContain('Add requirement:');
      expect(change.deltas[0].operation).toBe('ADDED');
      expect(change.deltas[0].requirement).toBeDefined();
    });
  });
});
