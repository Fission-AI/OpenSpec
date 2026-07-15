import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../../src/core/index.js';
import { newChangeCommand } from '../../../src/commands/workflow/new-change.js';
import { createOpenSpecRoot } from '../../helpers/openspec-fixtures.js';
import { runCLI, type RunCLIResult } from '../../helpers/run-cli.js';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
}));

function parseJson(result: RunCLIResult): any {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
    );
  }
}

function writeChange(root: string, changeId: string): void {
  const changeDir = path.join(root, 'openspec', 'changes', ...changeId.split('/'));
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
}

describe.sequential('domain-aware new change', () => {
  let tempDir: string;
  let localRoot: string;
  let env: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalStdinTTY: boolean | undefined;
  let originalExitCode: string | number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-new-change-domain-'))
    );
    localRoot = path.join(tempDir, 'local');
    createOpenSpecRoot(localRoot);
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };

    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalStdinTTY = (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = originalStdinTTY;
    process.exitCode = originalExitCode;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a root-level local change only with an explicit empty domain', async () => {
    const result = await runCLI(
      ['new', 'change', 'root-change', '--domain', '', '--json'],
      { cwd: localRoot, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual({
      change: {
        id: 'root-change',
        path: path.join(localRoot, 'openspec', 'changes', 'root-change'),
        metadataPath: path.join(
          localRoot,
          'openspec',
          'changes',
          'root-change',
          '.openspec.yaml'
        ),
        schema: 'spec-driven',
      },
      root: {
        path: localRoot,
        source: 'nearest',
      },
    });
  });

  it('preserves lenient casing in a single domain', async () => {
    const result = await runCLI(
      ['new', 'change', 'add-auth', '--domain', 'Platform', '--json'],
      { cwd: localRoot, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).change.id).toBe('Platform/add-auth');
    expect(
      fs.existsSync(path.join(localRoot, 'openspec', 'changes', 'Platform', 'add-auth'))
    ).toBe(true);
  });

  it('creates a change in a multi-level local domain', async () => {
    const result = await runCLI(
      ['new', 'change', 'add-auth', '--domain', 'Platform/API.v2', '--json'],
      { cwd: localRoot, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).change.id).toBe('Platform/API.v2/add-auth');
    expect(
      fs.existsSync(
        path.join(localRoot, 'openspec', 'changes', 'Platform', 'API.v2', 'add-auth')
      )
    ).toBe(true);
  });

  it('preserves the Store root JSON contract and writes the nested path there', async () => {
    const storeRoot = path.join(tempDir, 'team-store');
    createOpenSpecRoot(storeRoot);
    await registerStore({
      id: 'team-context',
      localPath: storeRoot,
      globalDataDir: getGlobalDataDir({ env }),
    });
    const canonicalStoreRoot = fs.realpathSync.native(storeRoot);

    const result = await runCLI(
      [
        'new',
        'change',
        'add-billing',
        '--domain',
        'Finance/Billing',
        '--store',
        'team-context',
        '--json',
      ],
      { cwd: localRoot, env }
    );

    expect(result.exitCode).toBe(0);
    const json = parseJson(result);
    expect(json.root).toEqual({
      path: canonicalStoreRoot,
      source: 'store',
      store_id: 'team-context',
    });
    expect(json.change).toMatchObject({
      id: 'Finance/Billing/add-billing',
      path: path.join(
        canonicalStoreRoot,
        'openspec',
        'changes',
        'Finance',
        'Billing',
        'add-billing'
      ),
    });
    expect(fs.existsSync(path.join(localRoot, 'openspec', 'changes'))).toBe(false);
  });

  it('rejects invalid domain paths and strict-name violations independently', async () => {
    const invalidDomain = await runCLI(
      ['new', 'change', 'add-auth', '--domain', 'Platform/../API', '--json'],
      { cwd: localRoot, env }
    );
    const invalidName = await runCLI(
      ['new', 'change', 'Add-Auth', '--domain', '', '--json'],
      { cwd: localRoot, env }
    );

    expect(invalidDomain.exitCode).toBe(1);
    expect(parseJson(invalidDomain)).toMatchObject({
      change: null,
      status: [{ severity: 'error', message: expect.stringContaining('Domain path') }],
    });
    expect(invalidName.exitCode).toBe(1);
    expect(parseJson(invalidName)).toMatchObject({
      change: null,
      status: [{ severity: 'error', message: expect.stringContaining('lowercase') }],
    });
  });

  it('requires a domain decision in JSON mode and lists domains from the selected root', async () => {
    writeChange(localRoot, 'Platform/API/existing-change');
    writeChange(localRoot, 'Finance/existing-change');

    const result = await runCLI(['new', 'change', 'add-auth', '--json'], {
      cwd: localRoot,
      env,
    });

    expect(result.exitCode).toBe(1);
    const json = parseJson(result);
    expect(json.change).toBeNull();
    expect(json.status).toHaveLength(1);
    expect(json.status[0]).toMatchObject({
      severity: 'error',
      code: 'domain_required',
      target: 'change.domain',
    });
    expect(json.status[0].message).toContain('--domain <path>');
    expect(json.status[0].message).toContain('--domain ""');
    expect(json.status[0].message).toContain('Platform');
    expect(json.status[0].message).toContain('Platform/API');
    expect(json.status[0].message).toContain('Finance');
    expect(json.status[0].message).toMatch(/case-insensitive file systems/i);
  });

  it('requires a domain decision without a TTY and prints actionable guidance', async () => {
    const result = await runCLI(['new', 'change', 'add-auth'], {
      cwd: localRoot,
      env,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('--domain <path>');
    expect(result.stderr).toContain('--domain ""');
    expect(fs.existsSync(path.join(localRoot, 'openspec', 'changes', 'add-auth'))).toBe(false);
  });

  it('uses existing domains from a selected Store in mandatory JSON guidance', async () => {
    writeChange(localRoot, 'Local/existing-change');
    const storeRoot = path.join(tempDir, 'selected-store');
    createOpenSpecRoot(storeRoot);
    writeChange(storeRoot, 'StoreDomain/API/existing-change');
    await registerStore({
      id: 'selected-context',
      localPath: storeRoot,
      globalDataDir: getGlobalDataDir({ env }),
    });

    const result = await runCLI(
      ['new', 'change', 'add-auth', '--store', 'selected-context', '--json'],
      { cwd: localRoot, env }
    );

    expect(result.exitCode).toBe(1);
    const message = parseJson(result).status[0].message;
    expect(message).toContain('StoreDomain');
    expect(message).toContain('StoreDomain/API');
    expect(message).not.toContain('Local');
  });

  it('prompts through existing domains level by level and supports create-here', async () => {
    writeChange(localRoot, 'Platform/API/existing-change');
    process.chdir(localRoot);
    process.env.OPEN_SPEC_INTERACTIVE = '1';
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    const prompts = await import('@inquirer/prompts');
    const select = vi.mocked(prompts.select);
    const selections = ['Platform', 'API', 'Create here'];
    select.mockImplementation(async (config: any) => {
      const expectedName = selections.shift();
      const choice = config.choices.find((candidate: any) =>
        candidate.name.startsWith(expectedName)
      );
      return choice.value;
    });

    await newChangeCommand('add-auth', {});

    expect(select).toHaveBeenCalledTimes(3);
    expect(
      fs.existsSync(path.join(localRoot, 'openspec', 'changes', 'Platform', 'API', 'add-auth'))
    ).toBe(true);
  });

  it('supports create-here at the root in an interactive TTY', async () => {
    process.chdir(localRoot);
    process.env.OPEN_SPEC_INTERACTIVE = '1';
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    const prompts = await import('@inquirer/prompts');
    vi.mocked(prompts.select).mockImplementation(async (config: any) =>
      config.choices.find((candidate: any) => candidate.name.startsWith('Create here')).value
    );

    await newChangeCommand('root-change', {});

    expect(prompts.select).toHaveBeenCalledTimes(1);
    expect(
      fs.existsSync(path.join(localRoot, 'openspec', 'changes', 'root-change'))
    ).toBe(true);
  });

  it('re-prompts an invalid new subdomain name before creating it', async () => {
    process.chdir(localRoot);
    process.env.OPEN_SPEC_INTERACTIVE = '1';
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    const prompts = await import('@inquirer/prompts');
    vi.mocked(prompts.select).mockImplementation(async (config: any) =>
      config.choices.find((candidate: any) => candidate.name.startsWith('New subdomain')).value
    );
    vi.mocked(prompts.input)
      .mockResolvedValueOnce('bad/name')
      .mockResolvedValueOnce('New.Team');

    await newChangeCommand('add-auth', {});

    expect(prompts.input).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('single path segment')
    );
    expect(
      fs.existsSync(path.join(localRoot, 'openspec', 'changes', 'New.Team', 'add-auth'))
    ).toBe(true);
  });
});
