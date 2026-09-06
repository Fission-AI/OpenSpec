import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { getToolVersionStatus } from '../../../src/core/shared/tool-detection.js';

/**
 * `openspec update` decided a tool was current from the `generatedBy` version
 * marker in its skill files alone. That marker says nothing about the command
 * files written beside them, so a hand-edited or truncated command file left
 * `update` reporting "All tool(s) up to date" and repairing nothing - the file
 * could only be restored by knowing to pass `--force`. A deleted command file
 * was already detected; a damaged one was not.
 *
 * Every fixture here writes the CURRENT version into the skill marker, so the
 * version check is always satisfied and command-file drift is the only thing
 * that can move `needsUpdate`.
 */
describe('getToolVersionStatus (command file drift)', () => {
  let projectRoot: string;

  const CURRENT = '9.9.9';
  const SKILL_NAMES = [
    'openspec-propose',
    'openspec-apply-change',
    'openspec-archive-change',
  ];
  const COMMAND_DIR = '.claude/commands/opsx';

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-drift-'));
  });
  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  async function writeSkills(version: string) {
    for (const name of SKILL_NAMES) {
      const dir = path.join(projectRoot, '.claude/skills', name);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, 'SKILL.md'),
        `---\nname: ${name}\ngeneratedBy: "${version}"\n---\n\nbody\n`
      );
    }
  }

  async function writeCommands(contents: Record<string, string>) {
    const dir = path.join(projectRoot, COMMAND_DIR);
    await fs.mkdir(dir, { recursive: true });
    for (const [name, body] of Object.entries(contents)) {
      await fs.writeFile(path.join(dir, name), body);
    }
  }

  it('reads the current version marker back, so the fixture is sound', async () => {
    await writeSkills(CURRENT);

    const status = getToolVersionStatus(projectRoot, 'claude', CURRENT);

    expect(status.configured).toBe(true);
    expect(status.generatedByVersion).toBe(CURRENT);
  });

  it('leaves a tool with a current marker and no command files alone', async () => {
    // No command dir at all: nothing to compare, behaviour unchanged.
    await writeSkills(CURRENT);

    const status = getToolVersionStatus(projectRoot, 'claude', CURRENT);

    expect(status.needsUpdate).toBe(false);
  });

  it('flags a tool whose command files no longer match what would be generated', async () => {
    await writeSkills(CURRENT);
    await writeCommands({ 'propose.md': 'CORRUPTED\n', 'apply.md': 'CORRUPTED\n' });

    const status = getToolVersionStatus(projectRoot, 'claude', CURRENT);

    expect(status.configured).toBe(true);
    // The version marker is current, so only command drift can set this.
    expect(status.generatedByVersion).toBe(CURRENT);
    expect(status.needsUpdate).toBe(true);
  });

  it('flags a tool whose command file was truncated to nothing', async () => {
    await writeSkills(CURRENT);
    await writeCommands({ 'propose.md': '' });

    const status = getToolVersionStatus(projectRoot, 'claude', CURRENT);

    expect(status.generatedByVersion).toBe(CURRENT);
    expect(status.needsUpdate).toBe(true);
  });

  it('still flags a stale version marker regardless of command content', async () => {
    await writeSkills('0.0.1');
    await writeCommands({ 'propose.md': 'anything\n' });

    const status = getToolVersionStatus(projectRoot, 'claude', CURRENT);

    expect(status.generatedByVersion).toBe('0.0.1');
    expect(status.needsUpdate).toBe(true);
  });

  it('reports an unconfigured project as needing no update', async () => {
    const status = getToolVersionStatus(projectRoot, 'claude', CURRENT);

    expect(status.configured).toBe(false);
    expect(status.needsUpdate).toBe(false);
  });
});
