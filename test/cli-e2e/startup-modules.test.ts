import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cliProjectRoot, ensureCliBuilt } from '../helpers/run-cli.js';

// Every CLI call pays for the modules it loads before the command runs, and
// callers such as editors and agents run the CLI many times. A command loads
// only the command definitions (names, options, help text) and its own
// implementation; everything else loads on demand.

const binPath = path.join(cliProjectRoot, 'bin', 'openspec.js');
const hookUrl = pathToFileURL(
  path.join(cliProjectRoot, 'test', 'helpers', 'record-loaded-modules.mjs')
).href;

// The module that implements each command, relative to dist/.
const COMMAND_IMPLEMENTATIONS: Record<string, string[]> = {
  init: ['core/init.js'],
  update: ['core/update.js'],
  list: ['core/list.js'],
  view: ['core/view.js'],
  archive: ['core/archive.js'],
  change: ['commands/change.js'],
  spec: ['commands/spec.js'],
  validate: ['commands/validate.js'],
  show: ['commands/show.js'],
  feedback: ['commands/feedback.js'],
  completion: ['commands/completion.js'],
  config: ['commands/config.js'],
  schema: ['commands/schema.js'],
  store: ['commands/store.js'],
  doctor: ['commands/doctor.js'],
  context: ['commands/context.js'],
  workset: ['commands/workset.js'],
  status: ['commands/workflow/status.js'],
  instructions: ['commands/workflow/instructions.js'],
  templates: ['commands/workflow/templates.js'],
  schemas: ['commands/workflow/schemas.js'],
  new: ['commands/workflow/new-change.js'],
};

const workDirs: string[] = [];

afterAll(() => {
  for (const dir of workDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function loadedModules(args: string[]): {
  own: string[];
  packages: Set<string>;
  status: number | null;
} {
  const workDir = mkdtempSync(path.join(os.tmpdir(), 'openspec-startup-'));
  workDirs.push(workDir);
  const logFile = path.join(workDir, 'modules.log');
  const result = spawnSync(process.execPath, ['--import', hookUrl, binPath, ...args], {
    cwd: workDir,
    env: {
      ...process.env,
      OPENSPEC_TELEMETRY: '0',
      OPEN_SPEC_INTERACTIVE: '0',
      XDG_CONFIG_HOME: path.join(workDir, 'config'),
      XDG_DATA_HOME: path.join(workDir, 'data'),
      OPENSPEC_TEST_MODULE_LOG: logFile,
    },
    encoding: 'utf-8',
    timeout: 30_000,
    windowsHide: true,
  });
  expect(result.error).toBeUndefined();

  // Loaded module URLs use real paths, so compare against the real dist/ path
  // in case the checkout path goes through a symlink or a Windows short name.
  const distRoot = realpathSync.native(path.join(cliProjectRoot, 'dist'));

  const urls = readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
  const own: string[] = [];
  const packages = new Set<string>();
  for (const url of urls) {
    if (!url.startsWith('file:')) continue;
    const file = fileURLToPath(url);
    const segments = file.split(path.sep);
    const lastNodeModules = segments.lastIndexOf('node_modules');
    if (lastNodeModules !== -1) {
      const name = segments[lastNodeModules + 1];
      packages.add(name.startsWith('@') ? `${name}/${segments[lastNodeModules + 2]}` : name);
    } else if (file.startsWith(distRoot + path.sep)) {
      own.push(path.relative(distRoot, file).split(path.sep).join('/'));
    }
  }
  // An empty list means the paths didn't match, and every absence check
  // below would pass without checking anything.
  expect(own).not.toEqual([]);
  return { own, packages, status: result.status };
}

function implementationsLoaded(own: string[]): string[] {
  return Object.entries(COMMAND_IMPLEMENTATIONS)
    .filter(([, modules]) => modules.some((module) => own.includes(module)))
    .map(([command]) => command);
}

describe('CLI startup loads only what the command needs', () => {
  it.each(['--version', '--help', 'validate --help'])(
    '`openspec %s` loads the command definitions and nothing else',
    async (invocation) => {
      await ensureCliBuilt();
      const { own, packages, status } = loadedModules(invocation.split(' '));

      expect(status).toBe(0);
      expect([...packages]).toEqual(['commander']);
      expect(implementationsLoaded(own)).toEqual([]);
    }
  );

  it.each([
    ['config list --json', 'config'],
    ['config path', 'config'],
    ['store list --json', 'store'],
    ['doctor --json', 'doctor'],
    ['schemas --json', 'schemas'],
    ['list --json', 'list'],
  ])('`openspec %s` loads only the %s implementation', async (invocation, command) => {
    await ensureCliBuilt();
    const { own } = loadedModules(invocation.split(' '));

    expect(implementationsLoaded(own)).toEqual([command]);
  });
});
