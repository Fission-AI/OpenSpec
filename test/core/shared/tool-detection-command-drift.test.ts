import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  getToolVersionStatus,
  SKILL_NAMES,
} from '../../../src/core/shared/tool-detection.js';
import { getCommandContents } from '../../../src/core/shared/skill-generation.js';
import {
  CommandAdapterRegistry,
  generateCommands,
} from '../../../src/core/command-generation/index.js';
import { getProfileWorkflows } from '../../../src/core/profiles.js';

/**
 * `openspec update` decided a tool was current from the `generatedBy` version
 * marker in its skill files alone. That marker only proves the SKILL files came
 * from this CLI - it says nothing about the command files written beside them,
 * which a user may have hand-edited or a partial write may have truncated. So a
 * damaged command file left `update` reporting "All tool(s) up to date" and
 * repairing nothing, recoverable only by knowing to pass `--force`.
 *
 * These tests are built so that command-file CONTENT is the only variable:
 *
 * - The skill marker always carries the version passed to `getToolVersionStatus`,
 *   so the version check is satisfied and cannot be what moves `needsUpdate`.
 * - Every fixture writes the COMPLETE generated command set first and asserts the
 *   install reads as clean. `areCommandFilesUpToDate` returns false on the first
 *   MISSING file, before comparing any content, so a partial fixture would pass
 *   these tests without ever reaching the content comparison they exist to check.
 * - Global config is redirected to a temp `XDG_CONFIG_HOME` pinned to
 *   profile `core` / delivery `both`. The host's own config would otherwise
 *   decide which commands are expected (a custom profile changes the set) and
 *   whether commands are compared at all (`delivery: skills` skips them).
 */
describe('getToolVersionStatus (command file drift)', () => {
  let projectRoot: string;
  let configHome: string;
  let previousXdgConfigHome: string | undefined;

  const CURRENT = '9.9.9';
  const TOOL_ID = 'claude';

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-drift-'));
    configHome = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-drift-cfg-'));

    previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = configHome;
    await fs.mkdir(path.join(configHome, 'openspec'), { recursive: true });
    await fs.writeFile(
      path.join(configHome, 'openspec', 'config.json'),
      JSON.stringify({ profile: 'core', delivery: 'both' })
    );
  });

  afterEach(async () => {
    if (previousXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
    }
    await fs.rm(projectRoot, { recursive: true, force: true });
    await fs.rm(configHome, { recursive: true, force: true });
  });

  /** Skill files carrying `version` in their `generatedBy` marker. */
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

  /**
   * The exact command files this CLI would generate for the pinned profile,
   * written to disk. Returns their absolute paths so a test can damage one.
   */
  async function writeGeneratedCommands(): Promise<string[]> {
    const adapter = CommandAdapterRegistry.get(TOOL_ID);
    if (!adapter) throw new Error(`no command adapter for ${TOOL_ID}`);
    const commands = generateCommands(
      getCommandContents(getProfileWorkflows('core')),
      adapter
    );
    expect(commands.length).toBeGreaterThan(0);

    const written: string[] = [];
    for (const command of commands) {
      const target = path.isAbsolute(command.path)
        ? command.path
        : path.join(projectRoot, command.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, command.fileContent);
      written.push(target);
    }
    return written;
  }

  /** A complete, current install: current marker plus every generated command. */
  async function writeCleanInstall(): Promise<string[]> {
    await writeSkills(CURRENT);
    const commands = await writeGeneratedCommands();
    // Guard: the fixture itself must read as clean, otherwise the drift tests
    // below could pass on a missing file rather than on changed content.
    expect(getToolVersionStatus(projectRoot, TOOL_ID, CURRENT).needsUpdate).toBe(false);
    return commands;
  }

  it('reads a complete, current install as needing no update', async () => {
    await writeCleanInstall();

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.configured).toBe(true);
    expect(status.generatedByVersion).toBe(CURRENT);
    expect(status.needsUpdate).toBe(false);
  });

  it('flags an otherwise-current install whose command file content was edited', async () => {
    const commands = await writeCleanInstall();
    await fs.writeFile(commands[0], 'CORRUPTED\n');

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    // Marker still current, every command file still present: only the changed
    // content can be what moved this.
    expect(status.generatedByVersion).toBe(CURRENT);
    expect(status.needsUpdate).toBe(true);
  });

  it('flags an otherwise-current install whose command file was truncated', async () => {
    const commands = await writeCleanInstall();
    await fs.writeFile(commands[0], '');

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.generatedByVersion).toBe(CURRENT);
    expect(status.needsUpdate).toBe(true);
  });

  it('flags an otherwise-current install whose command file was appended to', async () => {
    const commands = await writeCleanInstall();
    const original = await fs.readFile(commands[0], 'utf-8');
    await fs.writeFile(commands[0], `${original}\nMY CUSTOM NOTE\n`);

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.needsUpdate).toBe(true);
  });

  it('also flags a deleted command file, which this status check used to miss', async () => {
    const commands = await writeCleanInstall();
    await fs.rm(commands[0]);

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.needsUpdate).toBe(true);
  });

  // `openspec update` already rewrote a DELETED command file before this change,
  // but not via this function: `getToolsNeedingProfileSync` catches a missing
  // file independently, and its result is unioned with `needsUpdate` in
  // update.ts. So deletion is not a behaviour change at the CLI level - it is
  // simply now caught here too, which is why the test above says "also".
  // Content drift was caught by neither, and that is what this change fixes.

  it('leaves a skills-only install driven by the version marker', async () => {
    // No command files at all, so there is nothing to compare: this exercises
    // the unchanged marker-only path, not the new comparison.
    await writeSkills(CURRENT);

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.configured).toBe(true);
    expect(status.generatedByVersion).toBe(CURRENT);
    expect(status.needsUpdate).toBe(false);
  });

  it('still flags a stale version marker even when every command file is current', async () => {
    await writeSkills('0.0.1');
    await writeGeneratedCommands();

    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.generatedByVersion).toBe('0.0.1');
    expect(status.needsUpdate).toBe(true);
  });

  it('reports an unconfigured project as needing no update', async () => {
    const status = getToolVersionStatus(projectRoot, TOOL_ID, CURRENT);

    expect(status.configured).toBe(false);
    expect(status.needsUpdate).toBe(false);
  });
});
