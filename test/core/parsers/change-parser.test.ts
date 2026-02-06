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

  describe('hierarchical specs support', () => {
    it('parses hierarchical delta specs at depth 2', async () => {
      await withTempDir(async (dir) => {
        const changeDir = dir;
        const specsDir = path.join(changeDir, 'specs', '_global', 'testing');
        await fs.mkdir(specsDir, { recursive: true });

        const content = `# Test Change\n\n## Why\nAdd testing standards.\n\n## What Changes\n- **_global/testing:** Add test requirements`;
        const deltaSpec = `# Testing - Changes\n\n## ADDED Requirements\n\n### Requirement: Unit tests required\nAll modules SHALL have unit tests.\n\n#### Scenario: Test coverage\nGiven a module\nWhen tests run\nThen coverage is adequate`;

        await fs.writeFile(path.join(specsDir, 'spec.md'), deltaSpec, 'utf8');

        const parser = new ChangeParser(content, changeDir);
        const change = await parser.parseChangeWithDeltas('test-change');

        expect(change.deltas.length).toBeGreaterThan(0);
        expect(change.deltas[0].spec).toBe(path.join('_global', 'testing'));
        expect(change.deltas[0].operation).toBe('ADDED');
        expect(change.deltas[0].requirement).toBeDefined();
        expect(change.deltas[0].requirement?.text).toContain('unit tests');
      });
    });

    it('parses hierarchical delta specs at depth 3', async () => {
      await withTempDir(async (dir) => {
        const changeDir = dir;
        const specsDir = path.join(changeDir, 'specs', 'platform', 'services', 'api');
        await fs.mkdir(specsDir, { recursive: true });

        const content = `# Test Change\n\n## Why\nAdd API specifications.\n\n## What Changes\n- **platform/services/api:** Add REST endpoint requirements`;
        const deltaSpec = `# API Service - Changes\n\n## ADDED Requirements\n\n### Requirement: REST endpoints\nAPI SHALL provide REST endpoints.\n\n#### Scenario: Endpoint access\nGiven an authenticated client\nWhen requesting an endpoint\nThen response is valid`;

        await fs.writeFile(path.join(specsDir, 'spec.md'), deltaSpec, 'utf8');

        const parser = new ChangeParser(content, changeDir);
        const change = await parser.parseChangeWithDeltas('test-change');

        expect(change.deltas.length).toBeGreaterThan(0);
        expect(change.deltas[0].spec).toBe(path.join('platform', 'services', 'api'));
        expect(change.deltas[0].operation).toBe('ADDED');
        expect(change.deltas[0].requirement?.text).toContain('REST endpoints');
      });
    });

    it('parses mixed flat and hierarchical delta specs', async () => {
      await withTempDir(async (dir) => {
        const changeDir = dir;

        // Create flat delta spec
        const flatSpecsDir = path.join(changeDir, 'specs', 'auth');
        await fs.mkdir(flatSpecsDir, { recursive: true });
        const flatDeltaContent = `# Auth - Changes\n\n## ADDED Requirements\n\n### Requirement: Login\nUser SHALL be able to login.\n\n#### Scenario: Login flow\nGiven valid credentials\nWhen user logs in\nThen access is granted`;
        await fs.writeFile(path.join(flatSpecsDir, 'spec.md'), flatDeltaContent, 'utf8');

        // Create hierarchical delta spec
        const hierarchicalSpecsDir = path.join(changeDir, 'specs', '_global', 'security');
        await fs.mkdir(hierarchicalSpecsDir, { recursive: true });
        const hierarchicalDeltaContent = `# Security - Changes\n\n## ADDED Requirements\n\n### Requirement: Encryption\nData SHALL be encrypted.\n\n#### Scenario: Data security\nGiven sensitive data\nWhen stored\nThen it is encrypted`;
        await fs.writeFile(path.join(hierarchicalSpecsDir, 'spec.md'), hierarchicalDeltaContent, 'utf8');

        const content = `# Test Change\n\n## Why\nAdd auth and security.\n\n## What Changes\n- **auth:** Add login\n- **_global/security:** Add encryption`;

        const parser = new ChangeParser(content, changeDir);
        const change = await parser.parseChangeWithDeltas('test-change');

        expect(change.deltas.length).toBe(2);

        // Should have both flat and hierarchical deltas
        const flatDelta = change.deltas.find(d => d.spec === 'auth');
        const hierarchicalDelta = change.deltas.find(d => d.spec === path.join('_global', 'security'));

        expect(flatDelta).toBeDefined();
        expect(flatDelta?.operation).toBe('ADDED');
        expect(flatDelta?.requirement?.text).toContain('login');

        expect(hierarchicalDelta).toBeDefined();
        expect(hierarchicalDelta?.operation).toBe('ADDED');
        expect(hierarchicalDelta?.requirement?.text).toContain('encrypted');
      });
    });

    it('parses hierarchical delta specs with MODIFIED operations', async () => {
      await withTempDir(async (dir) => {
        const changeDir = dir;
        const specsDir = path.join(changeDir, 'specs', '_global', 'monitoring');
        await fs.mkdir(specsDir, { recursive: true });

        const content = `# Test Change\n\n## Why\nUpdate monitoring.\n\n## What Changes\n- **_global/monitoring:** Update alerting requirements`;
        const deltaSpec = `# Monitoring - Changes\n\n## MODIFIED Requirements\n\n### Requirement: Alerting\nSystem SHALL send alerts with additional context.\n\n#### Scenario: Alert delivery\nGiven an error condition\nWhen alert triggers\nThen context is included`;

        await fs.writeFile(path.join(specsDir, 'spec.md'), deltaSpec, 'utf8');

        const parser = new ChangeParser(content, changeDir);
        const change = await parser.parseChangeWithDeltas('test-change');

        expect(change.deltas.length).toBeGreaterThan(0);
        expect(change.deltas[0].spec).toBe(path.join('_global', 'monitoring'));
        expect(change.deltas[0].operation).toBe('MODIFIED');
        expect(change.deltas[0].requirement?.text).toContain('alerts');
      });
    });

    it('parses hierarchical delta specs with RENAMED operations', async () => {
      await withTempDir(async (dir) => {
        const changeDir = dir;
        const specsDir = path.join(changeDir, 'specs', 'platform', 'logging');
        await fs.mkdir(specsDir, { recursive: true });

        const content = `# Test Change\n\n## Why\nRename logging requirement.\n\n## What Changes\n- **platform/logging:** Rename requirement`;
        const deltaSpec = `# Logging - Changes\n\n## RENAMED Requirements\n- FROM: \`### Requirement: Old Name\`\n- TO: \`### Requirement: New Name\``;

        await fs.writeFile(path.join(specsDir, 'spec.md'), deltaSpec, 'utf8');

        const parser = new ChangeParser(content, changeDir);
        const change = await parser.parseChangeWithDeltas('test-change');

        expect(change.deltas.length).toBeGreaterThan(0);
        expect(change.deltas[0].spec).toBe(path.join('platform', 'logging'));
        expect(change.deltas[0].operation).toBe('RENAMED');
        expect(change.deltas[0].rename).toBeDefined();
        expect(change.deltas[0].rename?.from).toBe('Old Name');
        expect(change.deltas[0].rename?.to).toBe('New Name');
      });
    });
  });
});
