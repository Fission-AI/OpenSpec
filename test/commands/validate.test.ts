import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('top-level validate command', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-validate-command-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');
  const specsDir = path.join(testDir, 'openspec', 'specs');
  const bin = path.join(projectRoot, 'bin', 'openspec.js');


  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });

    // Create a valid spec
    const specContent = `## Purpose
Valid spec for testing.

## Requirements

### Requirement: Foo
Text

#### Scenario: Bar
Given A\nWhen B\nThen C`;
    await fs.mkdir(path.join(specsDir, 'alpha'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'alpha', 'spec.md'), specContent, 'utf-8');

    // Create a simple change with bullets (parser supports this)
    const changeContent = `# Test Change\n\n## Why\nBecause reasons that are sufficiently long for validation.\n\n## What Changes\n- **alpha:** Add something`;
    await fs.mkdir(path.join(changesDir, 'c1'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'c1', 'proposal.md'), changeContent, 'utf-8');

    // Duplicate name for ambiguity test
    await fs.mkdir(path.join(changesDir, 'dup'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'dup', 'proposal.md'), changeContent, 'utf-8');
    await fs.mkdir(path.join(specsDir, 'dup'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'dup', 'spec.md'), specContent, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints a helpful hint when no args in non-interactive mode', () => {
    const originalCwd = process.cwd();
    const originalEnv = { ...process.env };
    try {
      process.chdir(testDir);
      process.env.OPEN_SPEC_INTERACTIVE = '0';
      let err: any;
      try {
        execSync(`node ${bin} validate`, { encoding: 'utf-8' });
      } catch (e) { err = e; }
      expect(err).toBeDefined();
      expect(err.status).not.toBe(0);
      expect(err.stderr.toString()).toContain('Nothing to validate. Try one of:');
    } finally {
      process.chdir(originalCwd);
      process.env = originalEnv;
    }
  });

  it('validates all with --all and outputs JSON summary', () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      let outStr = '';
      try {
        outStr = execSync(`node ${bin} validate --all --json`, { encoding: 'utf-8' });
      } catch (e: any) {
        // If exit code is non-zero (e.g., on failures), still parse stdout JSON
        outStr = e.stdout?.toString?.() ?? '';
      }
      const json = JSON.parse(outStr);
      expect(Array.isArray(json.items)).toBe(true);
      expect(json.summary?.totals?.items).toBeDefined();
      expect(json.version).toBe('1.0');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('validates only specs with --specs and respects --concurrency', () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      let outStr = '';
      try {
        outStr = execSync(`node ${bin} validate --specs --json --concurrency 1`, { encoding: 'utf-8' });
      } catch (e: any) {
        outStr = e.stdout?.toString?.() ?? '';
      }
      const json = JSON.parse(outStr);
      // All items should be specs
      expect(json.items.every((i: any) => i.type === 'spec')).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('errors on ambiguous item names and suggests type override', () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      let err: any;
      try {
        execSync(`node ${bin} validate dup`, { encoding: 'utf-8' });
      } catch (e) { err = e; }
      expect(err).toBeDefined();
      expect(err.stderr.toString()).toContain('Ambiguous item');
      expect(err.status).not.toBe(0);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('accepts change proposals saved with CRLF line endings', async () => {
    const changeId = 'crlf-change';
    const toCrlf = (segments: string[]) => segments.join('\n').replace(/\n/g, '\r\n');

    const crlfContent = toCrlf([
      '# CRLF Proposal',
      '',
      '## Why',
      'This change verifies validation works with Windows line endings.',
      '',
      '## What Changes',
      '- **alpha:** Ensure validation passes on CRLF files',
    ]);

    await fs.mkdir(path.join(changesDir, changeId), { recursive: true });
    await fs.writeFile(path.join(changesDir, changeId, 'proposal.md'), crlfContent, 'utf-8');

    const deltaContent = toCrlf([
      '## ADDED Requirements',
      '### Requirement: Parser SHALL accept CRLF change proposals',
      'The parser SHALL accept CRLF change proposals without manual edits.',
      '',
      '#### Scenario: Validate CRLF change',
      '- **WHEN** a developer runs openspec validate on the proposal',
      '- **THEN** validation succeeds without section errors',
    ]);

    const deltaDir = path.join(changesDir, changeId, 'specs', 'alpha');
    await fs.mkdir(deltaDir, { recursive: true });
    await fs.writeFile(path.join(deltaDir, 'spec.md'), deltaContent, 'utf-8');

    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      expect(() => execSync(`node ${bin} validate ${changeId}`, { encoding: 'utf-8' })).not.toThrow();
    } finally {
      process.chdir(originalCwd);
    }
  });
});


