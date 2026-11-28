import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';

const LIFECYCLE = `lifecycle:
  actions:
    requirements-review:
      title: Review requirements against the plan
      description: Reread linked requirements.
      instructions: |
        Read the sources.
        Report conflicts.
    upstream-feedback:
      instructions: Draft feedback.
    create-check:
      instructions: Check before creating.
    archive-note:
      instructions: Note the archive.
  triggers:
    - on: change.apply.before
      action: upstream-feedback
      mode: auto
    - on: change.apply.before
      action: requirements-review
      mode: suggest
    - on: change.apply.completed
      action: upstream-feedback
      mode: suggest
    - on: change.create.before
      action: create-check
      mode: suggest
    - on: change.archive.completed
      action: archive-note
      mode: auto
    - on: custom.security-review.completed
      action: requirements-review
      mode: suggest
`;

const BROKEN = `lifecycle:
  actions:
    review:
      instructions: Review.
  triggers:
    - on: change.apply.before
      action: review
      mode: suggest
      policy: block
`;

const UNRESOLVED_ALIAS = `lifecycle:
  actions: *missing
`;

const ALIAS_BOMB = `lifecycle:
  a: &a [x, x, x, x, x, x, x, x, x]
  b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a]
  c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b]
  d: &d [*c, *c, *c, *c, *c, *c, *c, *c, *c]
  e: &e [*d, *d, *d, *d, *d, *d, *d, *d, *d]
`;

const DUPLICATE_BLOCKS = `lifecycle:
  actions:
    review:
      instructions: Review.
lifecycle:
  triggers:
    - on: change.apply.before
      action: review
      mode: suggest
`;

const SPEC = `# auth Specification

## Purpose
Authentication behavior for the fixture project used by lifecycle tests.

## Requirements

### Requirement: Login
The system SHALL let a user log in.

#### Scenario: Valid login
- **WHEN** a user submits valid credentials
- **THEN** they are logged in
`;

