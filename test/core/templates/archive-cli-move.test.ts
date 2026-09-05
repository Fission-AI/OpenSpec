import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { runCLI } from '../../helpers/run-cli.js';

const surfaces = [
  ['archive skill', generateSkillContent(getArchiveChangeSkillTemplate(), 'test')],
  ['archive command', getOpsxArchiveCommandTemplate().content],
  ['bulk archive skill', generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'test')],
  ['bulk archive command', getOpsxBulkArchiveCommandTemplate().content],
] as const;

describe('archive workflows delegate the final move to the CLI', () => {
  let root: string;
  const name = '2026-09-05-selected';
  const mainSpec = '# Capability Specification\n\n## Purpose\nPreserve the main specification produced by the earlier intelligent sync.\n\n## Requirements\n\n### Requirement: Feature\nThe system SHALL preserve the manually synchronized behavior.\n\n#### Scenario: Existing behavior\n- **WHEN** invoked\n- **THEN** the synchronized behavior is preserved\n';
  const deltaSpec = '## ADDED Requirements\n\n### Requirement: Feature\nThe system SHALL provide the feature.\n\n#### Scenario: Feature behavior\n- **WHEN** invoked\n- **THEN** the feature runs\n';

  async function write(relative: string, content: string) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-cli-guidance-'));
    await write('openspec/config.yaml', 'schema: spec-driven\n');
    await write(`openspec/changes/${name}/.openspec.yaml`, 'schema: spec-driven\n');
    await write(`openspec/changes/${name}/tasks.md`, '- [x] Finished\n');
    await write(`openspec/changes/${name}/specs/capability/spec.md`, deltaSpec);
    await write('openspec/specs/capability/spec.md', mainSpec);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  function commandArgs(content: string): string[] {
    const invocation = content.match(/^\s*openspec archive "<name>" (.+)$/m);
    expect(invocation, 'the workflow must delegate its final move to the CLI').not.toBeNull();
    expect(content).not.toMatch(/^\s*mv\s/m);
    expect(content).toContain('same selected-root flags');
    expect(content).toContain('archive.path');
    expect(content).toContain('archive.specsUpdated');
    const args = ['archive', name, ...invocation![1].trim().split(/\s+/)];
    expect(args).toEqual(['archive', name, '--skip-specs', '--yes', '--json']);
    return args;
  }

  for (const [surface, content] of surfaces) {
    it(`${surface}: moves once without re-merging specs or stacking the date prefix`, async () => {
      const result = await runCLI(commandArgs(content), { cwd: root });
      expect(result.exitCode, result.stdout + result.stderr).toBe(0);
      const { archive } = JSON.parse(result.stdout);
      const destination = path.join(root, 'openspec/changes/archive', name);
      expect(archive).toMatchObject({ change: name, archivedAs: name, specsUpdated: false });
      expect(realpathSync.native(archive.path)).toBe(realpathSync.native(destination));
      await expect(fs.readFile(path.join(destination, 'specs/capability/spec.md'), 'utf8')).resolves.toBe(deltaSpec);
      await expect(fs.readFile(path.join(root, 'openspec/specs/capability/spec.md'), 'utf8')).resolves.toBe(mainSpec);
      await expect(fs.access(path.join(root, 'openspec/changes', name))).rejects.toThrow();
    });

    it(`${surface}: compares archive identity through a directory alias`, async () => {
      const alias = path.join(root, 'archive-alias');
      const archiveRoot = path.join(root, 'openspec/changes/archive');
      await fs.mkdir(archiveRoot);
      await fs.symlink(archiveRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');

      const result = await runCLI(commandArgs(content), { cwd: root });
      expect(result.exitCode, result.stdout + result.stderr).toBe(0);
      const { archive } = JSON.parse(result.stdout);
      const destination = path.join(alias, name);
      expect(archive.path).not.toBe(destination);
      expect(realpathSync.native(archive.path)).toBe(realpathSync.native(destination));
      await expect(fs.readFile(path.join(destination, 'tasks.md'), 'utf8')).resolves.toBe('- [x] Finished\n');
    });

    it.each(['empty', 'nonempty'])(`${surface}: rejects a %s destination created before the move`, async (state) => {
      const destination = path.join(root, 'openspec/changes/archive', name);
      // Model another actor claiming the target after the workflow inspected it.
      // A shell mv would instead nest the selected change under this directory.
      await expect(fs.access(destination)).rejects.toThrow();
      await fs.mkdir(destination, { recursive: true });
      if (state === 'nonempty') await fs.writeFile(path.join(destination, 'existing.txt'), 'keep me');

      const result = await runCLI(commandArgs(content), { cwd: root });
      expect(result.exitCode).toBe(1);
      const report = JSON.parse(result.stdout);
      expect(report.archive).toBeNull();
      expect(report.status).toContainEqual(expect.objectContaining({ code: 'archive_target_exists' }));
      await expect(fs.readFile(path.join(root, 'openspec/changes', name, 'tasks.md'), 'utf8')).resolves.toBe('- [x] Finished\n');
      await expect(fs.readdir(destination)).resolves.toEqual(state === 'empty' ? [] : ['existing.txt']);
      await expect(fs.readFile(path.join(root, 'openspec/specs/capability/spec.md'), 'utf8')).resolves.toBe(mainSpec);
    });
  }

  it('keeps the existing archive intact in the command collision-recovery example', () => {
    const content = getOpsxArchiveCommandTemplate().content;
    const recovery = content.split('**Output On Error (Archive Exists)**')[1].split('**Guardrails**')[0];
    expect(recovery).toContain('Keep the existing archive intact');
    expect(recovery).toContain('different change name');
    expect(recovery).toContain('CLI diagnostics');
    expect(recovery).not.toMatch(/delete the existing archive|wait until a different date/i);
  });
});
