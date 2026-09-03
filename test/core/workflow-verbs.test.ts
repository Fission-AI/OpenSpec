import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { WORKFLOW_VERBS, getWorkflowVerbGuidance } from '../../src/core/workflow-verbs.js';
import { ALL_WORKFLOWS } from '../../src/core/profiles.js';
import { program } from '../../src/cli/index.js';

const tempRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

async function makeProject(): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workflow-verbs-'));
  tempRoots.push(base);
  const projectDir = path.join(base, 'project');
  await fs.mkdir(projectDir, { recursive: true });
  return projectDir;
}

async function installSkill(projectDir: string, toolDir: string, skillName: string): Promise<void> {
  const skillDir = path.join(projectDir, toolDir, 'skills', skillName);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), '# skill\n');
}

async function installCommand(projectDir: string, filePath: string): Promise<void> {
  const target = path.join(projectDir, filePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, '# command\n');
}

async function writeGlobalConfig(config: Record<string, unknown>): Promise<void> {
  const configDir = path.join(process.env.XDG_CONFIG_HOME as string, 'openspec');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(config));
}

beforeEach(async () => {
  // Detection reads global skill roots (e.g. ~/.minimax/skills) and the global
  // config; point both at an empty directory so the machine running the tests
  // cannot add tools this project never installed.
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workflow-verbs-home-'));
  tempRoots.push(home);
  for (const key of ['HOME', 'USERPROFILE', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key];
    process.env[key] = home;
  }
});

