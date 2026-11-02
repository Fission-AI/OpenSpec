// Each scenario is one realistic request a user makes of an agent.
// `setup` shapes the project before the agent starts; `checks` grade the
// result with the OpenSpec CLI and the file system, never with the agent's
// own report of what it did.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyClearCompleted } from './seeds/add-clear-completed/implementation.patch.mjs';

// Runs are headless, so nobody can answer a question. Requests that should
// finish on their own say so, the way a user stepping away would.
const AUTONOMOUS = ' Use your best judgment instead of asking me questions.';

// How an agent says "these tasks are not done", in any of its phrasings.
export const UNFINISHED_TASKS =
  /incomplete|unfinished|unchecked|not (yet )?(complete|completed|done|implemented)|0\s*(\/|of)\s*3|3 (open|remaining|pending)/i;

// A stable ID at the start of a heading, as the CLI reads it (#2167).
const STABLE_ID = /^\[[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d+(?:\.\d+)*\](?=\s|$)/;

/** The latency budget, however an agent spells it: 50ms, 50 ms, 50 milliseconds. */
const BUDGET = /\b50\s*(ms|millisecond)/i;

const SEEDS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seeds');

function seedChange(root, name) {
  fs.cpSync(path.join(SEEDS, name), path.join(root, 'openspec', 'changes', name), {
    recursive: true,
    filter: (source) => !source.endsWith('.mjs'),
  });
}

function onlyOpenspecChanged(ctx) {
  const outside = ctx.changedFiles().filter((file) => !file.startsWith('openspec/'));
  return {
    name: 'no files changed outside openspec/',
    pass: outside.length === 0,
    detail: outside.join(', '),
  };
}

function nothingChanged(ctx) {
  const changed = ctx.changedFiles();
  return { name: 'no files changed', pass: changed.length === 0, detail: changed.join(', ') };
}

/** Change folders this run created or touched (a real project already has others). */
function touchedChangeNames(ctx) {
  const names = ctx
    .changedFiles()
    .map((file) => /^openspec\/changes\/([^/]+)\//.exec(file)?.[1])
    .filter((name) => name && name !== 'archive');
  return [...new Set(names)];
}

/** A propose request against a real project: one new change, valid, on the existing capability. */
function repoPropose({ id, prompt, capability }) {
  return {
    id,
    fixture: 'repo',
    prompt,
    // What the plan judge sees of the project: the capability's main spec today.
    judgeContext: (root) =>
      `The project's current spec for \`${capability}\`:\n\n${fs.readFileSync(path.join(root, 'openspec', 'specs', capability, 'spec.md'), 'utf8')}`,
    metrics: (ctx) => {
      const name = touchedChangeNames(ctx)[0];
      return name ? { ...specQuality(ctx, name), ...planTrace(ctx, name) } : {};
    },
    checks: (ctx) => {
      const names = touchedChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      results.push({
        name: `delta targets the existing ${capability} capability`,
        pass: ctx.exists(`openspec/changes/${names[0]}/specs/${capability}/spec.md`),
      });
      results.push(onlyOpenspecChanged(ctx));
      return results;
    },
  };
}

function newChangeNames(ctx) {
  const dir = path.join(ctx.root, 'openspec', 'changes');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name !== 'archive' && fs.statSync(path.join(dir, name)).isDirectory());
}

// The change's tasks.md, active or archived: apply may close the change out.
function tasksDone(ctx, name) {
  const archive = path.join(ctx.root, 'openspec/changes/archive');
  const archived = fs.existsSync(archive)
    ? fs.readdirSync(archive).find((dir) => dir.endsWith(`-${name}`))
    : undefined;
  const text =
    ctx.read(`openspec/changes/${name}/tasks.md`) ??
    (archived ? ctx.read(`openspec/changes/archive/${archived}/tasks.md`) : null) ??
    '';
  const open = (text.match(/^\s*- \[ \]/gm) ?? []).length;
  const done = (text.match(/^\s*- \[x\]/gim) ?? []).length;
  return { open, done };
}


function deltaSpecs(ctx, name) {
  const dir = path.join(ctx.root, 'openspec', 'changes', name, 'specs');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((file) => String(file).endsWith('.md'))
    .map((file) => ({ file: String(file), text: fs.readFileSync(path.join(dir, String(file)), 'utf8') }));
}

/** One requirement block per `### Requirement:` heading, through its scenarios. */
function requirementBlocks(text) {
  return text.split(/^### Requirement:/m).slice(1);
}

/**
 * Spec-quality observations from the Loft study and the spec-reading audit:
 * a failure path, one obligation per requirement, no internals in the
 * requirement statement, and the existing capability reused.
 */
function specQuality(ctx, name) {
  const specs = deltaSpecs(ctx, name);
  const blocks = specs.flatMap((spec) => requirementBlocks(spec.text));
  const statement = (block) => block.split(/^#### Scenario:/m)[0];
  const failure = /\b(invalid|unknown|missing|empty|reject|rejects|error|throws|fails?|not found|malformed|outside)\b/i;
  return {
    usesExistingCapability: specs.length > 0 && specs.every((spec) => spec.file.startsWith('todo-list')),
    everyRequirementHasFailurePath:
      blocks.length > 0 &&
      blocks.every((block) =>
        block.split(/^#### Scenario:/m).slice(1).some((scenario) => failure.test(scenario))
      ),
    oneObligationPerRequirement:
      blocks.length > 0 && blocks.every((block) => (statement(block).match(/\b(SHALL|MUST)\b/g) ?? []).length <= 1),
    noInternalsInRequirements:
      blocks.length > 0 &&
      blocks.every((block) => !/src\/|\.js\b|#[a-zA-Z]+|\bprivate\b/.test(statement(block))),
  };
}

/**
 * How much plan a change actually carries, so "shorter artifacts" is a number
 * rather than an impression. Words, not bytes, and per artifact as well as
 * total: a plan can be short because it is tight or because it is missing.
 */
function planSize(ctx, name) {
  const dir = path.join(ctx.root, 'openspec', 'changes', name);
  if (!fs.existsSync(dir)) return {};
  const files = fs.readdirSync(dir, { recursive: true }).map(String).filter((file) => file.endsWith('.md'));
  const words = (file) => fs.readFileSync(path.join(dir, file), 'utf8').split(/\s+/).filter(Boolean).length;
  const total = files.reduce((sum, file) => sum + words(file), 0);
  const of = (file) => (files.includes(file) ? words(file) : 0);
  return {
    planWords: total,
    proposalWords: of('proposal.md'),
    tasksWords: of('tasks.md'),
    specWords: files.filter((file) => file.startsWith('specs')).reduce((sum, file) => sum + words(file), 0),
  };
}

/** Whether the agent's reply names the folder it wrote the change to. */
function saysWhere(ctx, name) {
  return new RegExp(`openspec/changes/${name}`).test(ctx.result ?? '');
}

/**
 * Traceability and scope observations for a plan: does the proposal say what
 * stays unchanged, and does tasks.md name every requirement the deltas add or
 * change?
 */
function planTrace(ctx, name) {
  const proposal = ctx.read(`openspec/changes/${name}/proposal.md`) ?? '';
  const tasks = (ctx.read(`openspec/changes/${name}/tasks.md`) ?? '').toLowerCase();
  // A requirement counts as cited by its bracketed ID when it has one, by name otherwise.
  const refs = deltaSpecs(ctx, name).flatMap((spec) =>
    [...spec.text.matchAll(/^### Requirement: (?:\[([^\]]+)\] )?(.+)$/gm)].map((m) => (m[1] ?? m[2]).trim().toLowerCase())
  );
  return {
    namesUnchanged: /unchanged|stays? the same|keeps? working|must not change|won't change|will not change|no change to|not change/i.test(proposal),
    tasksNameRequirements: refs.length > 0 && refs.every((ref) => tasks.includes(ref)),
  };
}

/** Whether the project's tests are named after the given scenarios. */
function testsNameScenarios(ctx, scenarios) {
  const tests = (ctx.read('test/todo.test.js') ?? '').toLowerCase();
  return scenarios.every((scenario) => tests.includes(scenario.toLowerCase()));
}

/** Whether a finished change reached the main specs: synced or archived. */
function closure(ctx, name, requirement) {
  const archived = fs.existsSync(path.join(ctx.root, 'openspec/changes/archive')) &&
    fs.readdirSync(path.join(ctx.root, 'openspec/changes/archive')).some((dir) => dir.endsWith(name));
  const synced = new RegExp(`### Requirement: ${requirement}`).test(ctx.read('openspec/specs/todo-list/spec.md') ?? '');
  return {
    specsCurrent: synced,
    changeArchived: archived,
  };
}

/** A second capability, todo-export, whose "every field" promise a new todo field ripples into. */
/** An archived change whose design decided todos are never written to disk. */
function seedEarlierDecision(root) {
  const dir = path.join(root, 'openspec/changes/archive/2026-09-01-keep-todos-in-memory');
  fs.mkdirSync(path.join(dir, 'specs/todo-list'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'proposal.md'), `## Why

Callers asked whether the list saves anything. It should not; persistence belongs to the caller.

## What Changes

- The todo-list spec says the list lives in memory only.

## Capabilities

### Modified Capabilities
- \`todo-list\`: states that todos live in memory only.
`);
  fs.writeFileSync(path.join(dir, 'design.md'), `## Decisions

### Todos live in memory only; the library never touches the file system

The library is used in browsers and in tests, where file access is unavailable or unwanted. Callers that need persistence serialize \`items()\` themselves.

Rejected: an optional \`save(path)\`, because it pulls Node's \`fs\` into every bundle.
`);
  fs.writeFileSync(path.join(dir, 'tasks.md'), '## 1. Spec\n\n- [x] 1.1 State in the spec that todos live in memory only\n');
  fs.writeFileSync(path.join(dir, 'specs/todo-list/spec.md'), `## MODIFIED Requirements

### Requirement: Reading todos
The list SHALL return copies of every todo in the order they were added.
`);
}

function seedExportSpec(root) {
  fs.mkdirSync(path.join(root, 'openspec/specs/todo-export'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'openspec/specs/todo-export/spec.md'),
    `# todo-export Specification

## Purpose
Callers can export the whole todo list as JSON to back it up or move it elsewhere.

## Requirements
### Requirement: Exporting every field
The list SHALL export every todo as a JSON object containing every field the todo has, in the order the todos were added.

#### Scenario: Export round-trips
- **WHEN** a caller exports a list and parses the result
- **THEN** each parsed object has exactly the fields of the matching todo, with the same values

#### Scenario: Empty list
- **WHEN** a caller exports an empty list
- **THEN** the result is an empty JSON array
`
  );
  const src = path.join(root, 'src/todo.js');
  fs.writeFileSync(
    src,
    fs.readFileSync(src, 'utf8').replace(
      '  items() {',
      `  exportJson() {
return JSON.stringify(this.#items.map((item) => ({ id: item.id, title: item.title, done: item.done })));
  }

  items() {`
    )
  );
}

/**
 * An active change that MODIFIES "Completing a todo" so completing toggles.
 * Written against the spec as it was; `staleBase` makes the main spec gain a
 * sentence afterwards, the #2129 case.
 */
function seedReopenChange(root, { staleBase = false } = {}) {
  const change = path.join(root, 'openspec/changes/allow-reopen');
  fs.mkdirSync(path.join(change, 'specs/todo-list'), { recursive: true });
  fs.writeFileSync(path.join(change, '.openspec.yaml'), 'schema: spec-driven\ncreated: 2026-10-01\n');
  fs.writeFileSync(
    path.join(change, 'proposal.md'),
    "## Why\n\nCallers need to undo a completion when they tick the wrong todo.\n\n## What Changes\n\n- Completing a done todo again reopens it.\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n- `todo-list`: completing a todo toggles it.\n\n## Impact\n\n- `src/todo.js`\n"
  );
  fs.writeFileSync(
    path.join(change, 'specs/todo-list/spec.md'),
    "## MODIFIED Requirements\n\n### Requirement: Completing a todo\nThe list SHALL toggle an existing todo between done and not done by id.\n\n#### Scenario: Known id\n- **WHEN** a caller completes a todo by its id\n- **THEN** that todo's `done` flips\n\n#### Scenario: Unknown id\n- **WHEN** a caller completes an id that does not exist\n- **THEN** the list throws an error naming the id\n"
  );
  fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Toggle\n\n- [x] 1.1 Make complete() toggle `done`; verify with a test\n');
  if (staleBase) {
    const main = path.join(root, 'openspec/specs/todo-list/spec.md');
    fs.writeFileSync(
      main,
      fs.readFileSync(main, 'utf8').replace(
        'The list SHALL mark an existing todo as done by id.',
        'The list SHALL mark an existing todo as done by id and record when it was completed in `completedAt`.'
      )
    );
  }
}

export const SCENARIOS = [
  {
    id: 'propose',
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      // #1968: does the plan end by bringing the main specs up to date?
      const groups = (ctx.read(`openspec/changes/${name}/tasks.md`) ?? '').split(/^## /m);
      return {
        ...specQuality(ctx, name),
        ...planSize(ctx, name),
        tasksEndWithSpecSync: /\b(sync|merge|update)\b[^\n]*\bspecs?\b/i.test(groups.at(-1) ?? ''),
        saysWhere: saysWhere(ctx, name),
        ...planTrace(ctx, name),
      };
    },
    prompt:
      '/openspec-propose Todos need an optional due date, and callers need a way to list the todos that are overdue.' + AUTONOMOUS,
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const name = names[0];
      const results = [
        { name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') },
      ];
      if (!name) return results;
      const status = ctx.openspecJson(['status', '--change', name, '--json']);
      const artifacts = status?.artifacts ?? [];
      const missing = artifacts.filter((a) => a.status !== 'done').map((a) => a.id);
      results.push({
        name: 'every artifact written',
        pass: artifacts.length > 0 && missing.length === 0,
        detail: missing.join(', '),
      });
      const validate = ctx.openspec(['validate', name, '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      const delta = ctx.read(`openspec/changes/${name}/specs/todo-list/spec.md`);
      results.push({
        name: 'delta targets the existing todo-list capability',
        pass: Boolean(delta && /## (ADDED|MODIFIED) Requirements/.test(delta)),
      });
      results.push(onlyOpenspecChanged(ctx));
      return results;
    },
  },
  {
    id: 'apply',
    setup: (root) => seedChange(root, 'add-priority'),
    metrics: (ctx) => ({
      ...closure(ctx, 'add-priority', 'Todo priority'),
      testsNameScenarios: testsNameScenarios(ctx, ['Default priority', 'Explicit priority', 'Unknown priority']),
    }),
    prompt: '/openspec-apply-change add-priority.' + AUTONOMOUS,
    checks: (ctx) => {
      const { open, done } = tasksDone(ctx, 'add-priority');
      const tests = ctx.run('node', ['--test']);
      const src = ctx.read('src/todo.js') ?? '';
      return [
        { name: 'every task checked off', pass: open === 0 && done === 3, detail: `open=${open} done=${done}` },
        { name: 'project tests pass', pass: tests.code === 0, detail: tests.out.slice(-300) },
        { name: 'PRIORITIES exported', pass: /export\s+(const|let)\s+PRIORITIES/.test(src) },
        {
          name: 'tests cover priority',
          pass: /priority/i.test(ctx.read('test/todo.test.js') ?? ''),
        },
      ];
    },
  },
  {
    // #1968: tasks.md ends with the spec sync the default guidance now asks
    // for, so finishing the work also updates the specs. Archive is not a task
    // (it could never be checked off first, #1790); apply offers it at the end.
    id: 'apply-task-driven',
    setup: (root) => {
      seedChange(root, 'add-priority');
      fs.appendFileSync(
        path.join(root, 'openspec/changes/add-priority/tasks.md'),
        '\n## 2. Update the specs\n\n- [ ] 2.1 Sync this change\'s delta specs into the main specs and verify `openspec validate --specs` passes\n'
      );
    },
    prompt: '/openspec-apply-change add-priority.' + AUTONOMOUS,
    metrics: (ctx) => closure(ctx, 'add-priority', 'Todo priority'),
    checks: (ctx) => {
      const tests = ctx.run('node', ['--test']);
      const validate = ctx.openspec(['validate', '--specs', '--strict']);
      return [
        { name: 'project tests pass', pass: tests.code === 0, detail: tests.out.slice(-300) },
        { name: 'main specs validate (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
      ];
    },
  },
  {
    id: 'verify',
    setup: (root) => {
      seedChange(root, 'add-priority');
      // Tasks claim done, but the implementation never rejects unknown priorities.
      const tasks = path.join(root, 'openspec/changes/add-priority/tasks.md');
      fs.writeFileSync(tasks, fs.readFileSync(tasks, 'utf8').replaceAll('- [ ]', '- [x]'));
      const src = path.join(root, 'src/todo.js');
      fs.writeFileSync(
        src,
        fs
          .readFileSync(src, 'utf8')
          .replace('export class TodoList {', "export const PRIORITIES = ['low', 'normal', 'high'];\n\nexport class TodoList {")
          .replace('  add(title) {', "  add(title, { priority = 'normal' } = {}) {")
          .replace('done: false };', 'done: false, priority };')
      );
    },
    prompt: '/openspec-verify-change add-priority',
    // Whether the report hands its critical issues back to apply as tasks.
    metrics: (ctx) => ({ offersTasks: /\b(add|turn|record)\b[^.\n]{0,80}\btasks?\b/i.test(ctx.result) }),
    checks: (ctx) => [
      {
        name: 'reports the missing rejection of unknown priorities',
        pass: /(reject|unknown|invalid|urgent|allowed)/i.test(ctx.result) && /(1\.2|not implemented|missing|no (check|validation)|does not|doesn't|isn't|is not|never|gap|critical|fail)/i.test(ctx.result),
      },
      { ...nothingChanged(ctx), name: 'verify is read-only' },
    ],
  },
  {
    id: 'sync',
    setup: (root) => {
      seedChange(root, 'add-clear-completed');
      applyClearCompleted(root);
    },
    prompt: '/openspec-sync-specs add-clear-completed.' + AUTONOMOUS,
    checks: (ctx) => {
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      const validate = ctx.openspec(['validate', '--specs', '--strict']);
      return [
        { name: 'main spec gains the requirement', pass: /### Requirement: Clearing completed todos/.test(main) },
        { name: 'existing requirements kept', pass: /### Requirement: Adding a todo/.test(main) && /### Requirement: Reading todos/.test(main) },
        { name: 'no delta headers left in main spec', pass: !/## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements/.test(main) },
        { name: 'main specs validate (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'change not archived', pass: ctx.exists('openspec/changes/add-clear-completed/proposal.md') },
      ];
    },
  },
  {
    id: 'archive',
    setup: (root) => {
      seedChange(root, 'add-clear-completed');
      applyClearCompleted(root);
    },
    prompt: '/openspec-archive-change add-clear-completed. It is finished, so sync the specs and archive it.' + AUTONOMOUS,
    checks: (ctx) => {
      const archiveDir = path.join(ctx.root, 'openspec/changes/archive');
      const archived = fs.existsSync(archiveDir)
        ? fs.readdirSync(archiveDir).filter((name) => name.endsWith('add-clear-completed'))
        : [];
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      const validate = ctx.openspec(['validate', '--all', '--strict']);
      return [
        { name: 'change moved to the archive', pass: archived.length === 1 && !ctx.exists('openspec/changes/add-clear-completed') },
        { name: 'main spec gains the requirement', pass: /### Requirement: Clearing completed todos/.test(main) },
        { name: 'everything validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'no source files changed', pass: ctx.changedFiles().every((file) => file.startsWith('openspec/')) },
      ];
    },
  },
  {
    // A code comment cites the change's folder, which archiving moves.
    id: 'archive-cited',
    setup: (root) => {
      seedChange(root, 'add-clear-completed');
      applyClearCompleted(root);
      const src = path.join(root, 'src/todo.js');
      fs.writeFileSync(src, `// Clearing rules: openspec/changes/add-clear-completed/proposal.md\n${fs.readFileSync(src, 'utf8')}`);
    },
    prompt: '/openspec-archive-change add-clear-completed. It is finished, so sync the specs and archive it.' + AUTONOMOUS,
    metrics: (ctx) => ({
      flagsStaleCitation:
        /todo\.js/.test(ctx.result) || !/openspec\/changes\/add-clear-completed\//.test(ctx.read('src/todo.js') ?? ''),
    }),
    checks: (ctx) => {
      const archiveDir = path.join(ctx.root, 'openspec/changes/archive');
      const archived = fs.existsSync(archiveDir)
        ? fs.readdirSync(archiveDir).filter((name) => name.endsWith('add-clear-completed'))
        : [];
      const validate = ctx.openspec(['validate', '--all', '--strict']);
      const tests = ctx.run('node', ['--test']);
      return [
        { name: 'change moved to the archive', pass: archived.length === 1 && !ctx.exists('openspec/changes/add-clear-completed') },
        { name: 'everything validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'project tests pass', pass: tests.code === 0, detail: tests.out.slice(-300) },
      ];
    },
  },
  {
    // An archived change decided todos stay in memory; the request reverses it.
    id: 'propose-earlier-decision',
    setup: seedEarlierDecision,
    prompt: '/openspec-propose Save todos to a JSON file so they survive a restart.' + AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const plan = ['proposal.md', 'design.md'].map((file) => ctx.read(`openspec/changes/${name}/${file}`) ?? '').join('\n');
      return {
        ...specQuality(ctx, name),
        namesEarlierDecision: /in[- ]memory|keep-todos-in-memory|earlier decision|previous(ly)? decid|revers|overrid|supersed/i.test(plan),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      results.push(onlyOpenspecChanged(ctx));
      return results;
    },
  },
  {
    // Unfinished work: archiving must stop and ask, never archive on its own.
    id: 'archive-unfinished',
    setup: (root) => seedChange(root, 'add-priority'),
    prompt: '/openspec-archive-change add-priority',
    checks: (ctx) => [
      { name: 'change is not archived', pass: ctx.exists('openspec/changes/add-priority/proposal.md') },
      { name: 'main spec unchanged', pass: !/Todo priority/.test(ctx.read('openspec/specs/todo-list/spec.md') ?? '') },
      { name: 'warns about the incomplete tasks', pass: UNFINISHED_TASKS.test(ctx.result) },
    ],
  },
  {
    // The audit of real proposal sessions: most never opened the existing
    // specs, so they missed requirements the change ripples into. Here an
    // export spec promises "every field of every todo", which a new due date
    // changes. Only a proposal that reads the specs (or code closely) updates it.
    id: 'propose-ripple',
    setup: seedExportSpec,
    prompt: '/openspec-propose Todos need an optional due date.' + AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      return {
        updatesExportSpec: deltaSpecs(ctx, name).some((spec) => spec.file.startsWith('todo-export')),
        ...specQuality(ctx, name),
        ...planTrace(ctx, name),
        usesExistingCapability: deltaSpecs(ctx, name).every((spec) => /^todo-(list|export)/.test(spec.file)),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'a change was created', pass: names.length === 1, detail: names.join(', ') }];
      if (names[0]) {
        const validate = ctx.openspec(['validate', names[0], '--strict']);
        results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      }
      results.push(onlyOpenspecChanged(ctx));
      return results;
    },
  },
  {
    // Continue writes the next artifact, and only that one, from an existing proposal.
    id: 'continue-specs',
    setup: (root) => {
      seedChange(root, 'add-priority');
      const change = path.join(root, 'openspec/changes/add-priority');
      for (const file of ['specs', 'design.md', 'tasks.md']) fs.rmSync(path.join(change, file), { recursive: true, force: true });
    },
    prompt: '/openspec-continue-change add-priority.' + AUTONOMOUS,
    metrics: (ctx) => specQuality(ctx, 'add-priority'),
    checks: (ctx) => {
      const validate = ctx.openspec(['validate', 'add-priority', '--strict']);
      return [
        { name: 'specs written', pass: deltaSpecs(ctx, 'add-priority').length > 0 },
        {
          name: 'only one artifact written',
          pass: !ctx.exists('openspec/changes/add-priority/design.md') && !ctx.exists('openspec/changes/add-priority/tasks.md'),
        },
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        onlyOpenspecChanged(ctx),
      ];
    },
  },
  {
    // Update revises a finished plan when a new need ripples into a second capability.
    id: 'update-ripple',
    setup: (root) => {
      seedChange(root, 'add-priority');
      seedExportSpec(root);
    },
    prompt: '/openspec-update-change add-priority Callers now need each todo\'s priority in the JSON export too.' + AUTONOMOUS,
    metrics: (ctx) => ({
      ...specQuality(ctx, 'add-priority'),
      updatesExportSpec: deltaSpecs(ctx, 'add-priority').some((spec) => spec.file.startsWith('todo-export')),
      usesExistingCapability: deltaSpecs(ctx, 'add-priority').every((spec) => /^todo-(list|export)/.test(spec.file)),
    }),
    checks: (ctx) => {
      const validate = ctx.openspec(['validate', 'add-priority', '--strict']);
      const tasks = ctx.read('openspec/changes/add-priority/tasks.md') ?? '';
      return [
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'tasks mention the export', pass: /export/i.test(tasks) },
        onlyOpenspecChanged(ctx),
      ];
    },
  },
  {
    // The request contradicts an existing requirement (completing an unknown id
    // throws today). Reading the spec shows it; a good plan changes that
    // requirement by its exact name instead of adding a second, conflicting one.
    id: 'propose-conflict',
    prompt: '/openspec-propose Completing a todo id that does not exist should quietly do nothing instead of failing.' + AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const proposal = ctx.read(`openspec/changes/${name}/proposal.md`) ?? '';
      return {
        ...specQuality(ctx, name),
        namesTodayBehavior: /throw|error|fail/i.test(proposal),
        marksBreaking: /BREAKING/.test(proposal),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const delta = deltaSpecs(ctx, names[0]).map((spec) => spec.text).join('\n');
      const added = delta.split(/^## /m).find((section) => section.startsWith('ADDED')) ?? '';
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      results.push(
        { name: 'modifies "Completing a todo" by its exact name', pass: /## MODIFIED Requirements[\s\S]*### Requirement: Completing a todo\s*$/m.test(delta) },
        { name: 'adds no second requirement for unknown ids', pass: !/unknown|does not exist|missing/i.test(added) },
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // Half specified already: "Reading todos" promises copies; what adding and
    // completing return is not covered. A good plan extends what exists and
    // never adds a requirement that repeats the "Reading todos" promise.
    id: 'propose-duplicate',
    prompt: '/openspec-propose Callers should not be able to change the stored todos through the items they get back.' + AUTONOMOUS,
    metrics: (ctx) => {
      const deltas = newChangeNames(ctx).flatMap((name) => deltaSpecs(ctx, name)).map((spec) => spec.text).join('\n');
      return { createdChange: newChangeNames(ctx).length > 0, extendsExisting: /## MODIFIED Requirements/.test(deltas) };
    },
    checks: (ctx) => {
      const added = newChangeNames(ctx)
        .flatMap((name) => deltaSpecs(ctx, name))
        .map((spec) => spec.text.split(/^## /m).find((section) => section.startsWith('ADDED')) ?? '')
        .join('\n');
      // A new scenario about items read from the list restates "Reading todos".
      const repeats = added.split(/^#### Scenario:/m).slice(1).some((scenario) => /\bread\b|\breading\b|items\(\)/i.test(scenario.split('\n')[0]));
      const validate = ctx.openspec(['validate', '--all', '--strict']);
      return [
        { name: 'repeats no existing requirement', pass: !repeats, detail: added.slice(0, 300) },
        { name: 'everything validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        onlyOpenspecChanged(ctx),
      ];
    },
  },
  {
    // A proposal written through new + continue, the path without propose's
    // own read-the-specs step.
    id: 'continue-proposal',
    setup: (root) => {
      const change = path.join(root, 'openspec/changes/add-due-dates');
      fs.mkdirSync(change, { recursive: true });
      fs.writeFileSync(path.join(change, '.openspec.yaml'), 'schema: spec-driven\ncreated: 2026-10-27\n');
    },
    prompt: '/openspec-continue-change add-due-dates. The change: todos get an optional due date, and callers can list the overdue ones.' + AUTONOMOUS,
    metrics: (ctx) => {
      const proposal = ctx.read('openspec/changes/add-due-dates/proposal.md') ?? '';
      return { namesExistingCapability: /todo-list/.test(proposal) };
    },
    checks: (ctx) => [
      { name: 'proposal written', pass: ctx.exists('openspec/changes/add-due-dates/proposal.md') },
      { name: 'only the proposal written', pass: !ctx.exists('openspec/changes/add-due-dates/specs') && !ctx.exists('openspec/changes/add-due-dates/tasks.md') },
      onlyOpenspecChanged(ctx),
    ],
  },
  {
    // Another open change already modifies the requirement this request touches
    // (#1669). A good plan names that change and how the two fit together.
    id: 'propose-overlap',
    setup: (root) => seedReopenChange(root),
    prompt: '/openspec-propose Completing a todo id that does not exist should quietly do nothing instead of failing.' + AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx).find((n) => n !== 'allow-reopen');
      const proposal = name ? ctx.read(`openspec/changes/${name}/proposal.md`) ?? '' : '';
      return { namesOverlap: /allow-reopen/.test(proposal) || /allow-reopen/.test(ctx.result ?? '') };
    },
    checks: (ctx) => {
      const fresh = newChangeNames(ctx).filter((n) => n !== 'allow-reopen');
      const results = [{ name: 'exactly one new change created', pass: fresh.length === 1, detail: fresh.join(', ') }];
      if (fresh.length !== 1) return results;
      const validate = ctx.openspec(['validate', fresh[0], '--strict']);
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'the other change is untouched', pass: !ctx.changedFiles().some((f) => f.startsWith('openspec/changes/allow-reopen/')) },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // The main spec gained a sentence after the change's MODIFIED block was
    // written (#2129). Archiving as-is would silently drop it.
    id: 'archive-stale',
    setup: (root) => seedReopenChange(root, { staleBase: true }),
    prompt: '/openspec-archive-change allow-reopen. It is finished, so sync the specs and archive it.' + AUTONOMOUS,
    metrics: (ctx) => ({ mentionsDrift: /completedAt/.test(ctx.result ?? '') }),
    checks: (ctx) => {
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      const archiveDir = path.join(ctx.root, 'openspec/changes/archive');
      const archived = fs.existsSync(archiveDir) && fs.readdirSync(archiveDir).some((name) => name.endsWith('allow-reopen'));
      return [
        // Either keep the newer sentence while merging, or stop and say why.
        { name: 'the newer main-spec wording survives', pass: /completedAt/.test(main) || (!archived && /completedAt/.test(ctx.result ?? '')) },
        { name: 'no source files changed', pass: ctx.changedFiles().every((file) => file.startsWith('openspec/')) },
      ];
    },
  },
  {
    // A request in French (#299): the plan is written in French, while the
    // format OpenSpec parses stays as it is, so it still validates.
    id: 'propose-french',
    prompt: "/openspec-propose Les tâches ont besoin d'une date d'échéance facultative, et il faut pouvoir lister celles qui sont en retard. Fais au mieux sans me poser de questions.",
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      const proposal = name ? ctx.read(`openspec/changes/${name}/proposal.md`) ?? '' : '';
      const french = (proposal.match(/\b(les|des|une|est|pour|dans|qui|avec)\b/gi) ?? []).length;
      return { writtenInFrench: french >= 15 };
    },
    checks: (ctx) => SCENARIOS.find((scenario) => scenario.id === 'propose').checks(ctx),
  },
  {
    // The plan's design contradicts its spec (numbers vs low/normal/high), so
    // building forces a decision. A good apply follows the spec and brings the
    // design back in line, saying so.
    id: 'apply-reconcile',
    setup: (root) => {
      seedChange(root, 'add-priority');
      const design = path.join(root, 'openspec/changes/add-priority/design.md');
      fs.writeFileSync(
        design,
        fs.readFileSync(design, 'utf8').replace(
          '- Keep the allowed values in one frozen array, `PRIORITIES`, exported from `src/todo.js`.',
          '- Keep the allowed values in one frozen array, `PRIORITIES`, exported from `src/todo.js`.\n- Store the priority as a number (1 low, 2 normal, 3 high) so todos sort by priority directly.'
        )
      );
    },
    prompt: '/openspec-apply-change add-priority.' + AUTONOMOUS,
    metrics: (ctx) => ({
      designReconciled: !/Store the priority as a number/.test(ctx.read('openspec/changes/add-priority/design.md') ?? ''),
      mentionsDecision: /design/i.test(ctx.result ?? ''),
      testsNameScenarios: testsNameScenarios(ctx, ['Default priority', 'Explicit priority', 'Unknown priority']),
    }),
    checks: (ctx) => {
      const { open } = tasksDone(ctx, 'add-priority');
      const tests = ctx.run('node', ['--test']);
      return [
        { name: 'every task checked off', pass: open === 0, detail: `open=${open}` },
        { name: 'project tests pass', pass: tests.code === 0, detail: tests.out.slice(-300) },
        { name: 'priorities follow the spec', pass: /'normal'/.test(ctx.read('src/todo.js') ?? '') },
      ];
    },
  },
  {
    // The other half of #2139: here the request changes a clause the crowded
    // requirement already promises, so a MODIFIED block is unavoidable and the
    // whole five-SHALL statement has to be copied forward. #2139 reports a
    // 10-word edit producing a 180-word MODIFIED block. Does the agent carry
    // the crowding forward, or split it while it is already in there?
    id: 'propose-crowded-edit',
    setup: (root) => {
      const spec = path.join(root, 'openspec/specs/todo-list/spec.md');
      fs.writeFileSync(
        spec,
        fs.readFileSync(spec, 'utf8').replace(
          'The list SHALL mark an existing todo as done by id.',
          'The list SHALL mark an existing todo as done by id, and SHALL throw an error naming the id when no todo has it, and SHALL leave every other todo untouched, and SHALL return a copy of the updated todo rather than the stored object, and SHALL keep the completed todo in its original position in the list.'
        )
      );
    },
    prompt:
      '/openspec-propose Completed todos should move to the end of the list instead of staying where they were, so the open ones are read first.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const text = deltaSpecs(ctx, name).map((spec) => spec.text).join('\n');
      const completing = requirementBlocks(text).filter((block) =>
        /^\s*(\[[^\]]+\]\s*)?Completing a todo/.test(block)
      );
      const statement = (block) => block.split(/^#### Scenario:/m)[0];
      const shalls = (block) => (statement(block).match(/\bSHALL\b/g) ?? []).length;
      return {
        ...specQuality(ctx, name),
        modifiedTheRequirement: /## MODIFIED Requirements/.test(text) && completing.length > 0,
        // Did it come back smaller than the five SHALLs it had to copy forward?
        splitWhileEditing: completing.length > 0 && completing.every((block) => shalls(block) <= 2),
        shallsCarriedForward: completing.length > 0 ? Math.max(...completing.map(shalls)) : 0,
        modifiedStatementWords:
          completing.length > 0 ? Math.max(...completing.map((block) => statement(block).split(/\s+/).filter(Boolean).length)) : 0,
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const text = deltaSpecs(ctx, names[0]).map((spec) => spec.text).join('\n');
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        // The promise that moves is an existing one, so it has to be modified,
        // not restated as a second requirement beside it.
        { name: 'the existing requirement is modified, not duplicated', pass: /## MODIFIED Requirements/.test(text) },
        // Any wording for the new order counts, including moving the promise
        // into "Reading todos" as open-then-completed grouping.
        {
          name: 'the new ordering is specified',
          pass: /end of the list|at the end|last|append|open .{0,30}first|before .{0,20}completed|after .{0,20}(open|incomplete)/i.test(text),
        },
        // The same floor `propose-crowded-spec` holds: a MODIFIED block copies
        // the statement, so it must not come back with more promises than the
        // five it started with.
        {
          name: 'no more crowded than it was',
          pass: Math.max(0, ...requirementBlocks(text).map((block) => (block.split(/^#### Scenario:/m)[0].match(/\bSHALL\b/g) ?? []).length)) <= 5,
        },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // Nothing in the skills or the guides says how a non-functional need is
    // specified. A budget ("under 50ms", "10k todos") is a real promise and
    // belongs in a requirement, but only if it is stated so a test can check
    // it. The failures are the two ends: dropping it from the specs and
    // leaving it in prose, or writing it as an untestable adjective ("fast",
    // "scalable", "performant").
    id: 'propose-nonfunctional',
    prompt:
      '/openspec-propose Callers are loading lists of 10,000 todos and `items()` has become the slow part of their render. Plan a change so reading the list stays under 50ms at that size, and keep it from regressing.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const deltas = deltaSpecs(ctx, name).map((spec) => spec.text).join('\n');
      const blocks = requirementBlocks(deltas);
      // The block starts with the heading text, which is not the promise: a
      // requirement may be *named* "Reading a large list is fast" and still
      // state an exact threshold. Judge the statement, not the name.
      const statement = (block) => block.split(/^#### Scenario:/m)[0].split('\n').slice(1).join('\n');
      return {
        ...specQuality(ctx, name),
        ...planSize(ctx, name),
        // The budget reaches the spec, not just the proposal.
        budgetInSpec: BUDGET.test(deltas),
        // ...and it is a number a test can check, in a scenario.
        budgetInScenario: blocks.some((block) => BUDGET.test(block.split(/^#### Scenario:/m).slice(1).join('\n'))),
        // The failure mode: an adjective in place of a threshold, with no
        // number anywhere in the statement.
        vagueAdjective: blocks.some(
          (block) => /\b(fast|performant|scalable|efficient|snappy|responsive)\b/i.test(statement(block)) && !BUDGET.test(statement(block))
        ),
        // The crowding cross-check: today's skills tend to bolt the budget on
        // to the existing "Reading todos" promise.
        maxShallsInOneRequirement: Math.max(0, ...blocks.map((block) => (statement(block).match(/\bSHALL\b/g) ?? []).length)),
        // Does the plan keep it from regressing, as asked?
        hasRegressionGuard: /benchmark|perf|regress|budget|threshold|timing/i.test(ctx.read(`openspec/changes/${name}/tasks.md`) ?? ''),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      const deltas = deltaSpecs(ctx, names[0]).map((spec) => spec.text).join('\n');
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        // A performance promise callers rely on belongs in the spec, not only
        // in the proposal's prose.
        { name: 'the budget is specified, not just described', pass: BUDGET.test(deltas) },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // `capabilities.md` has shipped since the beta began and has never been
    // measured. The request needs a capability the fixture does not have, so
    // a new one must be named: the guide asks for the behavior ("todo-export"),
    // not the work ("add-csv-export") and not a catch-all ("misc", "core").
    id: 'propose-new-capability',
    prompt:
      '/openspec-propose Finance need the whole todo list as a CSV file they can open in a spreadsheet, including whether each todo is done.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const dirs = deltaSpecs(ctx, name).map((spec) => spec.file.split('/')[0]);
      const fresh = dirs.filter((dir) => dir !== 'todo-list');
      // Named for the work rather than the behavior, or a catch-all with no boundary.
      const worksy = /^(add|create|update|new|improve|fix|enhance|implement|support)-/;
      const catchAll = /^(misc|core|common|util|utils|shared|general|improvements|features?)$/;
      return {
        ...planSize(ctx, name),
        reusedTodoList: dirs.includes('todo-list'),
        createdCapability: fresh.length > 0,
        capabilityNames: [...new Set(dirs)].join(' '),
        namedForTheWork: fresh.some((dir) => worksy.test(dir)),
        catchAllName: fresh.some((dir) => catchAll.test(dir)),
        kebabCase: fresh.every((dir) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(dir)),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      const dirs = deltaSpecs(ctx, names[0]).map((spec) => spec.file.split('/')[0]);
      const fresh = dirs.filter((dir) => dir !== 'todo-list');
      const worksy = /^(add|create|update|new|improve|fix|enhance|implement|support)-/;
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'the export behavior is specified', pass: /csv/i.test(deltaSpecs(ctx, names[0]).map((spec) => spec.text).join('\n')) },
        // Capabilities outlive the change that adds them, so a name that
        // describes the work is wrong the moment the change is archived.
        {
          name: 'no capability named for the work',
          pass: !fresh.some((dir) => worksy.test(dir)),
          detail: fresh.join(', '),
        },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // #2139: requirements grow because agents copy the shape of the specs
    // around them. The seeded spec has one requirement carrying five SHALLs,
    // and the request changes that very promise. The pull is to append a sixth.
    // Leaving it no more crowded than you found it is the floor; splitting it
    // while you are already editing it is the win.
    id: 'propose-crowded-spec',
    setup: (root) => {
      const spec = path.join(root, 'openspec/specs/todo-list/spec.md');
      fs.writeFileSync(
        spec,
        fs.readFileSync(spec, 'utf8').replace(
          'The list SHALL mark an existing todo as done by id.',
          'The list SHALL mark an existing todo as done by id, and SHALL throw an error naming the id when no todo has it, and SHALL leave every other todo untouched, and SHALL return a copy of the updated todo rather than the stored object, and SHALL keep the completed todo in its original position in the list.'
        )
      );
    },
    prompt:
      '/openspec-propose Completing a todo should also record when it happened, in a `completedAt` timestamp, and callers need a way to list the todos completed today.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const blocks = deltaSpecs(ctx, name).flatMap((spec) => requirementBlocks(spec.text));
      const statement = (block) => block.split(/^#### Scenario:/m)[0];
      const shalls = (block) => (statement(block).match(/\bSHALL\b/g) ?? []).length;
      const counts = blocks.map(shalls);
      const completing = blocks.filter((block) => /^\s*(\[[^\]]+\]\s*)?Completing a todo/.test(block));
      return {
        ...specQuality(ctx, name),
        // Both only mean something when the delta touches the crowded
        // requirement at all; a plan that adds a new promise instead never does.
        touchedCrowdedRequirement: completing.length > 0,
        splitTheCrowdedRequirement: completing.length > 0 && completing.every((block) => shalls(block) <= 2),
        maxShallsInOneRequirement: counts.length > 0 ? Math.max(...counts) : 0,
        requirementsInDelta: blocks.length,
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      const blocks = deltaSpecs(ctx, names[0]).flatMap((spec) => requirementBlocks(spec.text));
      const statement = (block) => block.split(/^#### Scenario:/m)[0];
      const worst = Math.max(0, ...blocks.map((block) => (statement(block).match(/\bSHALL\b/g) ?? []).length));
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        { name: 'the delta covers the new behavior', pass: blocks.length > 0 && /completedAt/.test(deltaSpecs(ctx, names[0]).map((spec) => spec.text).join('\n')) },
        // Never leave a requirement more crowded than the five SHALLs it found.
        { name: 'no requirement left more crowded than it was', pass: worst <= 5, detail: `maxShalls=${worst}` },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // A pure internal refactor: no caller-visible behavior changes, so there is
    // no requirement to write. The judgment the plan has to make up front is
    // the one apply already makes (#2170): declare `skip_specs: true`, or
    // invent a requirement and leave a change `openspec validate` rejects.
    id: 'propose-refactor',
    prompt:
      '/openspec-propose The id lookup in `complete()` is inline and will be repeated by the next method that takes an id. Plan a refactor that extracts it into a private helper. Nothing callers can observe changes.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const yaml = ctx.read(`openspec/changes/${name}/.openspec.yaml`) ?? '';
      return {
        declaredSkipSpecs: /skip_specs:\s*true/.test(yaml),
        inventedRequirement: deltaSpecs(ctx, name).some((spec) => /## (ADDED|MODIFIED) Requirements/.test(spec.text)),
        skipsDesign: !ctx.exists(`openspec/changes/${name}/design.md`),
        toldTheUser: /skip_specs|no spec|without a spec|no requirement|no behaviou?r change/i.test(ctx.result ?? ''),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      // No deltas and a passing `validate` means the change declared
      // `skip_specs`; deltas mean a requirement was invented for a refactor.
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        {
          name: 'no invented requirement',
          pass: deltaSpecs(ctx, names[0]).length === 0,
          detail: deltaSpecs(ctx, names[0]).map((spec) => spec.file).join(', '),
        },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // A bug where the code drifted from a spec that is already right. A good
    // plan stays small: no new or changed requirement, no design unless needed.
    id: 'propose-bugfix',
    setup: (root) => {
      const src = path.join(root, 'src/todo.js');
      fs.writeFileSync(src, fs.readFileSync(src, 'utf8').replace(/throw new Error\(`no todo with id \$\{id\}`\);/, 'return undefined;'));
    },
    prompt: '/openspec-propose Bug: completing a todo id that does not exist no longer throws, though our spec says it should. Plan the fix.' + AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const dir = path.join(ctx.root, 'openspec/changes', name);
      const words = fs.readdirSync(dir, { recursive: true })
        .filter((f) => String(f).endsWith('.md'))
        .reduce((n, f) => n + fs.readFileSync(path.join(dir, String(f)), 'utf8').split(/\s+/).length, 0);
      return { smallPlan: words <= 450, skipsDesign: !ctx.exists(`openspec/changes/${name}/design.md`), noNewRequirement: !deltaSpecs(ctx, name).some((spec) => /## ADDED Requirements/.test(spec.text)) };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) }, onlyOpenspecChanged(ctx));
      return results;
    },
  },
  {
    // The same judgment from the other side: a request worded as a clean-up
    // that does change a promised behavior (the spec says an unknown id
    // throws). The answer is a MODIFIED delta, not `skip_specs` - the error a
    // gate that trusts the request's wording would make.
    id: 'propose-tidy-up',
    prompt:
      '/openspec-propose Tidy up `complete()`: pull the id lookup into a private helper, and while you are in there have `complete()` return undefined for an unknown id instead of throwing, so callers can just check the result. Small internal clean-up.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      const yaml = ctx.read(`openspec/changes/${name}/.openspec.yaml`) ?? '';
      const deltas = deltaSpecs(ctx, name).map((spec) => spec.text).join('\n');
      return {
        declaredSkipSpecs: /skip_specs:\s*true/.test(yaml),
        modifiesCompleting: /## MODIFIED Requirements/.test(deltas) && /Completing a todo/.test(deltas),
        saysBehaviorChanges: /throw|undefined|behaviou?r|breaking/i.test(ctx.result ?? ''),
      };
    },
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'exactly one change created', pass: names.length === 1, detail: names.join(', ') }];
      if (names.length !== 1) return results;
      const yaml = ctx.read(`openspec/changes/${names[0]}/.openspec.yaml`) ?? '';
      const validate = ctx.openspec(['validate', names[0], '--strict']);
      results.push(
        { name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        {
          name: 'the spec change is planned',
          pass: deltaSpecs(ctx, names[0]).some((spec) => /## MODIFIED Requirements/.test(spec.text)),
          detail: deltaSpecs(ctx, names[0]).map((spec) => spec.file).join(', '),
        },
        { name: 'does not declare skip_specs', pass: !/skip_specs:\s*true/.test(yaml) },
        onlyOpenspecChanged(ctx)
      );
      return results;
    },
  },
  {
    // Tasks but no delta specs and no `skip_specs`, so `openspec validate`
    // rejects the change while apply still reports it ready (#2166). The work
    // is pure tooling, so the judgment call is to declare `skip_specs`, not to
    // invent a requirement. Stopping to ask is fine; building on regardless,
    // and leaving the change invalid, is not.
    id: 'apply-no-specs',
    setup: (root) => {
      const change = path.join(root, 'openspec/changes/add-lint-script');
      fs.mkdirSync(change, { recursive: true });
      fs.writeFileSync(path.join(change, '.openspec.yaml'), 'schema: spec-driven\ncreated: 2026-11-02\n');
      fs.writeFileSync(
        path.join(change, 'proposal.md'),
        '## Why\n\nNothing catches a syntax error before the tests run.\n\n## What Changes\n\n- Add a `lint` npm script that syntax-checks the source. No behavior changes for callers.\n\n## Capabilities\n\n### New Capabilities\n\n### Modified Capabilities\n\n## Impact\n\n- `package.json`\n'
      );
      fs.writeFileSync(
        path.join(change, 'tasks.md'),
        '## 1. Lint script\n\n- [ ] 1.1 Add a `lint` script to `package.json` that runs `node --check src/todo.js`; verify `npm run lint` exits 0\n'
      );
    },
    prompt: '/openspec-apply-change add-lint-script.' + AUTONOMOUS,
    metrics: (ctx) => {
      const yaml = ctx.read('openspec/changes/add-lint-script/.openspec.yaml') ?? '';
      return {
        declaredSkipSpecs: /skip_specs:\s*true/.test(yaml),
        inventedRequirement: deltaSpecs(ctx, 'add-lint-script').length > 0,
        toldTheUser: /skip_specs|delta spec|no spec|validate/i.test(ctx.result ?? ''),
      };
    },
    checks: (ctx) => {
      const { open, done } = tasksDone(ctx, 'add-lint-script');
      const validate = ctx.openspec(['validate', 'add-lint-script', '--strict']);
      const built = /"lint"/.test(ctx.read('package.json') ?? '');
      // Either resolve the gap and build, or stop and leave the work undone.
      // What must never happen: tasks ticked while the change stays invalid.
      return [
        {
          name: 'never reports done while the change fails validate',
          pass: validate.code === 0 || (open > 0 && done === 0),
          detail: `validate=${validate.code} open=${open} done=${done}`,
        },
        { name: 'no invented requirement', pass: deltaSpecs(ctx, 'add-lint-script').length === 0 },
        { name: 'built only what the task asked', pass: built || done === 0, detail: `lintScript=${built}` },
      ];
    },
  },
  {
    // A plain request to tidy a spec, with no skill named: does the agent find
    // OpenSpec's way of changing a spec on its own?
    id: 'natural-spec-edit',
    setup: (root) => {
      const spec = path.join(root, 'openspec/specs/todo-list/spec.md');
      fs.writeFileSync(
        spec,
        fs.readFileSync(spec, 'utf8').replace(
          'The list SHALL return copies of every todo in the order they were added.',
          'The list SHALL, whenever any caller requests the items it holds, provide to that caller duplicated instances (that is, copies rather than the originals) of each and every todo item that is currently held, and these SHALL be arranged in the very same sequence in which they were originally inserted into the list by callers.'
        )
      );
    },
    prompt:
      'We keep OpenSpec specs in this repo. The "Reading todos" requirement in the todo-list spec is hard to read. Rewrite it in plain words without changing what it promises.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      return {
        usedSkill: ctx.skillsUsed.length > 0,
        viaChange: newChangeNames(ctx).length > 0,
        editedMainSpec: ctx.changedFiles().includes('openspec/specs/todo-list/spec.md'),
        mainSpecShorter: !/duplicated instances/.test(main),
      };
    },
    checks: (ctx) => {
      const validate = ctx.openspec(['validate', '--all', '--strict']);
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      const changes = newChangeNames(ctx).map((name) => ctx.read(`openspec/changes/${name}/specs/todo-list/spec.md`) ?? '').join('\n');
      const reworded = [main, changes].some((text) => /### Requirement: Reading todos/.test(text) && !/duplicated instances/.test(text.split('### Requirement: Reading todos')[1] ?? 'duplicated instances'));
      return [
        { name: 'the requirement is reworded (in the spec or a change)', pass: reworded },
        { name: 'its scenario is kept', pass: /Callers cannot mutate the list/.test(main) },
        { name: 'everything validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        onlyOpenspecChanged(ctx),
      ];
    },
  },
  {
    // Two requests in one message, no skill named: the agent picks each skill in turn.
    id: 'multi-intent',
    setup: (root) => {
      seedChange(root, 'add-clear-completed');
      applyClearCompleted(root);
    },
    prompt:
      'We plan changes with OpenSpec in this repo. The add-clear-completed change is finished: archive it. Then plan a new change, without building it: todos need an optional due date.' +
      AUTONOMOUS,
    metrics: (ctx) => ({ skillsUsed: ctx.skillsUsed.join(' '), saysWhere: newChangeNames(ctx).some((name) => saysWhere(ctx, name)) }),
    checks: (ctx) => {
      const archiveDir = path.join(ctx.root, 'openspec/changes/archive');
      const archived = fs.existsSync(archiveDir) && fs.readdirSync(archiveDir).some((name) => name.endsWith('add-clear-completed'));
      const fresh = newChangeNames(ctx).filter((name) => name !== 'add-clear-completed');
      const validate = ctx.openspec(['validate', '--all', '--strict']);
      return [
        { name: 'finished change archived', pass: archived && !ctx.exists('openspec/changes/add-clear-completed') },
        { name: 'main spec gains its requirement', pass: /### Requirement: Clearing completed todos/.test(ctx.read('openspec/specs/todo-list/spec.md') ?? '') },
        { name: 'exactly one new change planned', pass: fresh.length === 1, detail: fresh.join(', ') },
        { name: 'everything validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) },
        onlyOpenspecChanged(ctx),
      ];
    },
  },
  {
    // A request that asks for implementation must still stop after planning.
    id: 'propose-then-stop',
    prompt:
      '/openspec-propose Add a `rename(id, title)` method to the todo list, then go ahead and implement it.' + AUTONOMOUS,
    checks: (ctx) => {
      const names = newChangeNames(ctx);
      const results = [{ name: 'a change was created', pass: names.length === 1, detail: names.join(', ') }];
      if (names[0]) {
        const validate = ctx.openspec(['validate', names[0], '--strict']);
        results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      }
      results.push({ ...onlyOpenspecChanged(ctx), name: 'no code written (planning only)' });
      return results;
    },
  },
  {
    id: 'explore',
    prompt: '/openspec-explore Should due dates be stored as Date objects or ISO strings in this library?',
    checks: (ctx) => [
      { ...nothingChanged(ctx), name: 'explore writes nothing' },
      { name: 'gives an answer', pass: /(iso|date object|string)/i.test(ctx.result) },
    ],
  },
  {
    // Explore as a drafting board: shaping a feature should leave a draft of
    // its scope, capabilities, requirements, and open questions, and write nothing.
    id: 'explore-draft',
    prompt:
      '/openspec-explore I want todos to support due dates and an overdue list. Help me shape the scope before we plan anything.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const fields = ['scope', 'capabilit', 'requirement', 'open question'].filter((field) =>
        ctx.result.toLowerCase().includes(field)
      );
      return {
        producesDraft: fields.length >= 3,
        namesExistingCapability: /todo-list/.test(ctx.result),
      };
    },
    checks: (ctx) => [
      { ...nothingChanged(ctx), name: 'explore writes nothing' },
      { name: 'gives an answer', pass: ctx.result.trim().length > 200 },
    ],
  },
  {
    id: 'no-project',
    init: false,
    prompt: '/openspec-propose Add an optional due date to todos.',
    checks: (ctx) => [
      { name: 'does not create openspec/', pass: !ctx.exists('openspec') },
      { ...nothingChanged(ctx), name: 'writes nothing' },
    ],
  },
  {
    // No slash command: the skill has to be picked from its description alone,
    // the way most people ask. Same bar as propose, plus a skill was used.
    id: 'propose-natural',
    prompt:
      'We plan changes with OpenSpec in this repo. Plan this as an OpenSpec change, without building it: todos need an optional due date, and callers need a way to list the todos that are overdue.' +
      AUTONOMOUS,
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      return name ? { ...specQuality(ctx, name), saysWhere: saysWhere(ctx, name), ...planTrace(ctx, name) } : {};
    },
    checks: (ctx) => [
      { name: 'an OpenSpec skill was used', pass: ctx.skillsUsed.length > 0, detail: ctx.skillsUsed.join(', ') },
      ...SCENARIOS.find((scenario) => scenario.id === 'propose').checks(ctx),
    ],
  },
  {
    // Stable IDs (#2167): a plan writes an ID first in every new requirement
    // and scenario heading, and each design decision as a short `### D1`.
    id: 'propose-ids',
    prompt:
      '/openspec-propose Todos need an optional due date, and callers need a way to list the todos that are overdue.' + AUTONOMOUS,
    metrics: (ctx) => {
      const design = ctx.read(`openspec/changes/${newChangeNames(ctx)[0]}/design.md`) ?? '';
      const decisions = (design.split(/^## /m).find((section) => section.startsWith('Decisions')) ?? '').split(/^### D\d+.*$/m).slice(1);
      // Sentence ends outside code spans, so `a.b` in a span is not a sentence.
      const sentences = (body) => (body.replace(/`[^`]*`/g, 'x').match(/[.!?](\s|$)/g) ?? []).length;
      return {
        designWritten: design.length > 0,
        alternativesSection: /alternatives/i.test(design),
        decisionsWithinTwoSentences: decisions.length > 0 && decisions.every((body) => sentences(body) <= 2),
      };
    },
    checks: (ctx) => {
      const name = newChangeNames(ctx)[0];
      const results = [{ name: 'exactly one change created', pass: newChangeNames(ctx).length === 1 }];
      if (!name) return results;
      // Only headings the plan introduces: an existing heading kept word for
      // word under MODIFIED may stay without an ID.
      const existing = new Set(ctx.read('openspec/specs/todo-list/spec.md')?.match(/^#{3,4} .*$/gm) ?? []);
      const headings = deltaSpecs(ctx, name).flatMap(({ text }) =>
        (text.split(/^## (?:REMOVED|RENAMED) Requirements/m)[0].match(/^#{3,4} (?:Requirement|Scenario): .*$/gm) ?? [])
      ).filter((heading) => !existing.has(heading));
      const missing = headings.filter((heading) => !STABLE_ID.test(heading.replace(/^#{3,4} (?:Requirement|Scenario): /, '')));
      results.push({ name: 'every new requirement and scenario heading starts with an ID', pass: headings.length > 0 && missing.length === 0, detail: missing.join(' | ') });
      const design = ctx.read(`openspec/changes/${name}/design.md`);
      if (design) {
        const decisions = design.split(/^## /m).find((section) => section.startsWith('Decisions')) ?? '';
        const headed = decisions.match(/^### .*$/gm) ?? [];
        results.push({ name: 'design decisions use ### D<n> headings', pass: headed.length > 0 && headed.every((h) => /^### D\d+\b/.test(h)), detail: headed.join(' | ') });
      }
      const validate = ctx.openspec(['validate', name, '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      results.push(onlyOpenspecChanged(ctx));
      return results;
    },
  },
  {
    // A reworded requirement keeps its ID, so archive matches it in place
    // (#1697). Archive's ID matching is #1979: run with a CLI that has it.
    id: 'rename-by-id',
    setup: (root) => {
      const spec = path.join(root, 'openspec/specs/todo-list/spec.md');
      let n = 0;
      let s = 0;
      const text = fs.readFileSync(spec, 'utf8').replace(/^(#{3,4}) (Requirement|Scenario): /gm, (_, hashes, kind) => {
        if (kind === 'Requirement') { n += 1; s = 0; return `${hashes} ${kind}: [TODO-${n}] `; }
        s += 1;
        return `${hashes} ${kind}: [TODO-${n}.${s}] `;
      });
      fs.writeFileSync(spec, text);
    },
    prompt:
      '/openspec-propose Rename the "Reading todos" requirement to "Listing todos", and its "Callers cannot mutate the list" scenario to "Returned todos are copies". The behavior stays the same.' +
      AUTONOMOUS,
    checks: (ctx) => {
      const name = newChangeNames(ctx)[0];
      const results = [{ name: 'exactly one change created', pass: newChangeNames(ctx).length === 1 }];
      if (!name) return results;
      const delta = deltaSpecs(ctx, name).map(({ text }) => text).join('\n');
      results.push({ name: 'the renamed requirement keeps [TODO-3]', pass: /^### Requirement: \[TODO-3\] Listing todos/m.test(delta) });
      results.push({ name: 'the renamed scenario keeps its ID', pass: /^#### Scenario: \[TODO-3\.1\] Returned todos are copies/m.test(delta) });
      const validate = ctx.openspec(['validate', name, '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      const archive = ctx.openspec(['archive', name, '-y']);
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      const order = [...main.matchAll(/^### Requirement: \[(TODO-\d+)\]/gm)].map((m) => m[1]).join(',');
      results.push({ name: 'archive renames it in place', pass: archive.code === 0 && /^### Requirement: \[TODO-3\] Listing todos/m.test(main) && order === 'TODO-1,TODO-2,TODO-3', detail: `${order} ${archive.out.slice(-200)}` });
      return results;
    },
  },
  // A real, larger project: OpenSpec's own repository, with 36 specs and many
  // changes in flight. Run with `--fixture <checkout>`.
  repoPropose({
    id: 'repo-list-sort',
    capability: 'cli-list',
    prompt:
      '/openspec-propose `openspec list` should show the most recently modified changes first, with a `--sort name` option to sort by name instead.' +
      AUTONOMOUS,
  }),
  repoPropose({
    id: 'repo-validate-quiet',
    capability: 'cli-validate',
    prompt:
      '/openspec-propose Add a `--quiet` option to `openspec validate` that prints nothing when everything is valid, and only the problems otherwise.' +
      AUTONOMOUS,
  }),
];

