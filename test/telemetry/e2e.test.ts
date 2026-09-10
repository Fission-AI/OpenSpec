import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(repoRoot, 'bin', 'openspec.js');

/**
 * These run the real binary. The behaviors here — which exit paths report, what
 * reaches stdout, what lands on disk — are properties of the wiring, and a
 * unit test of the telemetry module cannot see any of them.
 */
describe('telemetry end to end', () => {
  let home: string;

  function run(args: string[], env: Record<string, string> = {}) {
    const cwd = path.join(home, 'proj');
    // spawnSync, not execFileSync: a successful run's stderr is where every
    // telemetry payload lands, and execFileSync only hands back stdout.
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd,
      encoding: 'utf-8',
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        XDG_CONFIG_HOME: path.join(home, '.config'),
        XDG_DATA_HOME: path.join(home, '.local'),
        CI: '',
        NO_COLOR: '1',
        // vitest.config.ts force-disables telemetry for every worker so the
        // suite never writes a developer's real config or posts an event.
        // These runs are the telemetry test, and use a throwaway HOME.
        OPENSPEC_TELEMETRY: '',
        DO_NOT_TRACK: '',
        ...env,
      },
    });
    return { code: result.status ?? 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  }

  function debugRun(args: string[]) {
    const result = run(args, { OPENSPEC_TELEMETRY_DEBUG: '1' });
    const events = result.stderr
      .split('\n')
      .filter((line) => line.startsWith('[openspec telemetry] '))
      .map((line) => JSON.parse(line.replace('[openspec telemetry] ', '')));
    return { ...result, events };
  }

  beforeAll(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-e2e-tel-'));
    fs.mkdirSync(path.join(home, 'proj'), { recursive: true });
    // No build here: the suite already runs against a built dist/, and building
    // inside a hook blows the hook timeout on CI.
  });

  afterAll(() => fs.rmSync(home, { recursive: true, force: true }));

  it('reports an unknown command, which used to emit nothing at all', () => {
    const { events, code } = debugRun(['proposal']);
    const completed = events.filter((e) => e.event === 'command_completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].properties.error_class).toBe('bad_usage');
    expect(code).toBe(1);
  });

  it('reports an unknown flag and a group with no subcommand', () => {
    for (const args of [['list', '--bogus'], ['spec']]) {
      const { events } = debugRun(args);
      expect(events.find((e) => e.event === 'command_completed')?.properties.error_class).toBe(
        'bad_usage'
      );
    }
  });

  it('emits nothing for --help and --version', () => {
    expect(debugRun(['--help']).events).toHaveLength(0);
    expect(debugRun(['--version']).events).toHaveLength(0);
    expect(debugRun(['help']).events).toHaveLength(0);
  });

  it('sends exactly one completion per invocation', () => {
    for (const args of [['schemas'], ['list'], ['proposal'], ['spec']]) {
      const { events } = debugRun(args);
      expect(events.filter((e) => e.event === 'command_completed'), args.join(' ')).toHaveLength(1);
    }
  });

  it('keeps stdout a single valid JSON document while inspecting telemetry', () => {
    const { stdout } = debugRun(['list', '--json']);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it('never lets a project name reach a payload', () => {
    const named = path.join(home, 'proj', 'openspec', 'changes', 'acme-billing-rewrite');
    fs.mkdirSync(named, { recursive: true });
    const { events } = debugRun(['list']);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('acme-billing-rewrite');
    expect(serialized).not.toContain(home);
    // The count is still reported, as a bucket.
    expect(events.find((e) => e.event === 'command_completed')?.properties.changes).toBe('01-03');
    fs.rmSync(named, { recursive: true, force: true });
  });

  it('writes nothing at all while inspecting or opted out', () => {
    const configDir = path.join(home, '.config-probe');
    for (const env of [{ OPENSPEC_TELEMETRY_DEBUG: '1' }, { OPENSPEC_TELEMETRY: '0' }]) {
      fs.rmSync(configDir, { recursive: true, force: true });
      run(['schemas'], { ...env, XDG_CONFIG_HOME: configDir });
      expect(fs.existsSync(path.join(configDir, 'openspec', 'config.json')), JSON.stringify(env)).toBe(
        false
      );
    }
  });

  it('shows the user their own telemetry state', () => {
    run(['schemas']); // mint an id
    const { stdout } = run(['config', 'get', 'telemetry']);
    const state = JSON.parse(stdout);
    expect(state.enabled).toBe(true);
    expect(state.anonymousId).toMatch(/^[0-9a-f-]{36}$/);
    expect(fs.existsSync(state.configPath)).toBe(true);
  });

  it('preserves exit codes on every reported path', () => {
    expect(run(['--version']).code).toBe(0);
    expect(run(['--help']).code).toBe(0);
    expect(run(['proposal']).code).toBe(1);
    expect(run(['list', '--bogus']).code).toBe(1);
    expect(run(['spec']).code).toBe(1);
  });
});
