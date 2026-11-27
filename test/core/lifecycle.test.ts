import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  LIFECYCLE_HOOKS,
  lifecycleHookProblem,
  loadOperationLifecycle,
  readLifecycleConfig,
  resolveLifecycleActions,
  type LifecycleConfigRead,
} from '../../src/core/lifecycle.js';
import {
  readConfigParseError,
  readProjectConfig,
  readStorePointer,
} from '../../src/core/project-config.js';
import type { ResolvedOpenSpecRoot } from '../../src/core/root-selection.js';

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

const VALID_LIFECYCLE = `lifecycle:
  actions:
    requirements-review:
      title: Review requirements against the plan
      description: Reread linked requirements.
      instructions: |
        Read the sources.
        Report conflicts.
    upstream-feedback:
      instructions: Draft feedback.
    drift-check:
      instructions: Run the drift script.
  triggers:
    - on: change.apply.before
      action: drift-check
      mode: auto
    - on: change.apply.before
      action: requirements-review
      mode: suggest
    - on: change.apply.completed
      action: upstream-feedback
      mode: suggest
    - on: custom.security-review.completed
      action: upstream-feedback
      mode: auto
`;

describe('lifecycle config', () => {
  let tempDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-lifecycle-'));
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'openspec', 'config.yaml'), content);
  }

  function issuesFor(lifecycle: string): string[] {
    writeConfig(`schema: spec-driven\n${lifecycle}`);
    const read = readLifecycleConfig(tempDir);
    expect(read.status).toBe('invalid');
    return (read as Extract<LifecycleConfigRead, { status: 'invalid' }>).issues;
  }

  function root(): ResolvedOpenSpecRoot {
    return {
      path: tempDir,
      changesDir: path.join(tempDir, 'openspec', 'changes'),
      specsDir: path.join(tempDir, 'openspec', 'specs'),
      archiveDir: path.join(tempDir, 'openspec', 'changes', 'archive'),
      defaultSchema: 'spec-driven',
      source: 'nearest',
    };
  }

  describe('hook names', () => {
    it.each(LIFECYCLE_HOOKS)('accepts built-in hook %s', (hook) => {
      expect(lifecycleHookProblem(hook)).toBeNull();
    });

    it.each(['custom.security-review', 'custom.security-review.completed', 'custom.a1.b-2'])(
      'accepts custom hook %s',
      (hook) => {
        expect(lifecycleHookProblem(hook)).toBeNull();
      }
    );

    it.each([
      'custom.',
      'custom..foo',
      'custom.Foo',
      'custom.foo.',
      'custom.foo_bar',
      'change.aply.before',
      'change.verify.before',
      'change.apply',
      'custom',
      '',
    ])('rejects %j', (hook) => {
      expect(lifecycleHookProblem(hook)).toEqual(expect.any(String));
    });
  });

  describe('readLifecycleConfig', () => {
    it('is unconfigured without a config file or lifecycle block', () => {
      expect(readLifecycleConfig(tempDir)).toEqual({ status: 'unconfigured' });
      writeConfig('schema: spec-driven\ncontext: hi\n');
      expect(readLifecycleConfig(tempDir)).toEqual({ status: 'unconfigured' });
    });

    it('accepts an empty lifecycle block', () => {
      writeConfig('schema: spec-driven\nlifecycle:\n');
      const read = readLifecycleConfig(tempDir);
      expect(read).toMatchObject({ status: 'ok', config: { triggers: [] } });
    });

    it('parses a valid config, trimming instructions and keeping trigger order', () => {
      writeConfig(`schema: spec-driven\n${VALID_LIFECYCLE}`);
      const read = readLifecycleConfig(tempDir);
      expect(read.status).toBe('ok');
      const config = (read as Extract<LifecycleConfigRead, { status: 'ok' }>).config;
      expect(config.actions['requirements-review']).toEqual({
        title: 'Review requirements against the plan',
        description: 'Reread linked requirements.',
        instructions: 'Read the sources.\nReport conflicts.',
      });
      expect(config.triggers.map((t) => t.action)).toEqual([
        'drift-check',
        'requirements-review',
        'upstream-feedback',
        'upstream-feedback',
      ]);
    });

    it('reads config.yml too', () => {
      fs.writeFileSync(
        path.join(tempDir, 'openspec', 'config.yml'),
        `schema: spec-driven\n${VALID_LIFECYCLE}`
      );
      expect(readLifecycleConfig(tempDir).status).toBe('ok');
    });

    it('rejects policy on a trigger with a tailored unsupported error', () => {
      const issues = issuesFor(`lifecycle:
  actions:
    review:
      instructions: Review.
  triggers:
    - on: change.apply.before
      action: review
      mode: suggest
      policy: block
`);
      expect(issues).toEqual([expect.stringContaining("sets 'policy', which is not supported yet")]);
    });

    it('rejects unknown keys at every level', () => {
      const issues = issuesFor(`lifecycle:
  plugins: []
  actions:
    review:
      instructions: Review.
      command: ./check.sh
  triggers:
    - on: change.apply.before
      action: review
      mode: suggest
      when: always
`);
      expect(issues).toEqual([
        expect.stringContaining('Unknown key(s) in lifecycle: plugins'),
        expect.stringContaining('Unknown key(s) in lifecycle.actions.review: command'),
        expect.stringContaining('Unknown key(s) in lifecycle.triggers[0]: when'),
      ]);
    });

    it('reports duplicate action ids written as duplicate YAML keys', () => {
      const issues = issuesFor(`lifecycle:
  actions:
    review:
      instructions: One.
    review:
      instructions: Two.
`);
      expect(issues).toEqual(["Duplicate action id 'review' in lifecycle.actions."]);
    });

    it('reports duplicate keys inside a trigger', () => {
      const issues = issuesFor(`lifecycle:
  actions:
    review:
      instructions: One.
  triggers:
    - on: change.apply.before
      on: change.apply.completed
      action: review
      mode: auto
`);
      expect(issues).toEqual(["Duplicate key 'on' in lifecycle.triggers[0]."]);
    });

    it('rejects duplicate (on, action) trigger pairs', () => {
      const issues = issuesFor(`lifecycle:
  actions:
    review:
      instructions: One.
  triggers:
    - on: change.apply.before
      action: review
      mode: auto
    - on: change.apply.before
      action: review
      mode: suggest
`);
      expect(issues).toEqual([
        "lifecycle.triggers[1] duplicates an earlier trigger for action 'review' on 'change.apply.before'.",
      ]);
    });

    it('rejects missing references, missing or invalid modes, and invalid hooks', () => {
      const issues = issuesFor(`lifecycle:
  actions:
    review:
      instructions: One.
  triggers:
    - on: change.apply.before
      action: missing
      mode: auto
    - on: change.apply.before
      action: review
    - on: change.apply.completed
      action: review
      mode: always
    - on: change.aply.before
      action: review
      mode: auto
    - on: custom.
      action: review
      mode: auto
    - action: review
      mode: auto
`);
      expect(issues).toEqual([
        "lifecycle.triggers[0].action 'missing' does not match any action in lifecycle.actions.",
        'lifecycle.triggers[1].mode is required: use suggest or auto.',
        "lifecycle.triggers[2].mode 'always' is not supported: use suggest or auto.",
        expect.stringContaining("lifecycle.triggers[3].on: Unknown hook 'change.aply.before'"),
        expect.stringContaining("lifecycle.triggers[4].on: Invalid custom hook 'custom.'"),
        'lifecycle.triggers[5].on is required and must be a hook name.',
      ]);
    });

    it('rejects invalid action ids and empty or missing instructions', () => {
      const issues = issuesFor(`lifecycle:
  actions:
    Bad_Id:
      instructions: Fine.
    blank:
      instructions: "   "
    missing:
      title: No instructions
    titled:
      instructions: Fine.
      title: ""
`);
      expect(issues).toEqual([
        expect.stringContaining("Invalid action id 'Bad_Id'"),
        'lifecycle.actions.blank.instructions is required and must be a non-empty string.',
        'lifecycle.actions.missing.instructions is required and must be a non-empty string.',
        'lifecycle.actions.titled.title must be a non-empty string when set.',
      ]);
    });

    it('rejects wrong shapes', () => {
      expect(issuesFor('lifecycle: []\n')).toEqual([
        "lifecycle must be a mapping with 'actions' and 'triggers'.",
      ]);
      expect(issuesFor('lifecycle:\n  actions: []\n  triggers: {}\n')).toEqual([
        'lifecycle.actions must be a mapping of action ids to actions.',
        'lifecycle.triggers must be a list of triggers.',
      ]);
    });

    it('reports a config that is not valid YAML', () => {
      writeConfig('schema: [unclosed\nlifecycle:\n');
      const read = readLifecycleConfig(tempDir);
      expect(read.status).toBe('invalid');
    });

    it('reports unresolved aliases and alias bombs as invalid instead of throwing', () => {
      expect(issuesFor(UNRESOLVED_ALIAS)).toEqual([expect.stringContaining('Unresolved alias')]);
      expect(issuesFor(ALIAS_BOMB)).toEqual([expect.stringContaining('Excessive alias count')]);
    });

    it('rejects duplicate top-level lifecycle blocks', () => {
      expect(issuesFor(DUPLICATE_BLOCKS)).toEqual([
        expect.stringContaining(
          `Duplicate top-level 'lifecycle' key in ${path.join(tempDir, 'openspec', 'config.yaml')}. Combine all actions and triggers under one 'lifecycle:' block.`
        ),
      ]);
    });
  });

  describe('forgiving readers stay unaffected by lifecycle problems', () => {
    it('keeps context when lifecycle has duplicate keys or invalid fields', () => {
      writeConfig(`schema: spec-driven
context: Project context
lifecycle:
  actions:
    review:
      instructions: One.
      policy: block
    review:
      instructions: Two.
`);
      expect(readProjectConfig(tempDir)).toMatchObject({
        schema: 'spec-driven',
        context: 'Project context',
      });
      expect(readConfigParseError(tempDir)).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['an unresolved alias', UNRESOLVED_ALIAS],
      ['an alias bomb', ALIAS_BOMB],
      ['duplicate top-level blocks', DUPLICATE_BLOCKS],
    ])('keeps the rest of the config when lifecycle has %s', (_label, lifecycle) => {
      writeConfig(`schema: spec-driven\ncontext: Project context\nstore: team-context\n${lifecycle}`);
      expect(readProjectConfig(tempDir)).toMatchObject({
        schema: 'spec-driven',
        context: 'Project context',
      });
      expect(readConfigParseError(tempDir)).toBeNull();
      expect(readStorePointer(tempDir)).toMatchObject({ value: 'team-context' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('still reports errors outside lifecycle', () => {
      writeConfig(`schema: spec-driven\ncontext: *missing\n${VALID_LIFECYCLE}`);
      expect(readProjectConfig(tempDir)).toBeNull();
      expect(readStorePointer(tempDir)).toMatchObject({ malformed: 'unparseable' });
    });

    it('still reports duplicate keys outside lifecycle as unparseable', () => {
      writeConfig('schema: spec-driven\nschema: other\nlifecycle:\n  actions: {}\n');
      expect(readConfigParseError(tempDir)).toMatchObject({ kind: 'parse' });
    });
  });

  describe('resolution', () => {
    it('returns actions for a hook in trigger order with title defaulting to the id', () => {
      writeConfig(`schema: spec-driven\n${VALID_LIFECYCLE}`);
      const read = readLifecycleConfig(tempDir) as Extract<LifecycleConfigRead, { status: 'ok' }>;
      expect(resolveLifecycleActions(read.config, 'change.apply.before')).toEqual([
        {
          id: 'drift-check',
          mode: 'auto',
          title: 'drift-check',
          instructions: 'Run the drift script.',
        },
        {
          id: 'requirements-review',
          mode: 'suggest',
          title: 'Review requirements against the plan',
          description: 'Reread linked requirements.',
          instructions: 'Read the sources.\nReport conflicts.',
        },
      ]);
      expect(resolveLifecycleActions(read.config, 'change.archive.before')).toEqual([]);
    });

    it('groups operation actions by checkpoint and omits empty checkpoints', () => {
      writeConfig(`schema: spec-driven\n${VALID_LIFECYCLE}`);
      const apply = loadOperationLifecycle(root(), 'apply', tempDir);
      expect(apply.lifecycle?.before?.map((a) => a.id)).toEqual(['drift-check', 'requirements-review']);
      expect(apply.lifecycle?.completed?.map((a) => a.id)).toEqual(['upstream-feedback']);
      expect(apply.lifecycle?.handling).toContain('`suggest`');
      expect(apply.lifecycle?.handling).toContain('`auto`');
      expect(apply.lifecycleError).toBeUndefined();

      expect(loadOperationLifecycle(root(), 'archive', tempDir)).toEqual({});
      expect(loadOperationLifecycle(root(), 'create', tempDir)).toEqual({});
    });

    it('describes only the modes and checkpoints present', () => {
      writeConfig(`schema: spec-driven
lifecycle:
  actions:
    note:
      instructions: Note it.
  triggers:
    - on: change.archive.completed
      action: note
      mode: suggest
`);
      const { lifecycle } = loadOperationLifecycle(root(), 'archive', tempDir);
      expect(lifecycle?.before).toBeUndefined();
      expect(Object.keys(lifecycle ?? {})).toEqual(['completed', 'handling']);
      expect(lifecycle?.handling).toContain('`completed`');
      expect(lifecycle?.handling).not.toContain('`before`');
      expect(lifecycle?.handling).not.toContain('`auto`');
    });

    it('tells the agent to stop and wait for the user before anything else on suggest', () => {
      writeConfig(`schema: spec-driven\n${VALID_LIFECYCLE}`);
      const { lifecycle } = loadOperationLifecycle(root(), 'apply', tempDir);
      expect(lifecycle?.handling).toContain(
        "`suggest`: offer the action by its title and description, then stop and wait for the user's answer before doing anything else, including later actions and any file changes. Follow its instructions only if the user accepts."
      );
    });

    it('returns lifecycleError instead of lifecycle when config is invalid', () => {
      writeConfig(`schema: spec-driven
lifecycle:
  actions: {}
  triggers:
    - on: change.apply.before
      action: missing
      mode: auto
`);
      const fields = loadOperationLifecycle(root(), 'apply', tempDir);
      expect(fields.lifecycle).toBeUndefined();
      expect(fields.lifecycleError).toMatchObject({
        message: expect.stringContaining('Invalid lifecycle config'),
        issues: [expect.stringContaining("'missing' does not match")],
        fix: expect.stringContaining('openspec lifecycle actions'),
      });
    });
  });
});
