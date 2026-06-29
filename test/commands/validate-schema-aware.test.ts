import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('validate: schema-aware delta gate (#997) and archived-drift audit', () => {
  let dir: string;
  let changesDir: string;
  let specsDir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-schema-aware-'));
    changesDir = path.join(dir, 'openspec', 'changes');
    specsDir = path.join(dir, 'openspec', 'specs');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });

    // Project-local proposal-only schema (no artifact generates under specs/).
    const schemaDir = path.join(dir, 'openspec', 'schemas', 'proposal-only');
    await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
    await fs.writeFile(
      path.join(schemaDir, 'schema.yaml'),
      'name: proposal-only\nversion: 1\nartifacts:\n  - id: proposal\n    generates: proposal.md\n    description: p\n    template: proposal.md\n    requires: []\n'
    );
    await fs.writeFile(path.join(schemaDir, 'templates', 'proposal.md'), 'tpl');
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function change(name: string, schema: string | null) {
    const d = path.join(changesDir, name);
    await fs.mkdir(d, { recursive: true });
    if (schema) await fs.writeFile(path.join(d, '.openspec.yaml'), `schema: ${schema}\ncreated: 2026-06-29\n`);
    await fs.writeFile(path.join(d, 'proposal.md'), '## Why\nlong enough why for validation here today.\n\n## What Changes\n- x\n');
    return d;
  }

  it('proposal-only schema with no specs PASSES validate', async () => {
    await change('lighter', 'proposal-only');
    const r = await runCLI(['validate', 'lighter'], { cwd: dir });
    expect(r.exitCode).toBe(0);
  });

  it('spec-driven change with no specs FAILS with CHANGE_NO_DELTAS', async () => {
    await change('strict', 'spec-driven');
    const r = await runCLI(['validate', 'strict'], { cwd: dir });
    expect(r.exitCode).toBe(1);
    expect(r.stdout + r.stderr).toContain('at least one delta');
  });

  it('bulk validate applies the gate per change (proposal-only ok, spec-driven fails)', async () => {
    await change('lighter', 'proposal-only');
    await change('strict', 'spec-driven');
    const r = await runCLI(['validate', '--changes', '--json'], { cwd: dir });
    const out = JSON.parse(r.stdout);
    const byId = Object.fromEntries(out.items.map((i: any) => [i.id, i.valid]));
    expect(byId['lighter']).toBe(true);
    expect(byId['strict']).toBe(false);
  });

  it('--archived flags an archived change whose declared capability never synced', async () => {
    const arch = path.join(changesDir, 'archive', '2026-01-01-old');
    await fs.mkdir(arch, { recursive: true });
    await fs.writeFile(
      path.join(arch, 'proposal.md'),
      '## Why\nx\n\n## Capabilities\n### New Capabilities\n- `lost-cap`: never synced\n'
    );
    const r = await runCLI(['validate', '--archived'], { cwd: dir });
    expect(r.exitCode).toBe(1);
    expect(r.stdout + r.stderr).toContain('lost-cap');

    // After the main spec exists, the audit is clean.
    await fs.mkdir(path.join(specsDir, 'lost-cap'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'lost-cap', 'spec.md'), '# lost-cap\n');
    const r2 = await runCLI(['validate', '--archived'], { cwd: dir });
    expect(r2.exitCode).toBe(0);
  });
});
