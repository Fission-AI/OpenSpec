import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArchiveCommand } from '../../src/core/archive.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Non-interactive: with --yes the human prompts are skipped; the validation
// gate is exercised directly.
vi.mock('@inquirer/prompts', () => ({ select: vi.fn(), confirm: vi.fn() }));

describe('archive spec-drop gate', () => {
  let tempDir: string;
  let cmd: ArchiveCommand;
  const origLog = console.log;
  const origXdg = process.env.XDG_DATA_HOME;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `archive-gate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'archive'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
    process.chdir(tempDir);
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg');
    console.log = vi.fn();
    cmd = new ArchiveCommand();
  });
  afterEach(async () => {
    console.log = origLog;
    if (origXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = origXdg;
    vi.clearAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const changesDir = () => path.join(tempDir, 'openspec', 'changes');

  async function makeChange(
    name: string,
    opts: { caps?: string[]; deltaSpecs?: string[]; fullSpecs?: string[] } = {}
  ) {
    const dir = path.join(changesDir(), name);
    await fs.mkdir(dir, { recursive: true });
    const capLines = (opts.caps ?? []).map((c) => `- \`${c}\`: ${c}`).join('\n');
    const capsSection = capLines ? `\n\n## Capabilities\n### New Capabilities\n${capLines}` : '';
    await fs.writeFile(
      path.join(dir, 'proposal.md'),
      `## Why\nA sufficiently long why section for archive gate testing purposes here today.\n\n## What Changes\n- stuff${capsSection}\n\n## Impact\n- code\n`
    );
    await fs.writeFile(path.join(dir, 'tasks.md'), '## 1\n- [x] 1.1 done\n');
    for (const cap of opts.deltaSpecs ?? []) {
      const d = path.join(dir, 'specs', cap);
      await fs.mkdir(d, { recursive: true });
      await fs.writeFile(
        path.join(d, 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: X\nThe system SHALL X.\n\n#### Scenario: s\n- **WHEN** a\n- **THEN** b\n'
      );
    }
    for (const cap of opts.fullSpecs ?? []) {
      const d = path.join(dir, 'specs', cap);
      await fs.mkdir(d, { recursive: true });
      await fs.writeFile(path.join(d, 'spec.md'), '## Purpose\nfull\n## Requirements\n');
    }
    return dir;
  }

  async function isArchived(name: string): Promise<boolean> {
    const entries = await fs.readdir(path.join(changesDir(), 'archive'));
    return entries.some((e) => e.includes(name));
  }
  async function stillActive(dir: string): Promise<boolean> {
    return fs.access(dir).then(() => true, () => false);
  }

  it('blocks total drop (spec-driven change with no specs) and moves nothing', async () => {
    const dir = await makeChange('total', { caps: ['demo'] });
    await cmd.execute('total', { yes: true });
    expect(await stillActive(dir)).toBe(true);
    expect(await isArchived('total')).toBe(false);
  });

  it('blocks partial drop (declares a,b; only a shipped)', async () => {
    const dir = await makeChange('partial', { caps: ['a', 'b'], deltaSpecs: ['a'] });
    await cmd.execute('partial', { yes: true });
    expect(await stillActive(dir)).toBe(true);
    expect(await isArchived('partial')).toBe(false);
  });

  it('blocks format drop (present non-delta full spec)', async () => {
    const dir = await makeChange('fmt', { caps: ['x'], fullSpecs: ['x'] });
    await cmd.execute('fmt', { yes: true });
    expect(await stillActive(dir)).toBe(true);
    expect(await isArchived('fmt')).toBe(false);
  });

  it('--yes alone does NOT bypass the gate', async () => {
    const dir = await makeChange('yesonly', { caps: ['demo'] });
    await cmd.execute('yesonly', { yes: true });
    expect(await stillActive(dir)).toBe(true);
  });

  it('--skip-specs bypasses the gate and archives', async () => {
    await makeChange('skipped', { caps: ['demo'] });
    await cmd.execute('skipped', { yes: true, skipSpecs: true });
    expect(await isArchived('skipped')).toBe(true);
  });

  it('archives cleanly when every declared capability has a valid delta spec', async () => {
    await makeChange('good', { caps: ['cap'], deltaSpecs: ['cap'] });
    await cmd.execute('good', { yes: true });
    expect(await isArchived('good')).toBe(true);
  });

  it('proposal-only schema (no specs artifact) archives without specs', async () => {
    // project-local schema with no artifact generating under specs/
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'proposal-only');
    await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
    await fs.writeFile(
      path.join(schemaDir, 'schema.yaml'),
      'name: proposal-only\nversion: 1\nartifacts:\n  - id: proposal\n    generates: proposal.md\n    description: p\n    template: proposal.md\n    requires: []\n'
    );
    await fs.writeFile(path.join(schemaDir, 'templates', 'proposal.md'), 'tpl');
    const dir = path.join(changesDir(), 'lighter');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, '.openspec.yaml'), 'schema: proposal-only\ncreated: 2026-06-29\n');
    await fs.writeFile(path.join(dir, 'proposal.md'), '## Why\nproposal-only change with no specs at all here today.\n\n## What Changes\n- x\n');
    await cmd.execute('lighter', { yes: true });
    expect(await isArchived('lighter')).toBe(true);
    expect(await stillActive(dir)).toBe(false);
  });
});
