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
const STABLE_ID = /^(?:\[[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d+(?:\.\d+)*\]|[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+(?:\.\d+)*)(?=\s|$)/;

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
      return name ? specQuality(ctx, name) : {};
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

/** Whether the agent's reply names the folder it wrote the change to. */
function saysWhere(ctx, name) {
  return new RegExp(`openspec/changes/${name}`).test(ctx.result ?? '');
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
        tasksEndWithSpecSync: /\b(sync|merge|update)\b[^\n]*\bspecs?\b/i.test(groups.at(-1) ?? ''),
        saysWhere: saysWhere(ctx, name),
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
    metrics: (ctx) => closure(ctx, 'add-priority', 'Todo priority'),
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
      return name ? { ...specQuality(ctx, name), saysWhere: saysWhere(ctx, name) } : {};
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
      return { designWritten: design.length > 0, alternativesSection: /alternatives/i.test(design) };
    },
    checks: (ctx) => {
      const name = newChangeNames(ctx)[0];
      const results = [{ name: 'exactly one change created', pass: newChangeNames(ctx).length === 1 }];
      if (!name) return results;
      const headings = deltaSpecs(ctx, name).flatMap(({ text }) =>
        (text.split(/^## (?:REMOVED|RENAMED) Requirements/m)[0].match(/^#{3,4} (?:Requirement|Scenario): .*$/gm) ?? [])
      );
      const missing = headings.filter((heading) => !STABLE_ID.test(heading.replace(/^#{3,4} (?:Requirement|Scenario): /, '')));
      results.push({ name: 'every requirement and scenario heading starts with an ID', pass: headings.length > 0 && missing.length === 0, detail: missing.join(' | ') });
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
        if (kind === 'Requirement') { n += 1; s = 0; return `${hashes} ${kind}: TODO-${n} `; }
        s += 1;
        return `${hashes} ${kind}: TODO-${n}.${s} `;
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
      results.push({ name: 'the renamed requirement keeps TODO-3', pass: /^### Requirement: TODO-3 Listing todos/m.test(delta) });
      results.push({ name: 'the renamed scenario keeps its ID', pass: /^#### Scenario: TODO-3\.1 Returned todos are copies/m.test(delta) });
      const validate = ctx.openspec(['validate', name, '--strict']);
      results.push({ name: 'change validates (strict)', pass: validate.code === 0, detail: validate.out.slice(-300) });
      const archive = ctx.openspec(['archive', name, '-y']);
      const main = ctx.read('openspec/specs/todo-list/spec.md') ?? '';
      const order = [...main.matchAll(/^### Requirement: (TODO-\d+)/gm)].map((m) => m[1]).join(',');
      results.push({ name: 'archive renames it in place', pass: archive.code === 0 && /^### Requirement: TODO-3 Listing todos/m.test(main) && order === 'TODO-1,TODO-2,TODO-3', detail: `${order} ${archive.out.slice(-200)}` });
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