describe('lifecycle CLI', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;
  let projectDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-lc-cli-')));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    projectDir = path.join(tempDir, 'project');
    createOpenSpecRoot(projectDir);
    writeSpec(projectDir, 'auth', SPEC);
    const changeDir = path.join(projectDir, 'openspec', 'changes', 'add-login');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '## Why\nNeed login.\n\n## What Changes\n- Login\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function writeConfig(dir: string, extra: string): void {
    fs.writeFileSync(
      path.join(dir, 'openspec', 'config.yaml'),
      `schema: spec-driven\ncontext: Project context\n${extra}`
    );
  }

  function run(args: string[], cwd = projectDir): Promise<RunCLIResult> {
    return runCLI(args, { cwd, env });
  }

  function json(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  describe('openspec lifecycle actions', () => {
    it('lists configured hooks and triggers for humans', async () => {
      writeConfig(projectDir, LIFECYCLE);
      const result = await run(['lifecycle', 'actions']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('change.apply.before');
      expect(result.stdout).toContain('1. upstream-feedback (auto): upstream-feedback');
      expect(result.stdout).toContain(
        '2. requirements-review (suggest): Review requirements against the plan'
      );
      expect(result.stdout).toContain('custom.security-review.completed');
      expect(result.stdout.indexOf('change.apply.before')).toBeLessThan(
        result.stdout.indexOf('change.apply.completed')
      );
    });

    it('summarizes every hook as JSON without --at', async () => {
      writeConfig(projectDir, LIFECYCLE);
      const result = await run(['lifecycle', 'actions', '--json']);
      expect(result.exitCode).toBe(0);
      const payload = json(result);
      expect(payload.root).toEqual({ path: projectDir, source: 'nearest' });
      expect(payload.hooks.map((h: any) => h.hook)).toEqual([
        'change.apply.before',
        'change.apply.completed',
        'change.create.before',
        'change.archive.completed',
        'custom.security-review.completed',
      ]);
    });

    it('says clearly when nothing is configured', async () => {
      const human = await run(['lifecycle', 'actions']);
      expect(human.exitCode).toBe(0);
      expect(human.stdout).toContain('No lifecycle actions are configured.');

      const machine = await run(['lifecycle', 'actions', '--json']);
      expect(json(machine)).toEqual({ root: { path: projectDir, source: 'nearest' }, hooks: [] });
    });

    it('returns the ordered actions for one hook', async () => {
      writeConfig(projectDir, LIFECYCLE);
      const result = await run(['lifecycle', 'actions', '--at', 'change.apply.before', '--json']);
      expect(result.exitCode).toBe(0);
      expect(json(result)).toEqual({
        hook: 'change.apply.before',
        root: { path: projectDir, source: 'nearest' },
        actions: [
          { id: 'upstream-feedback', mode: 'auto', title: 'upstream-feedback', instructions: 'Draft feedback.' },
          {
            id: 'requirements-review',
            mode: 'suggest',
            title: 'Review requirements against the plan',
            description: 'Reread linked requirements.',
            instructions: 'Read the sources.\nReport conflicts.',
          },
        ],
      });

      const human = await run(['lifecycle', 'actions', '--at', 'change.apply.before']);
      expect(human.stdout).toContain('| Read the sources.');
    });

    it('returns an empty list for a valid hook with no triggers', async () => {
      writeConfig(projectDir, LIFECYCLE);
      const result = await run(['lifecycle', 'actions', '--at', 'custom.release.before', '--json']);
      expect(result.exitCode).toBe(0);
      expect(json(result).actions).toEqual([]);

      const unconfigured = await run(['lifecycle', 'actions', '--at', 'change.archive.before', '--json']);
      expect(unconfigured.exitCode).toBe(0);
      expect(json(unconfigured).actions).toEqual([]);
    });

    it.each(['change.aply.before', 'custom.', 'custom..foo', 'custom.Foo'])(
      'rejects hook %s without an actions key',
      async (hook) => {
        writeConfig(projectDir, LIFECYCLE);
        const result = await run(['lifecycle', 'actions', '--at', hook, '--json']);
        expect(result.exitCode).toBe(1);
        const payload = json(result);
        expect(payload).not.toHaveProperty('actions');
        expect(payload.hook).toBe(hook);
        expect(payload.status[0].code).toBe('invalid_lifecycle_hook');
      }
    );

    it('fails on invalid config without an actions key', async () => {
      writeConfig(projectDir, BROKEN);
      const result = await run(['lifecycle', 'actions', '--at', 'change.apply.before', '--json']);
      expect(result.exitCode).toBe(1);
      const payload = json(result);
      expect(payload).not.toHaveProperty('actions');
      expect(payload.hook).toBe('change.apply.before');
      expect(payload.status).toEqual([
        expect.objectContaining({
          code: 'invalid_lifecycle_config',
          message: expect.stringContaining("sets 'policy', which is not supported yet"),
        }),
      ]);

      const human = await run(['lifecycle', 'actions']);
      expect(human.exitCode).toBe(1);
      expect(human.stderr).toContain("sets 'policy', which is not supported yet");
      expect(human.stderr).toContain('Fix:');
    });
  });

  describe('openspec instructions create|apply|archive', () => {
    it('omits lifecycle when nothing is configured', async () => {
      for (const args of [
        ['instructions', 'create', '--json'],
        ['instructions', 'apply', '--change', 'add-login', '--json'],
        ['instructions', 'archive', '--change', 'add-login', '--json'],
      ]) {
        const result = await run(args);
        expect(result.exitCode, args.join(' ')).toBe(0);
        const payload = json(result);
        expect(payload).not.toHaveProperty('lifecycle');
        expect(payload).not.toHaveProperty('lifecycleError');
      }
    });

    it('returns root and context for create', async () => {
      writeConfig(projectDir, '');
      const result = await run(['instructions', 'create', '--json']);
      expect(json(result)).toEqual({
        context: 'Project context',
        root: { path: projectDir, source: 'nearest' },
      });
    });

    it('attaches each operation’s checkpoints', async () => {
      writeConfig(projectDir, LIFECYCLE);

      const create = json(await run(['instructions', 'create', '--json']));
      expect(create.lifecycle.before.map((a: any) => a.id)).toEqual(['create-check']);
      expect(create.lifecycle).not.toHaveProperty('completed');
      expect(create.lifecycle.handling).toEqual(expect.any(String));

      const apply = json(await run(['instructions', 'apply', '--change', 'add-login', '--json']));
      expect(apply.lifecycle.before.map((a: any) => a.id)).toEqual([
        'upstream-feedback',
        'requirements-review',
      ]);
      expect(apply.lifecycle.completed.map((a: any) => a.id)).toEqual(['upstream-feedback']);
      expect(apply.context).toBe('Project context');

      const archive = json(await run(['instructions', 'archive', '--change', 'add-login', '--json']));
      expect(archive.lifecycle).not.toHaveProperty('before');
      expect(archive.lifecycle.completed).toEqual([
        { id: 'archive-note', mode: 'auto', title: 'archive-note', instructions: 'Note the archive.' },
      ]);
    });

    it('attaches lifecycleError and keeps the rest of the payload when config is invalid', async () => {
      writeConfig(projectDir, BROKEN);
      for (const args of [
        ['instructions', 'create', '--json'],
        ['instructions', 'apply', '--change', 'add-login', '--json'],
        ['instructions', 'archive', '--change', 'add-login', '--json'],
      ]) {
        const result = await run(args);
        expect(result.exitCode, args.join(' ')).toBe(0);
        const payload = json(result);
        expect(payload).not.toHaveProperty('lifecycle');
        expect(payload.lifecycleError.issues).toEqual([
          expect.stringContaining("sets 'policy', which is not supported yet"),
        ]);
        expect(payload.context).toBe('Project context');
      }
    });

    it('shows lifecycle actions with description and instructions in human output', async () => {
      writeConfig(projectDir, LIFECYCLE);
      const result = await run(['instructions', 'apply', '--change', 'add-login']);
      expect(result.stdout).toContain('### Lifecycle Actions');
      expect(result.stdout).toContain(
        '- before: requirements-review (suggest): Review requirements against the plan\n' +
          '  Reread linked requirements.\n' +
          '  | Read the sources.\n' +
          '  | Report conflicts.\n'
      );
      expect(result.stdout).toContain('- before: upstream-feedback (auto): upstream-feedback\n  | Draft feedback.\n');
    });

    it.each([
      ['an unresolved alias', UNRESOLVED_ALIAS, 'Unresolved alias'],
      ['an alias bomb', ALIAS_BOMB, 'Excessive alias count'],
      ['duplicate top-level blocks', DUPLICATE_BLOCKS, "Duplicate top-level 'lifecycle' key"],
    ])('attaches lifecycleError for %s', async (_label, config, issue) => {
      writeConfig(projectDir, config);
      for (const args of [
        ['instructions', 'create', '--json'],
        ['instructions', 'apply', '--change', 'add-login', '--json'],
        ['instructions', 'archive', '--change', 'add-login', '--json'],
      ]) {
        const result = await run(args);
        expect(result.exitCode, args.join(' ')).toBe(0);
        const payload = json(result);
        expect(payload).not.toHaveProperty('lifecycle');
        expect(payload.lifecycleError.issues).toEqual([expect.stringContaining(issue)]);
        expect(payload.context).toBe('Project context');
      }

      const lookup = await run(['lifecycle', 'actions', '--json']);
      expect(lookup.exitCode).toBe(1);
      expect(json(lookup).status[0].message).toContain(issue);
    });

    it('reads a custom schema artifact named create when --change or --schema is set', async () => {
      const schemaDir = path.join(projectDir, 'openspec', 'schemas', 'create-flow');
      fs.mkdirSync(path.join(schemaDir, 'templates'), { recursive: true });
      fs.writeFileSync(
        path.join(schemaDir, 'schema.yaml'),
        [
          'name: create-flow',
          'version: 1',
          'description: Schema with an artifact named create',
          'artifacts:',
          '  - id: create',
          '    generates: create.md',
          '    description: Creation notes',
          '    template: create.md',
          '    instruction: Write the creation notes.',
          '    requires: []',
          '',
        ].join('\n')
      );
      fs.writeFileSync(path.join(schemaDir, 'templates', 'create.md'), '## Notes\n');
      fs.writeFileSync(
        path.join(projectDir, 'openspec', 'changes', 'add-login', '.openspec.yaml'),
        'schema: create-flow\n'
      );
      writeConfig(projectDir, LIFECYCLE);

      const artifact = await run(['instructions', 'create', '--change', 'add-login', '--json']);
      expect(artifact.exitCode, artifact.stderr).toBe(0);
      expect(json(artifact)).toMatchObject({ artifactId: 'create', changeName: 'add-login' });
      expect(json(artifact)).not.toHaveProperty('lifecycle');

      const withSchema = await run([
        'instructions',
        'create',
        '--change',
        'add-login',
        '--schema',
        'create-flow',
        '--json',
      ]);
      expect(json(withSchema)).toMatchObject({ artifactId: 'create' });

      const operation = await run(['instructions', 'create', '--json']);
      expect(json(operation).lifecycle.before.map((a: any) => a.id)).toEqual(['create-check']);
    });
  });

  describe('lifecycle-free commands', () => {
    it('keeps list and status unaffected by lifecycle config, valid or not', async () => {
      for (const config of [LIFECYCLE, BROKEN, UNRESOLVED_ALIAS, ALIAS_BOMB, DUPLICATE_BLOCKS]) {
        writeConfig(projectDir, config);
        const status = await run(['status', '--change', 'add-login', '--json']);
        expect(status.exitCode).toBe(0);
        expect(status.stdout).not.toContain('lifecycle');

        const list = await run(['list', '--json']);
        expect(list.exitCode).toBe(0);
        expect(list.stdout).not.toContain('lifecycle');
      }
    });
  });

  describe('openspec validate', () => {
    it('checks lifecycle config in --all only', async () => {
      writeConfig(projectDir, BROKEN);

      const all = await run(['validate', '--all', '--json']);
      expect(all.exitCode).toBe(1);
      const lifecycleItem = json(all).items.find((item: any) => item.type === 'config');
      expect(lifecycleItem).toMatchObject({ id: 'lifecycle', valid: false });
      expect(lifecycleItem.issues[0].message).toContain("sets 'policy'");
      expect(json(all).summary.byType.config).toEqual({ items: 1, passed: 0, failed: 1 });

      const specs = await run(['validate', '--specs', '--json']);
      expect(specs.exitCode).toBe(0);
      expect(specs.stdout).not.toContain('lifecycle');

      const single = await run(['validate', 'auth', '--type', 'spec', '--json']);
      expect(single.exitCode).toBe(0);
      expect(single.stdout).not.toContain('lifecycle');

      const changes = await run(['validate', '--changes', '--json']);
      expect(changes.stdout).not.toContain('"config"');
    });

    it.each([
      ['an unresolved alias', UNRESOLVED_ALIAS, 'Unresolved alias'],
      ['an alias bomb', ALIAS_BOMB, 'Excessive alias count'],
      ['duplicate top-level blocks', DUPLICATE_BLOCKS, "Duplicate top-level 'lifecycle' key"],
    ])('fails --all but not --specs for %s', async (_label, config, issue) => {
      writeConfig(projectDir, config);

      const all = await run(['validate', '--all', '--json']);
      expect(all.exitCode).toBe(1);
      const lifecycleItem = json(all).items.find((item: any) => item.type === 'config');
      expect(lifecycleItem).toMatchObject({ id: 'lifecycle', valid: false });
      expect(lifecycleItem.issues[0].message).toContain(issue);

      const specs = await run(['validate', '--specs', '--json']);
      expect(specs.exitCode, specs.stdout).toBe(0);
    });

    it('reports valid lifecycle config as a passing item', async () => {
      writeConfig(projectDir, LIFECYCLE);
      fs.rmSync(path.join(projectDir, 'openspec', 'changes', 'add-login'), { recursive: true });
      const all = await run(['validate', '--all', '--json']);
      expect(all.exitCode).toBe(0);
      expect(json(all).items).toContainEqual(
        expect.objectContaining({ id: 'lifecycle', type: 'config', valid: true })
      );
    });

    it('adds nothing to --all when lifecycle is not configured', async () => {
      const all = await run(['validate', '--all', '--json']);
      expect(json(all).items.some((item: any) => item.type === 'config')).toBe(false);
      expect(json(all).summary.byType).not.toHaveProperty('config');
    });

    it('rejects duplicate non-lifecycle keys immediately after a lifecycle block', async () => {
      fs.writeFileSync(
        path.join(projectDir, 'openspec', 'config.yaml'),
        'schema: spec-driven\ncontext: first\nlifecycle: {}\ncontext: second\n'
      );
      const all = await run(['validate', '--all', '--json']);
      expect(all.exitCode).toBe(1);
    });
  });

  describe('stores', () => {
    let storeRoot: string;
    let pointerRepo: string;

    beforeEach(async () => {
      storeRoot = path.join(tempDir, 'team-context');
      createOpenSpecRoot(storeRoot);
      writeConfig(storeRoot, LIFECYCLE);
      await registerStore({
        id: 'team-context',
        localPath: storeRoot,
        globalDataDir: getGlobalDataDir({ env }),
      });

      pointerRepo = path.join(tempDir, 'app-repo');
      fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
      fs.writeFileSync(path.join(pointerRepo, 'openspec', 'config.yaml'), 'store: team-context\n');
    });

    it('resolves lifecycle from the store with --store', async () => {
      const result = await run(
        ['lifecycle', 'actions', '--at', 'change.apply.completed', '--store', 'team-context', '--json'],
        tempDir
      );
      expect(result.exitCode).toBe(0);
      expect(json(result).root).toEqual({
        path: storeRoot,
        source: 'store',
        store_id: 'team-context',
      });
      expect(json(result).actions.map((a: any) => a.id)).toEqual(['upstream-feedback']);

      const create = await run(['instructions', 'create', '--store', 'team-context', '--json'], tempDir);
      expect(json(create).lifecycle.before.map((a: any) => a.id)).toEqual(['create-check']);
    });

    it('resolves lifecycle from the store a pointer repo declares', async () => {
      const result = await run(['lifecycle', 'actions', '--at', 'change.apply.before', '--json'], pointerRepo);
      expect(result.exitCode).toBe(0);
      expect(json(result).root.source).toBe('declared');
      expect(json(result).actions).toHaveLength(2);
    });

    it('fails loudly when a pointer-only repo config sets lifecycle', async () => {
      fs.writeFileSync(
        path.join(pointerRepo, 'openspec', 'config.yaml'),
        `store: team-context\n${LIFECYCLE}`
      );

      const lookup = await run(['lifecycle', 'actions', '--at', 'change.apply.before', '--json'], pointerRepo);
      expect(lookup.exitCode).toBe(1);
      expect(json(lookup)).not.toHaveProperty('actions');
      expect(json(lookup).status[0].message).toContain("only points at store 'team-context'");

      const create = await run(['instructions', 'create', '--json'], pointerRepo);
      expect(create.exitCode).toBe(0);
      expect(json(create)).not.toHaveProperty('lifecycle');
      expect(json(create).lifecycleError.issues[0]).toContain("only points at store 'team-context'");

      const explicit = await run(['lifecycle', 'actions', '--store', 'team-context'], pointerRepo);
      expect(explicit.exitCode).toBe(1);
      expect(explicit.stderr).toContain('--store team-context');
    });

    it('resolves the store but fails loudly when a pointer-only repo has a broken lifecycle alias', async () => {
      fs.writeFileSync(
        path.join(pointerRepo, 'openspec', 'config.yaml'),
        `store: team-context\n${UNRESOLVED_ALIAS}`
      );

      const lookup = await run(['lifecycle', 'actions', '--json'], pointerRepo);
      expect(lookup.exitCode).toBe(1);
      expect(json(lookup).status[0].message).toContain("only points at store 'team-context'");

      // The store pointer itself still resolves: the error names the store root's config.
      expect(json(lookup).status[0].message).toContain(storeRoot);
      const list = await run(['list', '--json'], pointerRepo);
      expect(list.exitCode).toBe(0);
    });
  });
});
