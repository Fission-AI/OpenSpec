import { afterAll, describe, it, expect } from 'vitest';
import { promises as fs, realpathSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI, cliProjectRoot } from '../helpers/run-cli.js';
import { AI_TOOLS } from '../../src/core/config.js';
import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const tempRoots: string[] = [];

async function prepareFixture(fixtureName: string): Promise<string> {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-cli-e2e-'));
  tempRoots.push(base);
  const projectDir = path.join(base, 'project');
  await fs.mkdir(projectDir, { recursive: true });
  const fixtureDir = path.join(cliProjectRoot, 'test', 'fixtures', fixtureName);
  await fs.cp(fixtureDir, projectDir, { recursive: true });
  return projectDir;
}

function expectJsonOnlyOutput(result: Awaited<ReturnType<typeof runCLI>>) {
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
  expect(() => JSON.parse(result.stdout)).not.toThrow();
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('openspec CLI e2e basics', () => {
  it('shows help output', async () => {
    const result = await runCLI(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: openspec');
    expect(result.stderr).toBe('');

  });

  it('shows dynamic tool ids in init help', async () => {
    const result = await runCLI(['init', '--help']);
    expect(result.exitCode).toBe(0);

    const expectedTools = AI_TOOLS.filter((tool) => tool.available)
      .map((tool) => tool.value)
      .join(', ');
    const normalizedOutput = result.stdout.replace(/\s+/g, ' ').trim();
    expect(normalizedOutput).toContain(
      `Use "all", "none", or a comma-separated list of: ${expectedTools}`
    );
    expect(normalizedOutput).toContain('--language <language>');
  });

  it('reports the package version', async () => {
    const pkgRaw = await fs.readFile(path.join(cliProjectRoot, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    const result = await runCLI(['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(pkg.version);
  });

  it('validates the tmp-init fixture with --all --json', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['validate', '--all', '--json'], { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    const output = result.stdout.trim();
    expect(output).not.toBe('');
    const json = JSON.parse(output);
    expect(json.summary?.totals?.failed).toBe(0);
    expect(json.items.some((item: any) => item.id === 'c1' && item.type === 'change')).toBe(true);
  });

  it('keeps list --json free of spinner output', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['list', '--json'], { cwd: projectDir });
    expectJsonOnlyOutput(result);
  });

  it.each([
    { flags: ['--archived'], active: false },
    { flags: ['--all'], active: true },
    { flags: ['--archived', '--all'], active: true },
  ])('lists archive entries as JSON with $flags', async ({ flags, active }) => {
    const projectDir = await prepareFixture('tmp-init');
    const archiveName = '2026-08-27-shipped';
    const archiveDir = path.join(projectDir, 'openspec', 'changes', 'archive', archiveName);
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.writeFile(path.join(archiveDir, 'tasks.md'), '- [x] Done\n- [ ] Deferred\n');

    const result = await runCLI(['list', ...flags, '--sort', 'name', '--json'], { cwd: projectDir });

    expectJsonOnlyOutput(result);
    const output = JSON.parse(result.stdout);
    expect(output.changes).toContainEqual(expect.objectContaining({
      name: archiveName,
      archived: true,
      completedTasks: 1,
      totalTasks: 2,
      status: 'in-progress',
    }));
    expect(output.changes.some((change: { archived: boolean }) => !change.archived)).toBe(active);
    expect(output.changes.map((change: { name: string }) => change.name)).toEqual(
      output.changes.map((change: { name: string }) => change.name).sort((a: string, b: string) => a.localeCompare(b))
    );
    expect(realpathSync.native(output.root.path)).toBe(realpathSync.native(projectDir));
  });

  it.skipIf(process.platform === 'win32')('lists a change after archive leaves its relative notes link dangling', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const changeName = '2026-08-28-linked-notes';
    const changesDir = path.join(projectDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir);
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
    await fs.writeFile(path.join(changesDir, 'reference.md'), 'Shared notes\n');
    await fs.symlink('../reference.md', path.join(changeDir, 'notes.md'));

    const before = await runCLI(['list', '--json'], { cwd: projectDir });
    expectJsonOnlyOutput(before);
    const archived = await runCLI(['archive', changeName, '--skip-specs', '--yes'], { cwd: projectDir });
    expect(archived.exitCode, archived.stderr).toBe(0);
    await expect(fs.stat(path.join(changesDir, 'archive', changeName, 'notes.md'))).rejects.toMatchObject({ code: 'ENOENT' });

    const result = await runCLI(['list', '--archived', '--json'], { cwd: projectDir });

    expectJsonOnlyOutput(result);
    expect(JSON.parse(result.stdout).changes).toContainEqual(expect.objectContaining({
      name: changeName, archived: true, completedTasks: 1, totalTasks: 1
    }));
  });

  it.each(['--archived', '--all'])('rejects --specs with %s as a JSON error', async (flag) => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['list', '--specs', flag, '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output.specs).toEqual([]);
    expect(output.status).toEqual([expect.objectContaining({
      severity: 'error',
      code: 'list_error',
      message: '--archived and --all can only be used when listing changes.',
    })]);
  });

  it.each(['archive', ''])('reports malformed changes/%s as an error instead of an empty JSON list', async (entry) => {
    const projectDir = await prepareFixture('tmp-init');
    const malformedPath = path.join(projectDir, 'openspec', 'changes', entry);
    await fs.rm(malformedPath, { recursive: true, force: true });
    await fs.writeFile(malformedPath, 'not a directory\n');

    const result = await runCLI(['list', '--archived', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(1);
    const output = JSON.parse(result.stdout);
    expect(output.changes).toEqual([]);
    expect(output.status).toEqual([expect.objectContaining({ severity: 'error', code: 'list_error' })]);
  });

  it('keeps schemas --json free of spinner output', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['schemas', '--json'], { cwd: projectDir });
    expectJsonOnlyOutput(result);
  });

  it('keeps status --json free of spinner output', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['status', '--change', 'c1', '--json'], { cwd: projectDir });
    expectJsonOnlyOutput(result);
  });

  it('keeps instructions --json free of spinner output', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['instructions', 'proposal', '--change', 'c1', '--json'], {
      cwd: projectDir,
    });
    expectJsonOnlyOutput(result);
  });

  it('keeps instructions apply --json free of spinner output', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['instructions', 'apply', '--change', 'c1', '--json'], {
      cwd: projectDir,
    });
    expectJsonOnlyOutput(result);
  });

  it('keeps templates --json free of spinner output', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['templates', '--json'], { cwd: projectDir });
    expectJsonOnlyOutput(result);
  });

  it('returns an error for unknown items in the fixture', async () => {
    const projectDir = await prepareFixture('tmp-init');
    const result = await runCLI(['validate', 'does-not-exist'], { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown item 'does-not-exist'");
  });

  describe('init command non-interactive options', () => {
    it('initializes artifact language non-interactively', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'language-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(
        ['init', '--tools', 'none', '--language', 'French', '--no-animation'],
        { cwd: emptyProjectDir },
      );

      expect(result.exitCode).toBe(0);
      const config = await fs.readFile(
        path.join(emptyProjectDir, 'openspec', 'config.yaml'),
        'utf-8',
      );
      expect(config).toContain('Language: French');
      expect(config).toContain('All artifacts must be written in French.');
      expect(config).toContain('Keep OpenSpec structural headings and SHALL/MUST keywords in English.');

      const created = await runCLI(['new', 'change', 'language-check'], {
        cwd: emptyProjectDir,
      });
      expect(created.exitCode).toBe(0);
      const instructions = await runCLI(
        ['instructions', 'proposal', '--change', 'language-check', '--json'],
        { cwd: emptyProjectDir },
      );
      expect(instructions.exitCode).toBe(0);
      expect(JSON.parse(instructions.stdout).context).toContain('Language: French');
    });

    it('initializes with --tools all option', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const codexHome = path.join(emptyProjectDir, '.codex');
      const testHome = path.join(emptyProjectDir, 'home');
      const result = await runCLI(['init', '--tools', 'all'], {
        cwd: emptyProjectDir,
        env: { CODEX_HOME: codexHome, HOME: testHome, USERPROFILE: testHome },
        timeoutMs: 20000,
      });
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OpenSpec Setup Complete');

      // Check that skills were created for multiple tools
      const claudeSkillPath = path.join(emptyProjectDir, '.claude/skills/openspec-explore/SKILL.md');
      const cursorSkillPath = path.join(emptyProjectDir, '.cursor/skills/openspec-explore/SKILL.md');
      const minimaxSkillPath = path.join(
        testHome,
        '.minimax/skills/openspec-explore/SKILL.md'
      );
      expect(await fileExists(claudeSkillPath)).toBe(true);
      expect(await fileExists(cursorSkillPath)).toBe(true);
      expect(await fileExists(minimaxSkillPath)).toBe(true);
    }, 25000);

    it('initializes with --tools list option', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'claude'], { cwd: emptyProjectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OpenSpec Setup Complete');
      expect(result.stdout).toContain('Claude Code');

      // New init creates skills, not CLAUDE.md
      const claudeSkillPath = path.join(emptyProjectDir, '.claude/skills/openspec-explore/SKILL.md');
      const cursorSkillPath = path.join(emptyProjectDir, '.cursor/skills/openspec-explore/SKILL.md');
      expect(await fileExists(claudeSkillPath)).toBe(true);
      expect(await fileExists(cursorSkillPath)).toBe(false); // Not selected
    });

    it('initializes with --tools agents option', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'agents'], { cwd: emptyProjectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OpenSpec Setup Complete');

      const skillPath = path.join(emptyProjectDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(skillPath)).toBe(true);
    });

    it('initializes with --tools zed option', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'zed'], { cwd: emptyProjectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OpenSpec Setup Complete');
      expect(result.stdout).toContain('Zed Agent');
      expect(result.stdout).not.toContain('Restart your IDE');

      const skillPath = path.join(emptyProjectDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(skillPath)).toBe(true);
      expect(await fs.readFile(
        path.join(emptyProjectDir, '.agents', 'skills', '.openspec-target'),
        'utf-8'
      )).toBe('zed\n');

      const updateResult = await runCLI(['update'], { cwd: emptyProjectDir });
      expect(updateResult.exitCode).toBe(0);
      expect(await fs.readFile(
        path.join(emptyProjectDir, '.agents', 'skills', '.openspec-target'),
        'utf-8'
      )).toBe('zed\n');
      const updatedSkill = await fs.readFile(skillPath, 'utf-8');
      expect(updatedSkill).toContain('/openspec-explore');
      expect(updatedSkill).not.toContain('$openspec-explore');
    });

    it('initializes with --tools none option', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'none'], { cwd: emptyProjectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OpenSpec Setup Complete');

      // With --tools none, no tool skills should be created
      const claudeSkillPath = path.join(emptyProjectDir, '.claude/skills/openspec-explore/SKILL.md');
      const cursorSkillPath = path.join(emptyProjectDir, '.cursor/skills/openspec-explore/SKILL.md');

      expect(await fileExists(claudeSkillPath)).toBe(false);
      expect(await fileExists(cursorSkillPath)).toBe(false);
    });

    it('returns error for invalid tool names', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'invalid-tool'], { cwd: emptyProjectDir });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid tool(s): invalid-tool');
      expect(result.stderr).toContain('Available values:');
    });

    it('returns error when combining reserved keywords with explicit ids', async () => {
      const projectDir = await prepareFixture('tmp-init');
      const emptyProjectDir = path.join(projectDir, '..', 'empty-project');
      await fs.mkdir(emptyProjectDir, { recursive: true });

      const result = await runCLI(['init', '--tools', 'all,claude'], { cwd: emptyProjectDir });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Cannot combine reserved values "all" or "none" with specific tool IDs');
    });
  });

  describe('archive with no terminal to answer its prompts (#1479)', () => {
    // runCLI closes the child's stdin, which is exactly how an AI agent or a
    // CI script invokes the CLI.
    async function prepareChange(options: { tasksComplete?: boolean } = {}): Promise<string> {
      const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-archive-e2e-'));
      tempRoots.push(base);
      const changeDir = path.join(base, 'openspec', 'changes', 'add-greeting');
      await fs.mkdir(path.join(changeDir, 'specs', 'greeting'), { recursive: true });
      await fs.mkdir(path.join(base, 'openspec', 'specs'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '## Why\nThis change exists to document greeting behavior for the team, which is long enough.\n\n## What Changes\n- Add a greeting requirement.\n'
      );
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        options.tasksComplete === false ? '- [ ] Task 1\n' : '- [x] Task 1\n'
      );
      await fs.writeFile(
        path.join(changeDir, 'specs', 'greeting', 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: Greeting\nThe system SHALL greet the user.\n\n#### Scenario: Greets on request\n- **WHEN** the user says hello\n- **THEN** the system greets back\n'
      );
      return base;
    }

    it('reports the flag to pass instead of a closed-prompt error', async () => {
      const projectDir = await prepareChange();
      const result = await runCLI(['archive', 'add-greeting'], { cwd: projectDir });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).not.toContain('force closed the prompt');
      expect(output).toContain('no answer could be read from stdin');
      expect(output).toContain('openspec archive add-greeting --yes');

      // The change is untouched: nothing was archived or merged.
      expect(await fileExists(path.join(projectDir, 'openspec', 'changes', 'add-greeting', 'proposal.md'))).toBe(true);
      expect(await fileExists(path.join(projectDir, 'openspec', 'specs', 'greeting', 'spec.md'))).toBe(false);
    });

    it('reports the incomplete-task prompt the same way', async () => {
      const projectDir = await prepareChange({ tasksComplete: false });
      const result = await runCLI(['archive', 'add-greeting'], { cwd: projectDir });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).not.toContain('force closed the prompt');
      expect(output).toContain('1 incomplete task(s) found');
      expect(output).toContain('openspec archive add-greeting --yes');
    });

    it('keeps the caller\'s own flags in the suggested rerun', async () => {
      // Suggesting a bare --yes rerun here would merge the deltas that
      // --skip-specs was passed to leave alone.
      const projectDir = await prepareChange({ tasksComplete: false });
      const result = await runCLI(['archive', 'add-greeting', '--skip-specs'], { cwd: projectDir });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).toContain('openspec archive add-greeting --skip-specs --yes');
    });

    it('reports the skip-validation prompt the same way', async () => {
      const projectDir = await prepareChange();
      const result = await runCLI(['archive', 'add-greeting', '--no-validate'], { cwd: projectDir });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).not.toContain('force closed the prompt');
      expect(output).toContain('Skipping validation requires confirmation');
      expect(output).toContain('openspec archive add-greeting --no-validate --yes');
    });

    it('archives normally once that flag is passed', async () => {
      const projectDir = await prepareChange();
      const result = await runCLI(['archive', 'add-greeting', '--yes'], { cwd: projectDir });

      expect(result.exitCode).toBe(0);
      expect(await fileExists(path.join(projectDir, 'openspec', 'specs', 'greeting', 'spec.md'))).toBe(true);
    });

    it('asks for a change name instead of exiting 0 without archiving', async () => {
      const projectDir = await prepareChange();
      const result = await runCLI(['archive'], { cwd: projectDir });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).toContain('A change name is required');
      expect(await fileExists(path.join(projectDir, 'openspec', 'changes', 'add-greeting', 'proposal.md'))).toBe(true);
    });

    it('keeps --store in the suggested rerun for a store-rooted change', async () => {
      // The rerun has to name the same root the blocked run used, or pasting
      // it archives from the wrong place - or from nowhere.
      const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-archive-store-e2e-'));
      tempRoots.push(base);
      const env = {
        XDG_DATA_HOME: path.join(base, 'data'),
        XDG_CONFIG_HOME: path.join(base, 'config'),
      };
      const storeRoot = path.join(base, 'team-store');
      createOpenSpecRoot(storeRoot);
      await registerStore({
        id: 'team-store',
        localPath: storeRoot,
        globalDataDir: getGlobalDataDir({ env }),
      });

      const changeDir = path.join(storeRoot, 'openspec', 'changes', 'add-greeting');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

      const scratch = path.join(base, 'no-root-here');
      await fs.mkdir(scratch, { recursive: true });

      const result = await runCLI(['archive', 'add-greeting', '--store', 'team-store'], {
        cwd: scratch,
        env,
      });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).toContain('openspec archive add-greeting --yes --store team-store');
    });

    it('keeps --store in front of the `--` for a dash-leading change name', async () => {
      // `rerunCommand` has two branches and the other tests only ever cover
      // one at a time, so dropping the store flag from just this one went
      // unnoticed. Both halves have to be right at once: the store flag stays
      // an option (in front of `--`) while the name stays an argument
      // (behind it).
      const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-archive-store-dash-e2e-'));
      tempRoots.push(base);
      const env = {
        XDG_DATA_HOME: path.join(base, 'data'),
        XDG_CONFIG_HOME: path.join(base, 'config'),
      };
      const storeRoot = path.join(base, 'team-store');
      createOpenSpecRoot(storeRoot);
      await registerStore({
        id: 'team-store',
        localPath: storeRoot,
        globalDataDir: getGlobalDataDir({ env }),
      });

      const changeDir = path.join(storeRoot, 'openspec', 'changes', '--force');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

      const scratch = path.join(base, 'no-root-here');
      await fs.mkdir(scratch, { recursive: true });

      const result = await runCLI(['archive', '--store', 'team-store', '--', '--force'], {
        cwd: scratch,
        env,
      });

      const output = `${result.stdout}${result.stderr}`;
      expect(result.exitCode).toBe(1);
      expect(output).toContain('openspec archive --yes --store team-store -- --force');
    });
  });
});
