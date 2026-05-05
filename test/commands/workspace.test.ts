import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { COMMAND_REGISTRY } from '../../src/core/completions/command-registry.js';
import { createManagedWorkspace } from '../../src/commands/workspace/operations.js';
import {
  WORKSPACE_CHANGES_DIR_NAME,
  WORKSPACE_LOCAL_STATE_FILE_NAME,
  WORKSPACE_LOCAL_STATE_IGNORE_PATTERN,
  WORKSPACE_METADATA_DIR_NAME,
  WORKSPACE_SHARED_STATE_FILE_NAME,
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
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-command-'));
    dataHome = path.join(tempDir, 'data');
    env = {
      XDG_DATA_HOME: dataHome,
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

  function parseJson(result: RunCLIResult): any {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(
        `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
      );
    }
  }

  async function setupWorkspace(name = 'platform', links: string[] = []): Promise<any> {
    const result = await runCLI(
      ['workspace', 'setup', '--no-interactive', '--json', '--name', name, ...links.flatMap((link) => ['--link', link])],
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

  function readSharedState(workspaceRoot: string) {
    return parseWorkspaceSharedState(
      fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')
    );
  }

  it('sets up a workspace with required links, records local state, and lists it through ls', async () => {
    const api = mkdir('repos/api');
    mkdir('repos/api/openspec/specs');
    const checkout = mkdir('repos/platform/apps/checkout');

    const setup = await setupWorkspace('platform', [`api=${api}`, checkout]);

    expect(setup.status).toEqual([]);
    expect(setup.workspace.name).toBe('platform');
    expect(setup.workspace.links).toEqual([
      expect.objectContaining({
        name: 'api',
        path: api,
        repo_specs_path: path.join(api, 'openspec', 'specs'),
        status: [],
      }),
      expect.objectContaining({
        name: 'checkout',
        path: checkout,
        repo_specs_path: null,
        status: [],
      }),
    ]);

    const workspaceRoot = setup.workspace.root;
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
      api,
      checkout,
    });
    expect(registry.workspaces.platform).toBe(workspaceRoot);
    expect(fs.readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf-8')).toContain(
      WORKSPACE_LOCAL_STATE_IGNORE_PATTERN
    );

    const list = await runCLI(['workspace', 'ls', '--json'], { cwd: tempDir, env });
    expect(list.exitCode).toBe(0);
    const listPayload = parseJson(list);
    expect(listPayload.workspaces).toEqual([
      expect.objectContaining({
        name: 'platform',
        root: workspaceRoot,
        links: [
          expect.objectContaining({ name: 'api', path: api, status: [] }),
          expect.objectContaining({ name: 'checkout', path: checkout, status: [] }),
        ],
        status: [],
      }),
    ]);
  });

  it('preserves equals signs in inferred and explicit setup link paths', async () => {
    const inferred = mkdir('repos/foo=bar');
    const explicit = mkdir('repos/api=service');

    const setup = await setupWorkspace('equals-paths', [inferred, `api=${explicit}`]);

    expect(setup.workspace.links).toEqual([
      expect.objectContaining({
        name: 'api',
        path: explicit,
        status: [],
      }),
      expect.objectContaining({
        name: 'foo=bar',
        path: inferred,
        status: [],
      }),
    ]);

    const localState = parseWorkspaceLocalState(
      fs.readFileSync(getWorkspaceLocalStatePath(setup.workspace.root), 'utf-8')
    );
    expect(localState.paths).toEqual({
      api: explicit,
      'foo=bar': inferred,
    });
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

  it('rejects duplicate setup link names without creating or rewriting a workspace', async () => {
    const firstApi = mkdir('repos/current/api');
    const secondApi = mkdir('repos/archive/api');

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
        message: expect.stringContaining(firstApi),
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

    await setupWorkspace('platform', [`api=${api}`]);

    const link = await runCLI(['workspace', 'link', billing, '--json'], { cwd: tempDir, env });
    expect(link.exitCode).toBe(0);
    expect(parseJson(link).link).toEqual(
      expect.objectContaining({
        name: 'billing',
        path: billing,
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
        path: billingNew,
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
        path: packageDir,
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
        root: checkout.workspace.root,
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
    expect(doctor.stderr).toContain('Multiple OpenSpec workspaces are known. Pass --workspace <name>.');
    expect(doctor.stderr).toContain('openspec workspace doctor --workspace <name>');
  });

  it('prints readable human output for setup, list, and doctor', async () => {
    const api = mkdir('repos/api');

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
    expect(setup.stdout).toContain(`api -> ${api}`);
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
    expect(list.stdout).toContain(`api -> ${api}`);

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
    expect(help.stdout).toContain('link');
    expect(help.stdout).toContain('relink');
    expect(help.stdout).not.toMatch(/\bcreate\b/u);
  });

  it('registers workspace subcommands for shell completions', () => {
    const workspace = COMMAND_REGISTRY.find((command) => command.name === 'workspace');
    const link = workspace?.subcommands?.find((command) => command.name === 'link');
    const relink = workspace?.subcommands?.find((command) => command.name === 'relink');

    expect(workspace?.subcommands?.map((command) => command.name)).toEqual([
      'setup',
      'list',
      'ls',
      'link',
      'relink',
      'doctor',
    ]);
    expect(link?.positionals).toEqual([
      { name: 'name-or-path', type: 'path', optional: true },
      { name: 'path', type: 'path' },
    ]);
    expect(relink?.positionals).toEqual([
      { name: 'name' },
      { name: 'path', type: 'path' },
    ]);
  });
});
