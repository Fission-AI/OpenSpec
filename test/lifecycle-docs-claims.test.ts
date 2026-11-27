import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

import { LIFECYCLE_HOOKS } from '../src/core/lifecycle.js';
import { runCLI, type RunCLIResult } from './helpers/run-cli.js';
import { createOpenSpecRoot } from './helpers/openspec-fixtures.js';

// Every `lifecycle:` snippet in the docs must validate against the real CLI,
// and the CLI output the docs show must match what the CLI prints.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_ROOT = '/Users/you/projects/my-app';

function readPage(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, 'docs-lab', ...relativePath.split('/')), 'utf-8');
}

const PAGES = {
  guide: 'customize/lifecycle-actions.md',
  projectConfig: 'customize/project-config.md',
  configYaml: 'reference/configuration/config-yaml.md',
  cli: 'reference/cli.md',
};
const GUIDE = readPage(PAGES.guide);
const CLI_LIFECYCLE = readPage(PAGES.cli)
  .split('## openspec lifecycle\n')[1]
  .split('## openspec templates')[0];
const CLI_INSTRUCTIONS = readPage(PAGES.cli)
  .split('## openspec instructions\n')[1]
  .split('## openspec templates')[0];
const CLI_VALIDATE = readPage(PAGES.cli)
  .split('## openspec validate\n')[1]
  .split('### --report full|findings')[0];

function fences(markdown: string, lang?: string): string[] {
  return [...markdown.matchAll(/^```(\w*)\n([\s\S]*?)^```$/gm)]
    .filter((match) => lang === undefined || match[1] === lang)
    .map((match) => match[2]);
}

function fenceStartingWith(markdown: string, prefix: string): string {
  const found = fences(markdown).filter((body) => body.startsWith(prefix));
  expect(found, `one fence starting with ${prefix}`).toHaveLength(1);
  return found[0];
}

const SNIPPETS = Object.values(PAGES).flatMap((page) =>
  fences(readPage(page), 'yaml')
    .filter((body) => /^lifecycle:/m.test(body))
    .map((body) => ({ page, body }))
);

interface LifecycleBlock {
  actions: Record<string, unknown>;
  triggers: { on: string; action: string; mode: string }[];
}

function lifecycleOf(snippet: string): LifecycleBlock {
  return parse(snippet).lifecycle;
}

