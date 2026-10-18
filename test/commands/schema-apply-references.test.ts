import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parse, stringify } from 'yaml';
import { runCLI, cliProjectRoot } from '../helpers/run-cli.js';

/**
 * End to end: a project schema whose `apply` block names an artifact that does
 * not exist. `schema validate` used to call it valid, and `instructions apply`
 * then either skipped the unknown requirement (reporting `ready` with only a
 * proposal written) or blocked forever on a file nothing generates.
 */
const temps: string[] = [];
afterAll(async () => {
  await Promise.all(temps.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
const T = 120_000;

/**
 * A project on a copy of spec-driven named `myflow`, whose apply block is
 * replaced. `generates` optionally overrides an artifact's `generates` value,
 * keyed by artifact id, so a test can make one artifact emit a glob.
 */
async function projectWithApply(
  apply: Record<string, unknown>,
  generates: Record<string, string> = {}
) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-apply-refs-'));
  temps.push(base);
  const home = path.join(base, 'home');
  const project = path.join(base, 'project');
  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(project, { recursive: true });
  const env = {
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    OPENSPEC_NO_ANIMATION: '1',
  };
  const cli = (args: string[]) => runCLI(args, { cwd: project, env, timeoutMs: 60_000 });
  expect((await cli(['init', '--tools', 'claude'])).exitCode).toBe(0);

  const schemaDir = path.join(project, 'openspec', 'schemas', 'myflow');
  await fs.cp(path.join(cliProjectRoot, 'schemas', 'spec-driven'), schemaDir, { recursive: true });
  const schemaFile = path.join(schemaDir, 'schema.yaml');
  const schema = parse(await fs.readFile(schemaFile, 'utf-8'));
  schema.name = 'myflow';
  schema.apply = apply;
  for (const [id, value] of Object.entries(generates)) {
    const artifact = schema.artifacts.find((a: { id: string }) => a.id === id);
    expect(artifact, `no artifact '${id}' to override`).toBeDefined();
    artifact.generates = value;
  }
  await fs.writeFile(schemaFile, stringify(schema));
  await fs.writeFile(path.join(project, 'openspec', 'config.yaml'), 'schema: myflow\n');

  // Written by hand: `openspec new change` loads the schema, so it cannot
  // create a change on a schema that no longer parses.
  const changeDir = path.join(project, 'openspec', 'changes', 'c');
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: myflow\n');
  await fs.writeFile(
    path.join(changeDir, 'proposal.md'),
    '# C\n\n## Why\nWe need this for a real reason that is long enough to pass.\n\n## What Changes\n- **billing**: y\n'
  );
  return { cli, changeDir };
}

const output = (result: { stdout: string; stderr: string }) => result.stdout + result.stderr;

describe('schema apply references (CLI)', () => {
  it('control: a correct apply.requires validates and blocks apply on the missing artifact', async () => {
    const p = await projectWithApply({ requires: ['design'] });
    const validated = await p.cli(['schema', 'validate', 'myflow']);
    expect(validated.exitCode).toBe(0);
    expect(output(validated)).toMatch(/Schema 'myflow' is valid/);

    const applied = await p.cli(['instructions', 'apply', '--change', 'c', '--json']);
    expect(applied.exitCode).toBe(0);
    expect(JSON.parse(applied.stdout).state).toBe('blocked');
  }, T);

  it('schema validate rejects an apply.requires id no artifact declares', async () => {
    const p = await projectWithApply({ requires: ['desgin'] });
    const validated = await p.cli(['schema', 'validate', 'myflow']);
    expect(validated.exitCode).not.toBe(0);
    expect(output(validated)).toContain(`Invalid apply.requires reference: 'desgin' does not exist`);
    expect(output(validated)).not.toMatch(/Schema 'myflow' is valid/);
  }, T);

  it('schema validate warns, without failing, on an apply.tracks path no artifact generates', async () => {
    const p = await projectWithApply({ requires: ['tasks'], tracks: 'task.md' });
    const validated = await p.cli(['schema', 'validate', 'myflow']);
    expect(validated.exitCode).toBe(0);
    expect(output(validated)).toMatch(/Schema 'myflow' is valid/);
    expect(output(validated)).toContain(
      `warning: apply.tracks 'task.md' does not exactly match any artifact's generates value`
    );
    expect(output(validated)).toContain(
      'Make apply.tracks exactly equal one of those generates values'
    );
  }, T);

  // A glob `generates` really does produce the tracked file, so the one warning
  // must describe the string mismatch that defeats progress discovery, not
  // claim that nothing generates the file.
  it('schema validate describes a glob-generated tracks path as a mismatch, not as ungenerated', async () => {
    const p = await projectWithApply(
      { requires: ['tasks'], tracks: 'tasks/main.md' },
      { tasks: 'tasks/*.md' }
    );
    const validated = await p.cli(['schema', 'validate', 'myflow', '--json']);
    expect(validated.exitCode).toBe(0);
    const report = JSON.parse(validated.stdout);
    expect(report.valid).toBe(true);
    expect(report.issues).toContainEqual({
      level: 'warning',
      path: 'apply.tracks',
      message: expect.stringContaining(
        `apply.tracks 'tasks/main.md' does not exactly match any artifact's generates value`
      ),
    });
    expect(output(validated)).not.toContain('is not generated by any artifact');
  }, T);

  // A hand-written tracked file no artifact generates worked before this check
  // existed; the schema must keep loading so apply keeps working on it.
  it('instructions apply still works on a tracked file no artifact generates', async () => {
    const p = await projectWithApply({ requires: ['proposal'], tracks: 'TODO.md' });
    await fs.writeFile(path.join(p.changeDir, 'TODO.md'), '- [ ] 1.1 do it\n- [x] 1.2 done\n');
    const applied = await p.cli(['instructions', 'apply', '--change', 'c', '--json']);
    expect(applied.exitCode).toBe(0);
    const json = JSON.parse(applied.stdout);
    expect(json.state).toBe('ready');
    expect(json.progress).toMatchObject({ total: 2, complete: 1, remaining: 1 });
  }, T);

  it('instructions apply refuses the schema with a readable error instead of reporting ready', async () => {
    const p = await projectWithApply({ requires: ['desgin'] });
    const applied = await p.cli(['instructions', 'apply', '--change', 'c', '--json']);
    expect(applied.exitCode).not.toBe(0);
    expect(output(applied)).toContain(`Invalid apply.requires reference: 'desgin'`);
    expect(output(applied)).not.toContain('"state": "ready"');
    // A message, not a Node stack trace.
    expect(output(applied)).not.toMatch(/\n\s+at .+:\d+:\d+\)?\n/);
  }, T);
});
