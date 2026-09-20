import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';
import { loadChangeContext } from '../../src/core/artifact-graph/instruction-loader.js';
import { METADATA_FILENAME } from '../../src/utils/change-metadata.js';

const PROPOSAL = `# Test Change

## Why
This is a sufficiently long explanation to pass the why length requirement for validation purposes.

## What Changes
Pure internal refactor with no spec-level behavior change.`;

describe('unrecognized keys in .openspec.yaml', () => {
  const testDir = path.join(process.cwd(), 'test-validation-unknown-metadata-tmp');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function writeMetadata(body: string): Promise<void> {
    await fs.writeFile(path.join(testDir, METADATA_FILENAME), body, 'utf-8');
  }

  it('warns when skip_design and other unknown keys are silently ignored', async () => {
    await writeMetadata(
      'schema: spec-driven\nskip_specs: true\nskip_design: true\nbogus_key: 1\n'
    );

    const report = await new Validator().validateChangeDeltaSpecs(testDir);

    const warning = report.issues.find(
      (issue) => issue.level === 'WARNING' && issue.path === METADATA_FILENAME
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('skip_design');
    expect(warning?.message).toContain('bogus_key');
    expect(warning?.message).toMatch(/ignored/i);
    expect(warning?.message).toContain('skip_specs');
    expect(report.valid).toBe(true);
  });

  it('fails --strict when an unrecognized metadata key is present', async () => {
    await writeMetadata(
      'schema: spec-driven\nskip_specs: true\nskip_design: true\n'
    );

    const report = await new Validator(true).validateChangeDeltaSpecs(testDir);

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.level === 'WARNING' && issue.message.includes('skip_design'))).toBe(
      true
    );
  });

  it('does not warn when every key is a known metadata field', async () => {
    await writeMetadata('schema: spec-driven\nskip_specs: true\ncreated: "2026-09-19"\n');

    const report = await new Validator().validateChangeDeltaSpecs(testDir);

    expect(
      report.issues.filter((issue) => issue.path === METADATA_FILENAME && issue.level === 'WARNING')
    ).toHaveLength(0);
    expect(report.valid).toBe(true);
  });

  it('still accepts skip_specs when an unknown key sits beside it', async () => {
    await writeMetadata('schema: spec-driven\nskip_specs: true\nskip_design: true\n');

    const report = await new Validator().validateChangeDeltaSpecs(testDir);

    expect(report.issues.some((issue) => issue.level === 'ERROR')).toBe(false);
    expect(report.issues.some((issue) => issue.message.includes('skip_specs is set'))).toBe(true);
  });
});

describe('status/instructions warn about unrecognized change metadata keys', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-status-unknown-metadata-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'probe');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), PROPOSAL, 'utf-8');
    await fs.writeFile(
      path.join(changeDir, METADATA_FILENAME),
      'schema: spec-driven\nskip_specs: true\nskip_design: true\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('prints a warning when loading a change whose .openspec.yaml has unknown keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const context = loadChangeContext(tempDir, 'probe');

    expect(context.metadata?.skip_specs).toBe(true);
    expect(warn.mock.calls.flat().join('\n')).toContain('skip_design');

    warn.mockRestore();
  });
});