describe('lifecycle documentation', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;
  let counter = 0;

  beforeAll(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-lc-docs-')));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function project(config: string): string {
    const dir = path.join(tempDir, `project-${counter++}`);
    createOpenSpecRoot(dir);
    fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), `schema: spec-driven\n${config}`);
    return dir;
  }

  function run(args: string[], cwd: string): Promise<RunCLIResult> {
    return runCLI(args, { cwd, env });
  }

  function asDocs(output: string, dir: string): string {
    return output.split(dir).join(DOC_ROOT);
  }

  it('finds the lifecycle snippets on every page that documents the block', () => {
    const pages = new Set(SNIPPETS.map((snippet) => snippet.page));
    expect([...pages].sort()).toEqual([PAGES.configYaml, PAGES.guide, PAGES.projectConfig].sort());
    expect(SNIPPETS.filter((snippet) => snippet.page === PAGES.guide)).toHaveLength(3);
  });

  it.each(SNIPPETS.map((snippet, index) => [`${snippet.page} #${index}`, snippet.body]))(
    'validates %s with the real CLI',
    async (_name, body) => {
      const dir = project(body);

      const validate = await run(['validate', '--all', '--json'], dir);
      expect(validate.exitCode, validate.stdout + validate.stderr).toBe(0);
      const config = JSON.parse(validate.stdout).items.find((item: any) => item.type === 'config');
      expect(config).toMatchObject({ id: 'lifecycle', valid: true, issues: [] });

      const all = await run(['lifecycle', 'actions', '--json'], dir);
      expect(all.exitCode, all.stdout + all.stderr).toBe(0);

      const { triggers } = lifecycleOf(body);
      for (const hook of new Set(triggers.map((trigger) => trigger.on))) {
        const lookup = await run(['lifecycle', 'actions', '--at', hook, '--json'], dir);
        expect(lookup.exitCode, lookup.stdout + lookup.stderr).toBe(0);
        expect(JSON.parse(lookup.stdout).actions.map((action: any) => action.id)).toEqual(
          triggers.filter((trigger) => trigger.on === hook).map((trigger) => trigger.action)
        );
      }
    }
  );

  it('lists exactly the built-in hooks in the guide and the config reference', () => {
    const guideHooks = [...GUIDE.split('## Hooks')[1].split('## Modes')[0].matchAll(/^\| `([a-z.]+)` \|/gm)].map(
      (match) => match[1]
    );
    expect(guideHooks).toEqual([...LIFECYCLE_HOOKS]);

    const reference = readPage(PAGES.configYaml);
    for (const hook of LIFECYCLE_HOOKS) {
      expect(reference).toContain(`\`${hook}\``);
    }
  });

  it('shows the real output of the guide examples', async () => {
    const [first] = SNIPPETS.filter((snippet) => snippet.page === PAGES.guide);
    const dir = project(first.body);

    const listing = await run(['lifecycle', 'actions'], dir);
    expect(asDocs(listing.stdout, dir)).toBe(fenceStartingWith(GUIDE, 'Lifecycle actions ('));

    const lookup = await run(['lifecycle', 'actions', '--at', 'change.apply.before', '--json'], dir);
    expect(JSON.parse(asDocs(lookup.stdout, dir))).toEqual(
      JSON.parse(fenceStartingWith(GUIDE, '{\n  "hook"'))
    );
  });

  it('shows the real output in the CLI reference', async () => {
    const [review, feedback] = SNIPPETS.filter((snippet) => snippet.page === PAGES.guide).map((snippet) =>
      lifecycleOf(snippet.body)
    );
    const merged = {
      lifecycle: {
        actions: { ...review.actions, ...feedback.actions },
        triggers: [...review.triggers, ...feedback.triggers],
      },
    };
    const dir = project(stringify(merged));

    const listing = await run(['lifecycle', 'actions'], dir);
    expect(asDocs(listing.stdout, dir)).toBe(fenceStartingWith(CLI_LIFECYCLE, 'Lifecycle actions ('));

    const help = await run(['lifecycle', 'actions', '--help'], dir);
    for (const flag of ['--at <hook>', '--json', '--store <id>']) {
      expect(help.stdout).toContain(flag);
      expect(CLI_LIFECYCLE).toContain(`| \`${flag}\` |`);
    }

    const empty = await run(['lifecycle', 'actions', '--at', 'custom.release.before'], dir);
    expect(empty.stdout.trim()).toBe('No lifecycle actions are configured for custom.release.before.');
    expect(CLI_LIFECYCLE).toContain('`No lifecycle actions are configured for <hook>.`');

    const change = path.join(dir, 'openspec', 'changes', 'add-rate-limit');
    fs.mkdirSync(path.join(change, 'specs', 'api'), { recursive: true });
    fs.writeFileSync(path.join(change, 'proposal.md'), '## Why\nNeed limits.\n\n## What Changes\n- Limits\n');
    fs.writeFileSync(path.join(change, 'design.md'), 'Design.\n');
    fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Work\n- [ ] 1.1 Add middleware\n');
    fs.writeFileSync(
      path.join(change, 'specs', 'api', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Limit\nThe API SHALL limit.\n\n#### Scenario: Burst\n- **WHEN** a burst\n- **THEN** limit\n'
    );
    const apply = await run(['instructions', 'apply', '--change', 'add-rate-limit', '--json'], dir);
    const { lifecycle } = JSON.parse(apply.stdout);
    expect(Object.keys(lifecycle)).toEqual(['before', 'completed', 'handling']);

    const createDir = project(
      stringify({
        lifecycle: {
          actions: review.actions,
          triggers: review.triggers.map((trigger) => ({ ...trigger, on: 'change.create.before' })),
        },
      })
    );
    const create = await run(['instructions', 'create', '--json'], createDir);
    const createLifecycle = JSON.parse(create.stdout).lifecycle;
    expect(CLI_INSTRUCTIONS).toContain(JSON.stringify(createLifecycle.handling));
    expect(CLI_INSTRUCTIONS).toContain(JSON.stringify(createLifecycle.before[0].description));
  });

  it('shows the real policy error in the CLI reference', async () => {
    const dir = project(`lifecycle:
  actions:
    review:
      instructions: Review.
  triggers:
    - on: change.apply.before
      action: review
      mode: suggest
    - on: change.apply.completed
      action: review
      mode: suggest
      policy: block
`);
    const validate = await run(['validate', '--all'], dir);
    expect(validate.exitCode).toBe(1);
    const shown = fenceStartingWith(CLI_VALIDATE, '✓ change/add-rate-limit\n✗ config/lifecycle');
    // Failing items print to stderr, the totals and details line to stdout.
    const lines = `${validate.stderr}\n${validate.stdout}`.split('\n').filter((line) => line.includes('lifecycle'));
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(shown).toContain(line);
    }

    const actions = await run(['lifecycle', 'actions'], dir);
    expect(actions.exitCode).toBe(1);
    expect(CLI_LIFECYCLE).toContain(asDocs(actions.stderr.trim(), dir));
  });

  it('rejects a repeated top-level lifecycle block, as the config reference says', async () => {
    expect(readPage(PAGES.configYaml)).toContain(
      '- `lifecycle:` written more than once at the top level of the file'
    );
    const dir = project(`lifecycle:
  actions:
    review:
      instructions: Review.
lifecycle:
  triggers:
    - on: change.apply.before
      action: review
      mode: suggest
`);
    const actions = await run(['lifecycle', 'actions'], dir);
    expect(actions.exitCode).toBe(1);
    expect(actions.stderr).toContain("Duplicate top-level 'lifecycle' key");
  });
});
