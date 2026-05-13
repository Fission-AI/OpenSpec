import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { COMMAND_REGISTRY } from '../../src/core/completions/command-registry.js';
import {
  createManagedWorkspace,
  resolveExistingDirectory,
} from '../../src/commands/workspace/operations.js';
import {
  WORKSPACE_CHANGES_DIR_NAME,
  WORKSPACE_LOCAL_STATE_FILE_NAME,
  WORKSPACE_LOCAL_STATE_IGNORE_PATTERN,
  WORKSPACE_METADATA_DIR_NAME,
  WORKSPACE_SHARED_STATE_FILE_NAME,
  getWorkspaceCodeWorkspacePath,
  getManagedWorkspaceRoot,
  getWorkspaceLocalStatePath,
  getWorkspaceRegistryPath,
  getWorkspaceSharedStatePath,
  parseWorkspaceLocalState,
  parseWorkspaceRegistryState,
  parseWorkspaceSharedState,
} from '../../src/core/workspace/index.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

describe('workspace command', () => {
  let tempDir: string;
  let dataHome: string;
  let configHome: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-command-'));
    dataHome = path.join(tempDir, 'data');
    configHome = path.join(tempDir, 'config');
    env = {
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function expectedExistingPath(existingPath: string): string {
    return process.platform === 'win32' ? fs.realpathSync.native(existingPath) : existingPath;
  }

  function parseJson(result: RunCLIResult): any {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(
        `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
      );
    }
  }

  function createFakeExecutable(name: string): { binDir: string; logPath: string } {
    const binDir = path.join(tempDir, 'fake-bin');
    const logPath = path.join(tempDir, `${name}-launch.json`);
    const recorderPath = path.join(binDir, 'record-launch.cjs');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      recorderPath,
      "const fs = require('node:fs');\nfs.writeFileSync(process.env.OPENSPEC_FAKE_OPEN_LOG, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));\n"
    );

    const posixExecutable = path.join(binDir, name);
    fs.writeFileSync(posixExecutable, '#!/bin/sh\nnode "$OPENSPEC_FAKE_OPEN_RECORDER" "$@"\n');
    fs.chmodSync(posixExecutable, 0o755);
    fs.writeFileSync(
      path.join(binDir, `${name}.cmd`),
      '@echo off\r\nnode "%OPENSPEC_FAKE_OPEN_RECORDER%" %*\r\n'
    );

    return { binDir, logPath };
  }

  function envWithFakeExecutable(fake: { binDir: string; logPath: string }): NodeJS.ProcessEnv {
    return {
      ...env,
      PATH: `${fake.binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      OPENSPEC_FAKE_OPEN_RECORDER: path.join(fake.binDir, 'record-launch.cjs'),
      OPENSPEC_FAKE_OPEN_LOG: fake.logPath,
    };
  }

  function readLaunchLog(logPath: string): { cwd: string; args: string[] } {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  }

  async function setupWorkspace(
    name = 'platform',
    links: string[] = [],
    extraArgs: string[] = []
  ): Promise<any> {
    const result = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        name,
        ...links.flatMap((link) => ['--link', link]),
        ...extraArgs,
      ],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(0);
    return parseJson(result);
  }

  function readLocalState(workspaceRoot: string) {
    return parseWorkspaceLocalState(
      fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')
    );
  }

  function writeGlobalConfig(config: Record<string, unknown>): void {
    const configDir = path.join(configHome, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  }

  function readSharedState(workspaceRoot: string) {
    return parseWorkspaceSharedState(
      fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')
    );
  }

  it('sets up a workspace with required links, records local state, and lists it through ls', async () => {
    const api = mkdir('repos/api');
    mkdir('repos/api/openspec/specs');
    const checkout = mkdir('repos/platform/apps/checkout');
    const expectedApi = expectedExistingPath(api);
    const expectedCheckout = expectedExistingPath(checkout);

    const setup = await setupWorkspace('platform', [`api=${api}`, checkout]);
    const workspaceRoot = setup.workspace.root;
    const expectedWorkspaceRoot = expectedExistingPath(workspaceRoot);

    expect(setup.status).toEqual([]);
    expect(setup.workspace.name).toBe('platform');
    expect(setup.workspace.links).toEqual([
      expect.objectContaining({
        name: 'api',
        path: expectedApi,
        repo_specs_path: path.join(expectedApi, 'openspec', 'specs'),
        status: [],
      }),
      expect.objectContaining({
        name: 'checkout',
        path: expectedCheckout,
        repo_specs_path: null,
        status: [],
      }),
    ]);

    const sharedState = parseWorkspaceSharedState(
      fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')
    );
    const localState = parseWorkspaceLocalState(
      fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')
    );
    const registry = parseWorkspaceRegistryState(
      fs.readFileSync(
        getWorkspaceRegistryPath({ globalDataDir: path.join(dataHome, 'openspec') }),
        'utf-8'
      )
    );

    expect(sharedState).toEqual({
      version: 1,
      name: 'platform',
      links: {
        api: {},
        checkout: {},
      },
    });
    expect(localState.paths).toEqual({
      api: expectedApi,
      checkout: expectedCheckout,
    });
    expect(localState.preferred_opener).toBeUndefined();
    expect(registry.workspaces.platform).toBe(expectedWorkspaceRoot);
    expect(fs.readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf-8')).toContain(
      WORKSPACE_LOCAL_STATE_IGNORE_PATTERN
    );
    expect(fs.readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf-8')).toContain(
      'platform.code-workspace'
    );
    expect(fs.readFileSync(path.join(workspaceRoot, 'AGENTS.md'), 'utf-8')).toContain(
      'OpenSpec Workspace Guidance'
    );
    expect(JSON.parse(fs.readFileSync(getWorkspaceCodeWorkspacePath(workspaceRoot, 'platform'), 'utf-8')).folders).toEqual([
      {
        path: '.',
      },
      {
        name: 'api',
        path: expectedApi,
      },
      {
        name: 'checkout',
        path: expectedCheckout,
      },
    ]);

    const list = await runCLI(['workspace', 'ls', '--json'], { cwd: tempDir, env });
    expect(list.exitCode).toBe(0);
    const listPayload = parseJson(list);
    expect(listPayload.workspaces).toEqual([
      expect.objectContaining({
        name: 'platform',
        root: expectedWorkspaceRoot,
        links: [
          expect.objectContaining({ name: 'api', path: expectedApi, status: [] }),
          expect.objectContaining({ name: 'checkout', path: expectedCheckout, status: [] }),
        ],
        status: [],
      }),
    ]);

    const doctor = await runCLI(['workspace', 'doctor', '--workspace', 'platform', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).workspace.links).toEqual([
      expect.objectContaining({ name: 'api', path: expectedApi, status: [] }),
      expect.objectContaining({ name: 'checkout', path: expectedCheckout, status: [] }),
    ]);
  });

  it('keeps non-interactive setup compatible by skipping skills when --tools is omitted', async () => {
    const api = mkdir('repos/api');
    const setup = await setupWorkspace('skip-skills', [`api=${api}`]);

    expect(setup.workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: [],
        generated: [],
        refreshed: [],
        failed: [],
        skipped: [
          expect.objectContaining({
            reason: 'tools_omitted',
            message: expect.stringContaining('openspec workspace update --tools <ids>'),
          }),
        ],
      })
    );
    expect(readLocalState(setup.workspace.root).workspace_skills).toBeUndefined();
    expect(fs.existsSync(path.join(setup.workspace.root, '.codex'))).toBe(false);
  });

  it('installs profile-selected workspace skills in the workspace root only', async () => {
    const api = mkdir('repos/api');
    const linkedEntriesBefore = fs.readdirSync(api).sort();
    const codexHome = path.join(tempDir, 'codex-home');
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['apply', 'archive'],
    });

    const result = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'skill-root',
        '--link',
        `api=${api}`,
        '--opener',
        'codex',
        '--tools',
        'codex',
      ],
      {
        cwd: tempDir,
        env: {
          ...env,
          CODEX_HOME: codexHome,
        },
      }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    const workspaceRoot = payload.workspace.root;
    expect(payload.workspace_skills).toEqual(
      expect.objectContaining({
        profile: 'custom',
        delivery: 'commands',
        workflow_ids: ['apply', 'archive'],
        selected_agents: ['codex'],
        skills_only: true,
        delivery_notice: expect.stringContaining('skills only'),
        generated: [
          expect.objectContaining({
            tool_id: 'codex',
            workflow_ids: ['apply', 'archive'],
          }),
        ],
        refreshed: [],
        failed: [],
      })
    );

    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-apply-change', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-archive-change', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(false);
    expect(fs.existsSync(path.join(codexHome, 'prompts'))).toBe(false);
    expect(fs.readdirSync(api).sort()).toEqual(linkedEntriesBefore);
    expect(fs.existsSync(path.join(api, '.codex'))).toBe(false);

    expect(readLocalState(workspaceRoot).workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: ['codex'],
        last_applied_profile: 'custom',
        last_applied_delivery: 'commands',
        last_applied_workflow_ids: ['apply', 'archive'],
        last_applied_at: expect.any(String),
      })
    );
  });

  it('supports --tools none and records an empty workspace skill selection', async () => {
    const api = mkdir('repos/api');
    const setup = await setupWorkspace('skills-none', [`api=${api}`], ['--tools', 'none']);

    expect(setup.workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: [],
        generated: [],
        refreshed: [],
        failed: [],
        skipped: [
          expect.objectContaining({
            reason: 'no_agents_selected',
          }),
        ],
      })
    );
    expect(readLocalState(setup.workspace.root).workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: [],
        last_applied_workflow_ids: ['propose', 'explore', 'apply', 'sync', 'archive'],
      })
    );
  });

  it('updates stored workspace skills from the current workspace and clears profile drift', async () => {
    const api = mkdir('repos/api');
    const linkedEntriesBefore = fs.readdirSync(api).sort();
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['apply', 'verify'],
    });
    const setup = await setupWorkspace('profile-sync', [`api=${api}`], ['--tools', 'codex']);
    const workspaceRoot = setup.workspace.root;
    const customSkillDir = path.join(workspaceRoot, '.codex', 'skills', 'custom-note');
    fs.mkdirSync(customSkillDir, { recursive: true });
    fs.writeFileSync(path.join(customSkillDir, 'README.md'), 'user-owned\n');

    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-apply-change', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-verify-change', 'SKILL.md'))).toBe(true);

    writeGlobalConfig({
      profile: 'core',
      delivery: 'commands',
    });

    const drift = await runCLI(
      ['workspace', 'doctor', '--workspace', 'profile-sync', '--json'],
      { cwd: tempDir, env }
    );
    expect(drift.exitCode).toBe(0);
    expect(parseJson(drift).workspace.status).toContainEqual(
      expect.objectContaining({
        code: 'workspace_skills_out_of_sync',
        fix: 'openspec workspace update --workspace profile-sync',
      })
    );

    const update = await runCLI(['workspace', 'update', '--json'], {
      cwd: path.join(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME),
      env,
    });
    expect(update.exitCode).toBe(0);
    const payload = parseJson(update);

    expect(payload.workspace.name).toBe('profile-sync');
    expect(payload.workspace_skills).toEqual(
      expect.objectContaining({
        profile: 'core',
        delivery: 'commands',
        workflow_ids: ['propose', 'explore', 'apply', 'sync', 'archive'],
        selected_agents: ['codex'],
        skills_only: true,
        delivery_notice: expect.stringContaining('skills only'),
        refreshed: [
          expect.objectContaining({
            tool_id: 'codex',
            workflow_ids: ['propose', 'explore', 'apply', 'sync', 'archive'],
          }),
        ],
        removed: [
          expect.objectContaining({
            tool_id: 'codex',
            reason: 'workflow_unselected',
            workflow_ids: ['verify'],
          }),
        ],
        failed: [],
      })
    );
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-sync-specs', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-archive-change', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-verify-change'))).toBe(false);
    expect(fs.existsSync(path.join(customSkillDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'prompts'))).toBe(false);
    expect(fs.readdirSync(api).sort()).toEqual(linkedEntriesBefore);
    expect(fs.existsSync(path.join(api, '.codex'))).toBe(false);
    expect(readLocalState(workspaceRoot).workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: ['codex'],
        last_applied_profile: 'core',
        last_applied_delivery: 'commands',
        last_applied_workflow_ids: ['propose', 'explore', 'apply', 'sync', 'archive'],
      })
    );

    const clean = await runCLI(
      ['workspace', 'doctor', '--workspace', 'profile-sync', '--json'],
      { cwd: tempDir, env }
    );
    expect(clean.exitCode).toBe(0);
    expect(parseJson(clean).workspace.status).not.toContainEqual(
      expect.objectContaining({
        code: 'workspace_skills_out_of_sync',
      })
    );
  });

  it('redirects openspec update from a workspace planning home to workspace update', async () => {
    const api = mkdir('repos/api');
    const linkedEntriesBefore = fs.readdirSync(api).sort();
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['apply'],
    });
    const setup = await setupWorkspace('update-redirect', [`api=${api}`], ['--tools', 'codex']);
    const workspaceRoot = setup.workspace.root;
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-apply-change', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(false);

    writeGlobalConfig({
      profile: 'core',
      delivery: 'commands',
    });

    const update = await runCLI(['update'], {
      cwd: path.join(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME),
      env,
    });
    expect(update.exitCode).toBe(0);
    expect(update.stdout).toContain('Workspace update complete');
    expect(update.stdout).toContain('update-redirect');
    expect(update.stdout).not.toContain('not recorded in the local workspace registry');
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-sync-specs', 'SKILL.md'))).toBe(true);
    expect(fs.readdirSync(api).sort()).toEqual(linkedEntriesBefore);
    expect(fs.existsSync(path.join(api, '.codex'))).toBe(false);
  });

  it('updates the workspace passed to openspec update even when another workspace is known', async () => {
    const firstApi = mkdir('repos/first-api');
    const secondApi = mkdir('repos/second-api');
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['apply'],
    });
    const first = await setupWorkspace('target-first', [`api=${firstApi}`], ['--tools', 'codex']);
    const second = await setupWorkspace('target-second', [`api=${secondApi}`], ['--tools', 'codex']);

    writeGlobalConfig({
      profile: 'core',
      delivery: 'commands',
    });

    const update = await runCLI(
      ['update', path.join(first.workspace.root, WORKSPACE_CHANGES_DIR_NAME)],
      { cwd: tempDir, env }
    );

    expect(update.exitCode).toBe(0);
    expect(update.stdout).toContain('Workspace update complete');
    expect(update.stdout).toContain('target-first');
    expect(update.stdout).not.toContain('Multiple OpenSpec workspaces are known');
    expect(fs.existsSync(path.join(first.workspace.root, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(second.workspace.root, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(false);
  });

  it('supports named and flag-selected workspace updates with explicit agent changes', async () => {
    const api = mkdir('repos/api');
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'skills',
      workflows: ['apply'],
    });
    const setup = await setupWorkspace('agent-change', [`api=${api}`], ['--tools', 'codex']);
    const workspaceRoot = setup.workspace.root;
    const userSkillDir = path.join(workspaceRoot, '.codex', 'skills', 'user-skill');
    fs.mkdirSync(userSkillDir, { recursive: true });
    fs.writeFileSync(path.join(userSkillDir, 'SKILL.md'), 'user-owned\n');

    const addAgent = await runCLI(
      ['workspace', 'update', 'agent-change', '--tools', 'codex,claude', '--json'],
      { cwd: tempDir, env }
    );
    expect(addAgent.exitCode).toBe(0);
    const addPayload = parseJson(addAgent);
    expect(addPayload.workspace_skills.refreshed).toEqual([
      expect.objectContaining({ tool_id: 'codex', workflow_ids: ['apply'] }),
    ]);
    expect(addPayload.workspace_skills.added).toEqual([
      expect.objectContaining({ tool_id: 'claude', workflow_ids: ['apply'] }),
    ]);
    expect(fs.existsSync(path.join(workspaceRoot, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md'))).toBe(true);
    expect(readLocalState(workspaceRoot).workspace_skills?.selected_agents).toEqual(['codex', 'claude']);

    const removeAgent = await runCLI(
      ['workspace', 'update', '--workspace', 'agent-change', '--tools', 'claude', '--json'],
      { cwd: tempDir, env }
    );
    expect(removeAgent.exitCode).toBe(0);
    const removePayload = parseJson(removeAgent);
    expect(removePayload.workspace_skills.removed).toEqual([
      expect.objectContaining({
        tool_id: 'codex',
        reason: 'agent_unselected',
        workflow_ids: ['apply'],
      }),
    ]);
    expect(removePayload.workspace_skills.refreshed).toEqual([
      expect.objectContaining({ tool_id: 'claude', workflow_ids: ['apply'] }),
    ]);
    expect(fs.existsSync(path.join(workspaceRoot, '.codex', 'skills', 'openspec-apply-change'))).toBe(false);
    expect(fs.existsSync(path.join(userSkillDir, 'SKILL.md'))).toBe(true);
    expect(readLocalState(workspaceRoot).workspace_skills?.selected_agents).toEqual(['claude']);
  });

  it('does not remove unmanaged skill directories that collide with OpenSpec workflow names', async () => {
    const api = mkdir('repos/api');
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'skills',
      workflows: ['verify'],
    });
    const setup = await setupWorkspace('unmanaged-collision', [`api=${api}`], ['--tools', 'codex']);
    const workspaceRoot = setup.workspace.root;
    const collidingSkillDir = path.join(workspaceRoot, '.codex', 'skills', 'openspec-verify-change');
    fs.writeFileSync(path.join(collidingSkillDir, 'SKILL.md'), 'name: user-owned-verify\n');

    const update = await runCLI(
      ['workspace', 'update', '--workspace', 'unmanaged-collision', '--tools', 'none', '--json'],
      { cwd: tempDir, env }
    );

    expect(update.exitCode).toBe(0);
    expect(parseJson(update).workspace_skills.removed).toEqual([]);
    expect(fs.existsSync(path.join(collidingSkillDir, 'SKILL.md'))).toBe(true);
    expect(readLocalState(workspaceRoot).workspace_skills?.selected_agents).toEqual([]);
  });

  it('does not record workspace skills as applied when an update fails', async () => {
    const api = mkdir('repos/api');
    writeGlobalConfig({
      profile: 'custom',
      delivery: 'skills',
      workflows: ['apply'],
    });
    const setup = await setupWorkspace('failed-update-state', [`api=${api}`], ['--tools', 'codex']);
    const workspaceRoot = setup.workspace.root;
    const blockingSkillPath = path.join(workspaceRoot, '.codex', 'skills', 'openspec-propose');
    fs.writeFileSync(blockingSkillPath, 'blocks generated skill directory\n');

    writeGlobalConfig({
      profile: 'core',
      delivery: 'skills',
    });

    const update = await runCLI(
      ['workspace', 'update', '--workspace', 'failed-update-state', '--json'],
      { cwd: tempDir, env }
    );

    expect(update.exitCode).toBe(1);
    expect(parseJson(update).workspace_skills.failed).toEqual([
      expect.objectContaining({
        tool_id: 'codex',
      }),
    ]);
    expect(readLocalState(workspaceRoot).workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: ['codex'],
        last_applied_profile: 'custom',
        last_applied_workflow_ids: ['apply'],
      })
    );
  });

  it('reports a no-op workspace update when no stored skill selection exists', async () => {
    const api = mkdir('repos/api');
    const setup = await setupWorkspace('no-stored-skills', [`api=${api}`]);

    const update = await runCLI(
      ['workspace', 'update', '--workspace', 'no-stored-skills', '--json'],
      { cwd: tempDir, env }
    );
    expect(update.exitCode).toBe(0);
    expect(parseJson(update).workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: [],
        generated: [],
        added: [],
        refreshed: [],
        removed: [],
        failed: [],
        skipped: [
          expect.objectContaining({
            reason: 'no_stored_agent_selection',
            message: expect.stringContaining('--tools <ids>'),
          }),
        ],
      })
    );
    expect(readLocalState(setup.workspace.root).workspace_skills).toBeUndefined();
    expect(fs.existsSync(path.join(setup.workspace.root, '.codex'))).toBe(false);
  });

  it('rejects invalid workspace setup tool IDs with structured JSON status', async () => {
    const api = mkdir('repos/api');
    const invalid = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'invalid-skills',
        '--link',
        `api=${api}`,
        '--tools',
        'codex,not-real',
      ],
      { cwd: tempDir, env }
    );

    expect(invalid.exitCode).toBe(1);
    expect(parseJson(invalid).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_workspace_setup_tools',
        target: 'workspace.skills',
        message: expect.stringContaining('not-real'),
      })
    );

    const setup = await setupWorkspace('update-invalid-skills', [`api=${api}`]);
    const invalidUpdate = await runCLI(
      [
        'workspace',
        'update',
        '--workspace',
        'update-invalid-skills',
        '--json',
        '--tools',
        'codex,not-real',
      ],
      { cwd: tempDir, env }
    );
    expect(invalidUpdate.exitCode).toBe(1);
    expect(parseJson(invalidUpdate).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_workspace_update_tools',
        target: 'workspace.skills',
        message: expect.stringContaining('not-real'),
      })
    );
    expect(readLocalState(setup.workspace.root).workspace_skills).toBeUndefined();
  });

  it('preserves equals signs in inferred and explicit setup link paths', async () => {
    const inferred = mkdir('repos/foo=bar');
    const explicit = mkdir('repos/api=service');
    const expectedInferred = expectedExistingPath(inferred);
    const expectedExplicit = expectedExistingPath(explicit);

    const setup = await setupWorkspace('equals-paths', [inferred, `api=${explicit}`]);

    expect(setup.workspace.links).toEqual([
      expect.objectContaining({
        name: 'api',
        path: expectedExplicit,
        status: [],
      }),
      expect.objectContaining({
        name: 'foo=bar',
        path: expectedInferred,
        status: [],
      }),
    ]);

    const localState = parseWorkspaceLocalState(
      fs.readFileSync(getWorkspaceLocalStatePath(setup.workspace.root), 'utf-8')
    );
    expect(localState.paths).toEqual({
      api: expectedExplicit,
      'foo=bar': expectedInferred,
    });
  });

  it('stores non-interactive preferred openers only when --opener is provided', async () => {
    const api = mkdir('repos/api');
    const codex = await setupWorkspace('codex-workspace', [`api=${api}`], ['--opener', 'codex']);
    const editor = await setupWorkspace('editor-workspace', [`api=${api}`], ['--opener', 'editor']);
    const unset = await setupWorkspace('unset-workspace', [`api=${api}`]);

    expect(readLocalState(codex.workspace.root).preferred_opener).toEqual({
      kind: 'agent',
      id: 'codex',
    });
    expect(readLocalState(editor.workspace.root).preferred_opener).toEqual({
      kind: 'editor',
      id: 'vscode',
    });
    expect(readLocalState(unset.workspace.root).preferred_opener).toBeUndefined();

    const invalid = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'invalid-opener',
        '--link',
        `api=${api}`,
        '--opener',
        'cursor',
      ],
      { cwd: tempDir, env }
    );
    expect(invalid.exitCode).toBe(1);
    expect(parseJson(invalid).status[0]).toEqual(
      expect.objectContaining({
        code: 'unsupported_workspace_opener',
        target: 'workspace.opener',
      })
    );
  });

  it('resolves relative setup, link, and relink paths before storing local state', async () => {
    const project = mkdir('project');
    fs.mkdirSync(path.join(project, 'repos', 'api'), { recursive: true });
    fs.mkdirSync(path.join(project, 'services', 'billing'), { recursive: true });
    fs.mkdirSync(path.join(project, 'archive', 'billing'), { recursive: true });
    const resolvedProject = fs.realpathSync.native(project);

    const setup = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'platform',
        '--link',
        'repos/api',
      ],
      { cwd: project, env }
    );
    expect(setup.exitCode).toBe(0);

    const setupPayload = parseJson(setup);
    expect(readLocalState(setupPayload.workspace.root).paths.api).toBe(
      path.join(resolvedProject, 'repos', 'api')
    );

    const link = await runCLI(['workspace', 'link', 'services/billing', '--json'], {
      cwd: project,
      env,
    });
    expect(link.exitCode).toBe(0);
    expect(parseJson(link).link).toEqual(
      expect.objectContaining({
        name: 'billing',
        path: path.join(resolvedProject, 'services', 'billing'),
      })
    );

    const relink = await runCLI(
      ['workspace', 'relink', 'billing', 'archive/billing', '--json'],
      { cwd: project, env }
    );
    expect(relink.exitCode).toBe(0);
    expect(parseJson(relink).link).toEqual(
      expect.objectContaining({
        name: 'billing',
        path: path.join(resolvedProject, 'archive', 'billing'),
      })
    );

    expect(readLocalState(setupPayload.workspace.root).paths).toEqual({
      api: path.join(resolvedProject, 'repos', 'api'),
      billing: path.join(resolvedProject, 'archive', 'billing'),
    });
  });

  it('canonicalizes existing link directories on Windows before storing local paths', async () => {
    const api = mkdir('repos/api');
    const canonicalApi = path.join(tempDir, 'canonical', 'api');
    const originalPlatform = process.platform;
    const canonicalize = vi
      .spyOn(FileSystemUtils, 'canonicalizeExistingPath')
      .mockImplementation((targetPath) => (targetPath === api ? canonicalApi : targetPath));

    Object.defineProperty(process, 'platform', { value: 'win32' });

    try {
      await expect(resolveExistingDirectory(api)).resolves.toBe(canonicalApi);
      expect(canonicalize).toHaveBeenCalledWith(api);
    } finally {
      canonicalize.mockRestore();
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('rejects duplicate setup link names without creating or rewriting a workspace', async () => {
    const firstApi = mkdir('repos/current/api');
    const secondApi = mkdir('repos/archive/api');
    const expectedFirstApi = expectedExistingPath(firstApi);

    const duplicate = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'platform',
        '--link',
        firstApi,
        '--link',
        secondApi,
      ],
      { cwd: tempDir, env }
    );

    expect(duplicate.exitCode).toBe(1);
    expect(parseJson(duplicate).status[0]).toEqual(
      expect.objectContaining({
        code: 'duplicate_link_name',
        message: expect.stringContaining(expectedFirstApi),
        fix: expect.stringContaining('--link api-alt='),
      })
    );
    expect(fs.existsSync(getWorkspaceRegistryPath({ globalDataDir: path.join(dataHome, 'openspec') }))).toBe(false);
  });

  it('removes a partially created workspace when setup fails after creating the root', async () => {
    const api = mkdir('repos/api');
    const originalDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = dataHome;
    const writeFileSpy = vi
      .spyOn(FileSystemUtils, 'writeFile')
      .mockRejectedValueOnce(new Error('disk full'));

    try {
      await expect(createManagedWorkspace('platform', { api })).rejects.toMatchObject({
        status: {
          code: 'workspace_create_failed',
        },
      });
    } finally {
      writeFileSpy.mockRestore();
      if (originalDataHome === undefined) {
        delete process.env.XDG_DATA_HOME;
      } else {
        process.env.XDG_DATA_HOME = originalDataHome;
      }
    }

    const globalDataDir = path.join(dataHome, 'openspec');
    expect(fs.existsSync(getManagedWorkspaceRoot('platform', { globalDataDir }))).toBe(false);
    expect(fs.existsSync(getWorkspaceRegistryPath({ globalDataDir }))).toBe(false);
  });

  it('rejects existing workspace names without overwriting workspace state', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');
    const setup = await setupWorkspace('platform', [`api=${api}`]);
    const workspaceRoot = setup.workspace.root;
    const sharedBefore = fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8');
    const localBefore = fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8');
    const markerPath = path.join(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME, 'sentinel.txt');
    fs.writeFileSync(markerPath, 'keep me');

    const duplicate = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'platform',
        '--link',
        `web=${web}`,
      ],
      { cwd: tempDir, env }
    );

    expect(duplicate.exitCode).toBe(1);
    expect(parseJson(duplicate).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_already_exists',
        target: 'workspace.name',
      })
    );
    expect(fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')).toBe(sharedBefore);
    expect(fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')).toBe(localBefore);
    expect(fs.readFileSync(markerPath, 'utf-8')).toBe('keep me');
  });

  it('fails setup cleanly for missing automation inputs and JSON without no-interactive', async () => {
    const api = mkdir('repos/api');

    const noWorkspaces = await runCLI(['workspace', 'list'], { cwd: tempDir, env });
    expect(noWorkspaces.exitCode).toBe(0);
    expect(noWorkspaces.stdout).toContain("No OpenSpec workspaces found. Run 'openspec workspace setup' first.");

    const missing = await runCLI(['workspace', 'setup', '--no-interactive', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(missing.exitCode).toBe(1);
    expect(parseJson(missing).status[0]).toEqual(
      expect.objectContaining({
        code: 'missing_setup_inputs',
        severity: 'error',
      })
    );

    const jsonInteractive = await runCLI(
      ['workspace', 'setup', '--json', '--name', 'platform', '--link', api],
      { cwd: tempDir, env }
    );
    expect(jsonInteractive.exitCode).toBe(1);
    expect(parseJson(jsonInteractive).status[0]).toEqual(
      expect.objectContaining({
        code: 'setup_json_requires_no_interactive',
      })
    );

    const invalidName = await runCLI(
      ['workspace', 'setup', '--no-interactive', '--json', '--name', 'Bad_Name', '--link', api],
      { cwd: tempDir, env }
    );
    expect(invalidName.exitCode).toBe(1);
    expect(parseJson(invalidName).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_workspace_name',
        message: expect.stringContaining('kebab-case'),
      })
    );

    const noKnown = await runCLI(['workspace', 'doctor', '--json'], { cwd: tempDir, env });
    expect(noKnown.exitCode).toBe(1);
    expect(parseJson(noKnown).status[0]).toEqual(
      expect.objectContaining({
        code: 'no_known_workspaces',
      })
    );
  });

  it('rejects missing setup, link, and relink paths with structured status', async () => {
    const api = mkdir('repos/api');
    const billing = mkdir('repos/billing');

    const missingSetupPath = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'missing-setup-path',
        '--link',
        'missing-api',
      ],
      { cwd: tempDir, env }
    );
    expect(missingSetupPath.exitCode).toBe(1);
    expect(parseJson(missingSetupPath).status[0]).toEqual(
      expect.objectContaining({
        code: 'linked_path_missing',
        target: 'link.path',
      })
    );

    await setupWorkspace('platform', [`api=${api}`]);

    const missingLinkPath = await runCLI(
      ['workspace', 'link', 'missing-service', '--json'],
      { cwd: tempDir, env }
    );
    expect(missingLinkPath.exitCode).toBe(1);
    expect(parseJson(missingLinkPath).status[0]).toEqual(
      expect.objectContaining({
        code: 'linked_path_missing',
        target: 'link.path',
      })
    );

    const link = await runCLI(['workspace', 'link', 'billing', billing, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(link.exitCode).toBe(0);

    const missingRelinkPath = await runCLI(
      ['workspace', 'relink', 'billing', 'missing-billing', '--json'],
      { cwd: tempDir, env }
    );
    expect(missingRelinkPath.exitCode).toBe(1);
    expect(parseJson(missingRelinkPath).status[0]).toEqual(
      expect.objectContaining({
        code: 'linked_path_missing',
        target: 'link.path',
      })
    );
  });

  it('links, rejects duplicate link names, relinks, and reports unknown relinks', async () => {
    const api = mkdir('repos/api');
    const billing = mkdir('repos/platform/services/billing');
    const billingNew = mkdir('repos/archive/billing');
    const duplicate = mkdir('repos/duplicate-billing');
    const expectedBilling = expectedExistingPath(billing);
    const expectedBillingNew = expectedExistingPath(billingNew);

    await setupWorkspace('platform', [`api=${api}`]);

    const link = await runCLI(['workspace', 'link', billing, '--json'], { cwd: tempDir, env });
    expect(link.exitCode).toBe(0);
    expect(parseJson(link).link).toEqual(
      expect.objectContaining({
        name: 'billing',
        path: expectedBilling,
        status: [],
      })
    );

    const duplicateResult = await runCLI(
      ['workspace', 'link', 'billing', duplicate, '--json'],
      { cwd: tempDir, env }
    );
    expect(duplicateResult.exitCode).toBe(1);
    expect(parseJson(duplicateResult).status[0]).toEqual(
      expect.objectContaining({
        code: 'duplicate_link_name',
        message: expect.stringContaining('already uses that name'),
      })
    );

    const relink = await runCLI(['workspace', 'relink', 'billing', billingNew, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(relink.exitCode).toBe(0);
    expect(parseJson(relink).link).toEqual(
      expect.objectContaining({
        name: 'billing',
        path: expectedBillingNew,
      })
    );

    const unknown = await runCLI(['workspace', 'relink', 'web', billingNew, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(unknown.exitCode).toBe(1);
    expect(parseJson(unknown).status[0]).toEqual(
      expect.objectContaining({
        code: 'unknown_link_name',
      })
    );
  });

  it('links monorepo folders without editing the linked folder', async () => {
    const api = mkdir('repos/api');
    const packageDir = mkdir('monorepo/apps/checkout');
    const expectedPackageDir = expectedExistingPath(packageDir);
    const sentinelPath = path.join(packageDir, 'package.json');
    fs.writeFileSync(sentinelPath, '{"name":"checkout"}\n');
    const entriesBefore = fs.readdirSync(packageDir).sort();

    await setupWorkspace('platform', [`api=${api}`]);

    const link = await runCLI(['workspace', 'link', packageDir, '--json'], {
      cwd: tempDir,
      env,
    });

    expect(link.exitCode).toBe(0);
    expect(parseJson(link).link).toEqual(
      expect.objectContaining({
        name: 'checkout',
        path: expectedPackageDir,
      })
    );
    expect(fs.readFileSync(sentinelPath, 'utf-8')).toBe('{"name":"checkout"}\n');
    expect(fs.readdirSync(packageDir).sort()).toEqual(entriesBefore);
    expect(fs.existsSync(path.join(packageDir, 'openspec'))).toBe(false);
    expect(fs.existsSync(path.join(packageDir, WORKSPACE_METADATA_DIR_NAME))).toBe(false);
  });

  it('fails link and relink without rewriting malformed local state', async () => {
    const api = mkdir('repos/api');
    const billing = mkdir('repos/billing');
    const setup = await setupWorkspace('broken-local', [`api=${api}`]);
    const sharedPath = getWorkspaceSharedStatePath(setup.workspace.root);
    const localPath = getWorkspaceLocalStatePath(setup.workspace.root);
    const sharedBefore = fs.readFileSync(sharedPath, 'utf-8');
    const malformedLocalState = 'version: 1\npaths: []\n';
    fs.writeFileSync(localPath, malformedLocalState);

    const link = await runCLI(
      ['workspace', 'link', 'billing', billing, '--workspace', 'broken-local', '--json'],
      { cwd: tempDir, env }
    );
    expect(link.exitCode).toBe(1);
    expect(parseJson(link).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_local_state_invalid',
        target: 'workspace.local_state',
      })
    );
    expect(fs.readFileSync(sharedPath, 'utf-8')).toBe(sharedBefore);
    expect(fs.readFileSync(localPath, 'utf-8')).toBe(malformedLocalState);

    const relink = await runCLI(
      ['workspace', 'relink', 'api', billing, '--workspace', 'broken-local', '--json'],
      { cwd: tempDir, env }
    );
    expect(relink.exitCode).toBe(1);
    expect(parseJson(relink).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_local_state_invalid',
        target: 'workspace.local_state',
      })
    );
    expect(fs.readFileSync(sharedPath, 'utf-8')).toBe(sharedBefore);
    expect(fs.readFileSync(localPath, 'utf-8')).toBe(malformedLocalState);
  });

  it('reports stale registry entries without rewriting the registry', async () => {
    const api = mkdir('repos/api');
    const setup = await setupWorkspace('platform', [`api=${api}`]);
    const registryPath = getWorkspaceRegistryPath({ globalDataDir: path.join(dataHome, 'openspec') });
    const registryBefore = fs.readFileSync(registryPath, 'utf-8');

    fs.rmSync(setup.workspace.root, { recursive: true, force: true });

    const list = await runCLI(['workspace', 'list', '--json'], { cwd: tempDir, env });
    expect(list.exitCode).toBe(0);
    expect(parseJson(list).workspaces[0].status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_root_missing',
      })
    );

    const doctor = await runCLI(['workspace', 'doctor', '--workspace', 'platform', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).workspace.status[0]).toEqual(
      expect.objectContaining({
        code: 'selected_workspace_root_missing',
      })
    );
    expect(fs.readFileSync(registryPath, 'utf-8')).toBe(registryBefore);
  });

  it('reports malformed local state in list and doctor without rewriting files', async () => {
    const api = mkdir('repos/api');
    const setup = await setupWorkspace('doctor-local-invalid', [`api=${api}`]);
    const localPath = getWorkspaceLocalStatePath(setup.workspace.root);
    const registryPath = getWorkspaceRegistryPath({ globalDataDir: path.join(dataHome, 'openspec') });
    const malformedLocalState = 'version: 1\npaths: []\n';
    const registryBefore = fs.readFileSync(registryPath, 'utf-8');
    fs.writeFileSync(localPath, malformedLocalState);

    const list = await runCLI(['workspace', 'list', '--json'], { cwd: tempDir, env });
    expect(list.exitCode).toBe(0);
    expect(parseJson(list).workspaces[0].status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_local_state_invalid',
      })
    );

    const humanList = await runCLI(['workspace', 'list'], { cwd: tempDir, env });
    expect(humanList.exitCode).toBe(0);
    expect(humanList.stdout).toContain('Linked repos or folders (1):');
    expect(humanList.stdout).toContain('api -> (no local path recorded)');

    const doctor = await runCLI(
      ['workspace', 'doctor', '--workspace', 'doctor-local-invalid', '--json'],
      { cwd: tempDir, env }
    );
    expect(doctor.exitCode).toBe(0);
    const doctorPayload = parseJson(doctor);
    expect(doctorPayload.workspace.status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_local_state_invalid',
        target: 'workspace.local_state',
      })
    );
    expect(doctorPayload.workspace.links[0]).toEqual(
      expect.objectContaining({
        name: 'api',
        path: null,
        status: [],
      })
    );
    expect(fs.readFileSync(localPath, 'utf-8')).toBe(malformedLocalState);
    expect(fs.readFileSync(registryPath, 'utf-8')).toBe(registryBefore);
  });

  it('reports shared/local drift and missing paths without repairing workspace state', async () => {
    const api = mkdir('repos/api');
    const localOnly = mkdir('repos/local-only');
    const setup = await setupWorkspace('platform', [`api=${api}`]);
    const workspaceRoot = setup.workspace.root;
    const registryPath = getWorkspaceRegistryPath({ globalDataDir: path.join(dataHome, 'openspec') });
    const missingApiPath = path.join(tempDir, 'repos', 'missing-api');
    const sharedDrift = `version: 1
name: platform
links:
  api: {}
  web: {}
`;
    const localDrift = `version: 1
paths:
  api: ${missingApiPath}
  local-only: ${localOnly}
`;
    fs.writeFileSync(getWorkspaceSharedStatePath(workspaceRoot), sharedDrift);
    fs.writeFileSync(getWorkspaceLocalStatePath(workspaceRoot), localDrift);
    fs.rmSync(path.join(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME), { recursive: true, force: true });
    const registryBefore = fs.readFileSync(registryPath, 'utf-8');

    const doctor = await runCLI(['workspace', 'doctor', '--workspace', 'platform', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(doctor.exitCode).toBe(0);
    const payload = parseJson(doctor);
    expect(payload.workspace.status).toEqual([
      expect.objectContaining({
        code: 'workspace_planning_path_missing',
        target: 'workspace.planning_path',
      }),
    ]);
    expect(payload.workspace.links).toEqual([
      expect.objectContaining({
        name: 'api',
        path: missingApiPath,
        status: [
          expect.objectContaining({
            code: 'linked_path_missing',
            fix: expect.stringContaining('workspace relink api'),
          }),
        ],
      }),
      expect.objectContaining({
        name: 'local-only',
        path: localOnly,
        status: [
          expect.objectContaining({
            code: 'local_path_without_shared_link',
            severity: 'warning',
          }),
        ],
      }),
      expect.objectContaining({
        name: 'web',
        path: null,
        status: [
          expect.objectContaining({
            code: 'linked_path_missing_from_local_state',
            fix: expect.stringContaining('workspace relink web'),
          }),
        ],
      }),
    ]);
    expect(fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')).toBe(sharedDrift);
    expect(fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')).toBe(localDrift);
    expect(fs.readFileSync(registryPath, 'utf-8')).toBe(registryBefore);
  });

  it('uses current unregistered workspaces for doctor and records them after link', async () => {
    const manualRoot = path.join(tempDir, 'manual-workspace');
    const nested = path.join(manualRoot, WORKSPACE_CHANGES_DIR_NAME, 'add-billing');
    const api = mkdir('repos/api');

    fs.mkdirSync(path.join(manualRoot, WORKSPACE_METADATA_DIR_NAME), { recursive: true });
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(manualRoot, WORKSPACE_METADATA_DIR_NAME, WORKSPACE_SHARED_STATE_FILE_NAME),
      'version: 1\nname: manual-workspace\nlinks: {}\n'
    );
    fs.writeFileSync(
      path.join(manualRoot, WORKSPACE_METADATA_DIR_NAME, WORKSPACE_LOCAL_STATE_FILE_NAME),
      'version: 1\npaths: {}\n'
    );

    const registryPath = getWorkspaceRegistryPath({ globalDataDir: path.join(dataHome, 'openspec') });
    const doctor = await runCLI(['workspace', 'doctor', '--json'], { cwd: nested, env });
    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_not_in_local_registry',
        severity: 'warning',
      })
    );
    expect(fs.existsSync(registryPath)).toBe(false);

    const link = await runCLI(['workspace', 'link', 'api', api, '--json'], {
      cwd: nested,
      env,
    });
    expect(link.exitCode).toBe(0);
    expect(parseJson(link).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_not_in_local_registry',
      })
    );

    const registry = parseWorkspaceRegistryState(fs.readFileSync(registryPath, 'utf-8'));
    expect(registry.workspaces['manual-workspace']).toBe(fs.realpathSync.native(manualRoot));
  });

  it('fails JSON workspace selection when multiple known workspaces are available', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');

    await setupWorkspace('platform', [`api=${api}`]);
    await setupWorkspace('checkout-web', [`web=${web}`]);

    const doctor = await runCLI(['workspace', 'doctor', '--json'], { cwd: tempDir, env });
    expect(doctor.exitCode).toBe(1);
    expect(parseJson(doctor).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_selection_ambiguous',
        fix: expect.stringContaining('--workspace <name>'),
      })
    );
  });

  it('uses --workspace for explicit selection and reports unknown workspace names', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');

    await setupWorkspace('platform', [`api=${api}`]);
    const checkout = await setupWorkspace('checkout-web', [`web=${web}`]);

    const doctor = await runCLI(
      ['workspace', 'doctor', '--workspace', 'checkout-web', '--json'],
      { cwd: tempDir, env }
    );
    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).workspace).toEqual(
      expect.objectContaining({
        name: 'checkout-web',
        root: expectedExistingPath(checkout.workspace.root),
      })
    );

    const unknown = await runCLI(
      ['workspace', 'doctor', '--workspace', 'unknown-workspace', '--json'],
      { cwd: tempDir, env }
    );
    expect(unknown.exitCode).toBe(1);
    expect(parseJson(unknown).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_not_found',
        target: 'workspace.name',
      })
    );
  });

  it('fails non-interactive ambiguous workspace selection in human output mode', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');

    await setupWorkspace('platform', [`api=${api}`]);
    await setupWorkspace('checkout-web', [`web=${web}`]);

    const doctor = await runCLI(['workspace', 'doctor', '--no-interactive'], {
      cwd: tempDir,
      env,
    });

    expect(doctor.exitCode).toBe(1);
    expect(doctor.stderr).toContain('Multiple OpenSpec workspaces are known.');
    expect(doctor.stderr).toContain('Pass --workspace <name>.');
    expect(doctor.stderr).toContain('openspec workspace doctor --workspace <name>');
  });

  it('opens a workspace through VS Code editor and agent overrides without changing stored preference', async () => {
    const api = mkdir('repos/api');
    const expectedApi = expectedExistingPath(api);
    const web = mkdir('repos/web');
    const setup = await setupWorkspace('platform', [`api=${api}`, `web=${web}`], ['--opener', 'editor']);
    fs.rmSync(web, { recursive: true, force: true });
    const code = createFakeExecutable('code');

    const editorOpen = await runCLI(['workspace', 'open', 'platform', '--no-interactive'], {
      cwd: tempDir,
      env: envWithFakeExecutable(code),
    });

    expect(editorOpen.exitCode).toBe(0);
    expect(editorOpen.stdout).toContain('Opening workspace: platform');
    expect(editorOpen.stdout).toContain('Opener: VS Code editor');
    expect(editorOpen.stdout).toContain('web ->');
    const workspaceFolders = JSON.parse(
      fs.readFileSync(getWorkspaceCodeWorkspacePath(setup.workspace.root, 'platform'), 'utf-8')
    ).folders;
    expect(workspaceFolders).toEqual([
      {
        path: '.',
      },
      {
        name: 'api',
        path: expectedApi,
      },
    ]);
    const editorLaunch = readLaunchLog(code.logPath);
    expect(fs.realpathSync.native(editorLaunch.cwd)).toBe(
      fs.realpathSync.native(setup.workspace.root)
    );
    expect(editorLaunch.args).toEqual([
      getWorkspaceCodeWorkspacePath(expectedExistingPath(setup.workspace.root), 'platform'),
    ]);

    const currentWorkspaceOpen = await runCLI(['workspace', 'open', '--editor', '--no-interactive'], {
      cwd: path.join(setup.workspace.root, WORKSPACE_CHANGES_DIR_NAME),
      env: envWithFakeExecutable(code),
    });
    expect(currentWorkspaceOpen.exitCode).toBe(0);

    const codex = createFakeExecutable('codex');
    const codexOpen = await runCLI(
      ['workspace', 'open', '--workspace', 'platform', '--agent', 'codex', '--no-interactive'],
      {
        cwd: tempDir,
        env: envWithFakeExecutable(codex),
      }
    );

    expect(codexOpen.exitCode).toBe(0);
    const codexLaunch = readLaunchLog(codex.logPath);
    expect(fs.realpathSync.native(codexLaunch.cwd)).toBe(
      fs.realpathSync.native(setup.workspace.root)
    );
    expect(codexLaunch.args).toEqual([
      '--add-dir',
      expectedApi,
      'Open this OpenSpec workspace.',
    ]);
    expect(readLocalState(setup.workspace.root).preferred_opener).toEqual({
      kind: 'editor',
      id: 'vscode',
    });
  });

  it('reports workspace open selection, unsupported flag, unset opener, and unavailable opener errors', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');

    const noKnown = await runCLI(['workspace', 'open', '--no-interactive'], {
      cwd: tempDir,
      env,
    });
    expect(noKnown.exitCode).toBe(1);
    expect(noKnown.stderr).toContain("No known OpenSpec workspaces. Run 'openspec workspace setup' first.");

    const platform = await setupWorkspace('platform', [`api=${api}`]);
    await setupWorkspace('checkout-web', [`web=${web}`]);

    const conflict = await runCLI(
      ['workspace', 'open', 'platform', '--workspace', 'checkout-web', '--editor', '--no-interactive'],
      { cwd: tempDir, env }
    );
    expect(conflict.exitCode).toBe(1);
    expect(conflict.stderr).toContain("positional 'platform'");
    expect(conflict.stderr).toContain("--workspace 'checkout-web'");

    const ambiguous = await runCLI(['workspace', 'open', '--no-interactive'], {
      cwd: tempDir,
      env,
    });
    expect(ambiguous.exitCode).toBe(1);
    expect(ambiguous.stderr).toContain('Known workspaces: checkout-web, platform');

    const unsupported = await runCLI(['workspace', 'open', '--prepare-only'], {
      cwd: tempDir,
      env,
    });
    expect(unsupported.exitCode).toBe(1);
    expect(unsupported.stderr).toContain('future context/query surface');

    const jsonUnsupported = await runCLI(['workspace', 'open', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(jsonUnsupported.exitCode).toBe(1);
    expect(parseJson(jsonUnsupported).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_open_json_unsupported',
      })
    );

    const changeUnsupported = await runCLI(['workspace', 'open', '--change', 'add-api'], {
      cwd: tempDir,
      env,
    });
    expect(changeUnsupported.exitCode).toBe(1);
    expect(changeUnsupported.stderr).toContain('root workspace open only');

    const unset = await runCLI(['workspace', 'open', 'platform', '--no-interactive'], {
      cwd: tempDir,
      env,
    });
    expect(unset.exitCode).toBe(1);
    expect(unset.stderr).toContain('does not have a preferred opener');

    const openerConflict = await runCLI(
      ['workspace', 'open', 'platform', '--agent', 'codex', '--editor', '--no-interactive'],
      {
        cwd: tempDir,
        env,
      }
    );
    expect(openerConflict.exitCode).toBe(1);
    expect(openerConflict.stderr).toContain('either --agent <tool> or --editor');

    fs.writeFileSync(
      getWorkspaceLocalStatePath(platform.workspace.root),
      `version: 1
paths:
  api: ${api}
preferred_opener:
  kind: editor
  id: vscode
`
    );
    const unavailable = await runCLI(['workspace', 'open', 'platform', '--no-interactive'], {
      cwd: tempDir,
      env: {
        ...env,
        PATH: '',
      },
    });
    expect(unavailable.exitCode).toBe(1);
    expect(unavailable.stderr).toContain("'code' was not found on PATH");
    expect(unavailable.stderr).toContain(
      getWorkspaceCodeWorkspacePath(expectedExistingPath(platform.workspace.root), 'platform')
    );
  });

  it('prints readable human output for setup, list, and doctor', async () => {
    const api = mkdir('repos/api');
    const expectedApi = expectedExistingPath(api);

    const setup = await runCLI(
      ['workspace', 'setup', '--no-interactive', '--name', 'platform', '--link', `api=${api}`],
      { cwd: tempDir, env }
    );
    expect(setup.exitCode).toBe(0);
    expect(setup.stdout).toContain('Workspace setup complete');
    expect(setup.stdout).toContain('OpenSpec workspaces (1)');
    expect(setup.stdout).toContain('Location:');
    expect(setup.stdout).not.toContain('Root:');
    expect(setup.stdout).toContain('Linked repos or folders (1):');
    expect(setup.stdout).toContain(`api -> ${expectedApi}`);
    expect(setup.stdout).toContain('Planning path:');
    expect(setup.stdout).toContain('Workspace check:');
    expect(setup.stdout).toContain('No workspace issues found.');
    expect(setup.stdout).toContain('Next useful commands:');

    const list = await runCLI(['workspace', 'list'], { cwd: tempDir, env });
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('OpenSpec workspaces (1)');
    expect(list.stdout).toContain('platform');
    expect(list.stdout).toContain('Location:');
    expect(list.stdout).not.toContain('Root:');
    expect(list.stdout).toContain('Linked repos or folders (1):');
    expect(list.stdout).toContain(`api -> ${expectedApi}`);

    const doctor = await runCLI(['workspace', 'doctor', '--workspace', 'platform'], {
      cwd: tempDir,
      env,
    });
    expect(doctor.exitCode).toBe(0);
    expect(doctor.stdout).toContain('Workspace: platform');
    expect(doctor.stdout).toContain('Location:');
    expect(doctor.stdout).not.toContain('Root:');
    expect(doctor.stdout).toContain('Planning path:');
    expect(doctor.stdout).toContain('Linked repos or folders:');
    expect(doctor.stdout).toContain('No workspace issues found.');
  });

  it('does not expose workspace create as a public command', async () => {
    const help = await runCLI(['workspace', '--help'], { cwd: tempDir, env });
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain('setup');
    expect(help.stdout).toContain('update');
    expect(help.stdout).toContain('link');
    expect(help.stdout).toContain('relink');
    expect(help.stdout).not.toMatch(/\bcreate\b/u);

    const updateHelp = await runCLI(['workspace', 'update', '--help'], { cwd: tempDir, env });
    expect(updateHelp.exitCode).toBe(0);
    expect(updateHelp.stdout).toContain('active global profile');
    expect(updateHelp.stdout).toContain('--workspace');
    expect(updateHelp.stdout).toContain('--tools');
    expect(updateHelp.stdout).toMatch(/Global profile\s+selects workflows/u);
  });

  it('registers workspace subcommands for shell completions', () => {
    const workspace = COMMAND_REGISTRY.find((command) => command.name === 'workspace');
    const setup = workspace?.subcommands?.find((command) => command.name === 'setup');
    const link = workspace?.subcommands?.find((command) => command.name === 'link');
    const relink = workspace?.subcommands?.find((command) => command.name === 'relink');
    const update = workspace?.subcommands?.find((command) => command.name === 'update');
    const open = workspace?.subcommands?.find((command) => command.name === 'open');

    expect(workspace?.subcommands?.map((command) => command.name)).toEqual([
      'setup',
      'list',
      'ls',
      'link',
      'relink',
      'doctor',
      'update',
      'open',
    ]);
    expect(setup?.flags?.some((flag) => flag.name === 'opener')).toBe(true);
    expect(setup?.flags?.find((flag) => flag.name === 'tools')?.description).toContain(
      'Install OpenSpec skills'
    );
    expect(setup?.flags?.find((flag) => flag.name === 'opener')?.values).toEqual([
      'codex',
      'claude',
      'github-copilot',
      'editor',
    ]);
    expect(link?.positionals).toEqual([
      { name: 'name-or-path', type: 'path', optional: true },
      { name: 'path', type: 'path' },
    ]);
    expect(relink?.positionals).toEqual([
      { name: 'name' },
      { name: 'path', type: 'path' },
    ]);
    expect(update?.positionals).toEqual([
      { name: 'name', optional: true },
    ]);
    expect(update?.flags?.map((flag) => flag.name)).toEqual([
      'workspace',
      'tools',
      'json',
      'no-interactive',
    ]);
    expect(update?.description).toContain('active global profile');
    expect(update?.flags?.find((flag) => flag.name === 'tools')?.description).toContain(
      'global profile selects workflows'
    );
    expect(update?.flags?.find((flag) => flag.name === 'tools')?.description).toContain(
      'skills-only'
    );
    expect(open?.positionals).toEqual([
      { name: 'name', optional: true },
    ]);
    expect(open?.flags?.find((flag) => flag.name === 'agent')?.values).toEqual([
      'codex',
      'claude',
      'github-copilot',
    ]);
    expect(open?.flags?.map((flag) => flag.name)).toEqual([
      'workspace',
      'agent',
      'editor',
      'no-interactive',
    ]);
  });
});
