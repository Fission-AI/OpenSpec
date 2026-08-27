import { describe, it, expect } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { ChangeParser } from '../../../src/core/parsers/change-parser.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-change-parser-'));
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

  it('parses nested delta specs with path-based capability ids (#1353)', async () => {
    await withTempDir(async (dir) => {
      const changeDir = dir;
      const nestedSpecDir = path.join(changeDir, 'specs', 'platform', 'session-layout');
      await fs.mkdir(nestedSpecDir, { recursive: true });

      const content = `# Test Change\n\n## Why\nWe need it because reasons that are sufficiently long.\n\n## What Changes\n- Add nested capability`;
      const deltaSpec = `# Delta\n\n## ADDED Requirements\n\n### Requirement: Nested capability works\n\n#### Scenario: basic\nGiven X\nWhen Y\nThen Z`;

      await fs.writeFile(path.join(nestedSpecDir, 'spec.md'), deltaSpec, 'utf8');

      const parser = new ChangeParser(content, changeDir);
      const change = await parser.parseChangeWithDeltas('test-change');

      expect(change.deltas.length).toBe(1);
      expect(change.deltas[0].spec).toBe('platform/session-layout');
      expect(change.deltas[0].operation).toBe('ADDED');
    });
  });

  // A divider header inside a delta section used to be parsed as a requirement,
  // inventing a scenario-less delta that does not exist (#498).
  it('ignores delta headers that are not "### Requirement:" (#498)', async () => {
    await withTempDir(async (dir) => {
      const specDir = path.join(dir, 'specs', 'docs');
      await fs.mkdir(specDir, { recursive: true });

      const content = `# Test Change\n\n## Why\nWe need it because reasons that are sufficiently long.\n\n## What Changes\n- Add docs`;
      const deltaSpec = [
        '# Docs Delta',
        '',
        '## ADDED Requirements',
        '',
        '### Documentation Requirements',
        '',
        '### Requirement: AI Application Documentation',
        'Teams building AI applications SHALL document agent definitions.',
        '',
        '#### Scenario: Agent Definition Documentation',
        '- **WHEN** a team ships an agent',
        '- **THEN** the agent definition is documented',
      ].join('\n');

      await fs.writeFile(path.join(specDir, 'spec.md'), deltaSpec, 'utf8');

      const parser = new ChangeParser(content, dir);
      const change = await parser.parseChangeWithDeltas('test-change');

      expect(change.deltas.length).toBe(1);
      expect(change.deltas[0].requirement?.text).toBe(
        'Teams building AI applications SHALL document agent definitions.'
      );
      expect(change.deltas[0].requirement?.scenarios.length).toBe(1);
    });
  });

  // A nameless "### Requirement:" header carries no requirement to validate,
  // and the delta reader skips it too.
  it('ignores a nameless "### Requirement:" delta header (#498)', async () => {
    await withTempDir(async (dir) => {
      const specDir = path.join(dir, 'specs', 'docs');
      await fs.mkdir(specDir, { recursive: true });

      const content = `# Test Change\n\n## Why\nWe need it because reasons that are sufficiently long.\n\n## What Changes\n- Add docs`;
      const deltaSpec = [
        '# Docs Delta',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement:',
        '',
        '### Requirement: Real One',
        'The system SHALL do a thing.',
        '',
        '#### Scenario: It works',
        '- **WHEN** invoked',
        '- **THEN** it works',
      ].join('\n');

      await fs.writeFile(path.join(specDir, 'spec.md'), deltaSpec, 'utf8');

      const parser = new ChangeParser(content, dir);
      const change = await parser.parseChangeWithDeltas('test-change');

      expect(change.deltas.length).toBe(1);
      expect(change.deltas[0].requirement?.text).toBe('The system SHALL do a thing.');
    });
  });
});
