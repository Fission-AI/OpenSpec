import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Validator } from '../../../src/core/validation/validator.js';
import { schemaProducesDeltaSpecs } from '../../../src/core/artifact-graph/index.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';

function schema(generates: string[]): SchemaYaml {
  return {
    name: 'test',
    version: 1,
    artifacts: generates.map((g, i) => ({
      id: `a${i}`,
      generates: g,
      description: '',
      template: 't.md',
      requires: [],
    })),
  } as SchemaYaml;
}

describe('schemaProducesDeltaSpecs', () => {
  it('is true when an artifact generates under specs/', () => {
    expect(schemaProducesDeltaSpecs(schema(['proposal.md', 'specs/**/*.md']))).toBe(true);
    expect(schemaProducesDeltaSpecs(schema(['specs']))).toBe(true);
    expect(schemaProducesDeltaSpecs(schema(['./specs/x.md']))).toBe(true);
  });

  it('is false for proposal-only / non-specs schemas', () => {
    expect(schemaProducesDeltaSpecs(schema(['proposal.md', 'notes.md']))).toBe(false);
    expect(schemaProducesDeltaSpecs(schema(['design.md', 'tasks.md']))).toBe(false);
  });
});

describe('validateChangeCapabilityCoverage', () => {
  let dir: string;
  const validator = new Validator();

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cov-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function writeProposal(body: string) {
    await fs.writeFile(path.join(dir, 'proposal.md'), body);
  }
  async function writeDelta(cap: string) {
    const d = path.join(dir, 'specs', cap);
    await fs.mkdir(d, { recursive: true });
    await fs.writeFile(
      path.join(d, 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: X\nThe system SHALL X.\n\n#### Scenario: s\n- **WHEN** a\n- **THEN** b\n'
    );
  }

  it('flags a declared capability with no spec file', async () => {
    await writeProposal('## Capabilities\n### New Capabilities\n- `foo`: x\n');
    const report = await validator.validateChangeCapabilityCoverage(dir);
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.level === 'ERROR' && i.message.includes('foo'))).toBe(true);
  });

  it('reports one error per missing capability', async () => {
    await writeProposal('## Capabilities\n### New Capabilities\n- `foo`: x\n- `bar`: y\n- `baz`: z\n');
    await writeDelta('foo');
    const errors = (await validator.validateChangeCapabilityCoverage(dir)).issues.filter(
      (i) => i.level === 'ERROR'
    );
    expect(errors.map((e) => e.path).sort()).toEqual(['specs/bar/spec.md', 'specs/baz/spec.md']);
  });

  it('passes when every declared capability is present (presence only)', async () => {
    await writeProposal('## Capabilities\n### New Capabilities\n- `foo`: x\n');
    await writeDelta('foo');
    expect((await validator.validateChangeCapabilityCoverage(dir)).valid).toBe(true);
  });

  it('does not flag a present-but-non-delta file (left to delta validation)', async () => {
    await writeProposal('## Capabilities\n### New Capabilities\n- `foo`: x\n');
    const d = path.join(dir, 'specs', 'foo');
    await fs.mkdir(d, { recursive: true });
    await fs.writeFile(path.join(d, 'spec.md'), '## Purpose\nfull spec\n## Requirements\n');
    const errors = (await validator.validateChangeCapabilityCoverage(dir)).issues.filter(
      (i) => i.level === 'ERROR'
    );
    // coverage sees the file as present; the non-delta format is delta-validation's job
    expect(errors).toEqual([]);
  });

  it('warns (not errors) on a non-kebab declared id', async () => {
    await writeProposal('## Capabilities\n### New Capabilities\n- `Foo-Bar`: bad\n');
    const report = await validator.validateChangeCapabilityCoverage(dir);
    expect(report.issues.some((i) => i.level === 'WARNING' && i.message.includes('Foo-Bar'))).toBe(true);
    expect(report.issues.some((i) => i.level === 'ERROR')).toBe(false);
  });

  it('contributes nothing when there is no Capabilities section', async () => {
    await writeProposal('## Why\nx\n## What Changes\n- y\n');
    expect((await validator.validateChangeCapabilityCoverage(dir)).issues).toEqual([]);
  });

  it('does not flag undeclared-but-delivered specs', async () => {
    await writeProposal('## Capabilities\n### New Capabilities\n- `foo`: x\n');
    await writeDelta('foo');
    await writeDelta('extra'); // not declared
    expect((await validator.validateChangeCapabilityCoverage(dir)).valid).toBe(true);
  });

  it('fails open when there is no proposal', async () => {
    expect((await validator.validateChangeCapabilityCoverage(dir)).issues).toEqual([]);
  });
});