afterEach(async () => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  await Promise.all(tempRoots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('workflow verbs typed at the CLI', () => {
  it('covers every workflow whose name the CLI does not already use', () => {
    // Only the visible commands: the verbs themselves are registered hidden.
    const registeredCommandNames = new Set(
      program.commands
        .filter((command) => !(command as unknown as { _hidden?: boolean })._hidden)
        .map((command) => command.name())
    );
    // A verb that collides with a real command cannot ship: commander throws
    // at registration time, so the module fails to load. What can rot silently
    // is the reserved list - drop `openspec archive` and 'archive' would be
    // neither a CLI command nor a verb, leaving the workflow unreachable from
    // the terminal with no error anywhere.
    const missing = ALL_WORKFLOWS.filter(
      (workflowId) => !WORKFLOW_VERBS.includes(workflowId) && !registeredCommandNames.has(workflowId)
    );
    expect(missing).toEqual([]);
  });

  it('registers each verb as a hidden command so help output stays unchanged', () => {
    for (const verb of WORKFLOW_VERBS) {
      const command = program.commands.find((candidate) => candidate.name() === verb);
      expect(command, `${verb} should be registered`).toBeDefined();
      expect((command as unknown as { _hidden?: boolean })._hidden).toBe(true);
    }
  });

  it('points at init when the project has no OpenSpec tools', async () => {
    const projectDir = await makeProject();

    const guidance = getWorkflowVerbGuidance('propose', projectDir);

    expect(guidance.message).toContain("'propose' is an OpenSpec workflow, not a CLI command");
    expect(guidance.details).toEqual([
      "Fix: run 'openspec init' to install the workflows, then invoke /opsx:propose in your assistant.",
    ]);
  });

  it('points at the profile picker when the workflow is not installed', async () => {
    const projectDir = await makeProject();
    await installSkill(projectDir, '.claude', 'openspec-propose');

    const guidance = getWorkflowVerbGuidance('verify', projectDir);

    expect(guidance.details).toEqual([
      'The verify workflow is not installed in this project.',
      "Fix: run 'openspec config profile' to add it, then run /opsx:verify in your assistant.",
    ]);
  });

  it('spells the workflow the same way whether or not it is installed', async () => {
    const projectDir = await makeProject();
    await installSkill(projectDir, '.claude', 'openspec-propose');
    await writeGlobalConfig({ delivery: 'skills' });

    const missing = getWorkflowVerbGuidance('verify', projectDir);
    const present = getWorkflowVerbGuidance('propose', projectDir);

    // The spelling follows the tool and the delivery mode, never whether the
    // workflow happens to be installed - so a skills-only project is told to
    // add `verify` and invoke it the same way it already invokes `propose`.
    expect(missing.details).toEqual([
      'The verify workflow is not installed in this project.',
      "Fix: run 'openspec config profile' to add it, then run /openspec-verify-change in your assistant.",
    ]);
    expect(present.details).toEqual(['Fix: run /openspec-propose in your assistant.']);
  });

  it('labels every spelling when a missing workflow serves tools that disagree', async () => {
    const projectDir = await makeProject();
    await installCommand(projectDir, path.join('.claude', 'commands', 'opsx', 'propose.md'));
    await installCommand(projectDir, path.join('.github', 'prompts', 'opsx-propose.prompt.md'));

    const guidance = getWorkflowVerbGuidance('verify', projectDir);

    expect(guidance.details).toEqual([
      'The verify workflow is not installed in this project.',
      "Fix: run 'openspec config profile' to add it, then use it in your assistant:",
      '  /opsx:verify (Claude Code)',
      '  /opsx-verify (GitHub Copilot)',
    ]);
  });

  it("uses a tool's own prompt-library prefix", async () => {
    const projectDir = await makeProject();
    // Amazon Q loads these files into its prompt library, invoked with `@`.
    await installSkill(projectDir, '.amazonq', 'openspec-explore');

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details).toEqual(['Fix: run @opsx-explore in your assistant.']);
  });

  it('phrases the fix as a request for tools with no slash surface', async () => {
    const projectDir = await makeProject();
    // Rovo Dev matches skills by description; it has no slash invocation.
    await installSkill(projectDir, '.rovodev', 'openspec-explore');

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details).toEqual([
      'Fix: ask Rovo Dev CLI to use the openspec-explore skill.',
    ]);
  });

  it('does not repeat the tool name on a line that already says it', async () => {
    const projectDir = await makeProject();
    await installCommand(projectDir, path.join('.claude', 'commands', 'opsx', 'explore.md'));
    await installSkill(projectDir, '.rovodev', 'openspec-explore');

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details).toEqual([
      'Fix: use it in your assistant:',
      '  /opsx:explore (Claude Code)',
      '  ask Rovo Dev CLI to use the openspec-explore skill',
    ]);
  });

  it('sends the user to update when the delivery mode leaves a tool nothing to invoke', async () => {
    const projectDir = await makeProject();
    // Kimi Code has no command surface at all, so commands-only delivery
    // generates neither commands nor skills for it.
    await installSkill(projectDir, '.kimi-code', 'openspec-explore');
    await writeGlobalConfig({ delivery: 'commands' });

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details).toEqual([
      "Fix: run 'openspec update' to regenerate this project's workflow files.",
    ]);
  });

  it("names the tool's own invocation when the workflow is installed", async () => {
    const projectDir = await makeProject();
    await installSkill(projectDir, '.claude', 'openspec-explore');

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details).toEqual(['Fix: run /opsx:explore in your assistant.']);
  });

  it('spells the invocation as a skill when delivery is skills-only', async () => {
    const projectDir = await makeProject();
    await installSkill(projectDir, '.claude', 'openspec-explore');
    await writeGlobalConfig({ delivery: 'skills' });

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details).toEqual(['Fix: run /openspec-explore in your assistant.']);
  });

  it('labels each invocation when the project tools spell it differently', async () => {
    const projectDir = await makeProject();
    // Claude Code namespaces commands under opsx/, GitHub Copilot names the
    // command with the filename - the two tools answer to different spellings.
    await installCommand(projectDir, path.join('.claude', 'commands', 'opsx', 'explore.md'));
    await installCommand(projectDir, path.join('.github', 'prompts', 'opsx-explore.prompt.md'));

    const guidance = getWorkflowVerbGuidance('explore', projectDir);

    expect(guidance.details[0]).toBe('Fix: use it in your assistant:');
    expect(guidance.details.slice(1)).toEqual([
      '  /opsx:explore (Claude Code)',
      '  /opsx-explore (GitHub Copilot)',
    ]);
  });
});
