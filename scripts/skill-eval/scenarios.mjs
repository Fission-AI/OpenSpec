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

export const SCENARIOS = [
  {
    id: 'propose',
    metrics: (ctx) => {
      const name = newChangeNames(ctx)[0];
      if (!name) return {};
      // #1968: does the plan end by bringing the main specs up to date?
      const groups = (ctx.read(`openspec/changes/${name}/tasks.md`) ?? '').split(/^## /m);
      return { ...specQuality(ctx, name), tasksEndWithSpecSync: /\bsync\b[^\n]*\bspecs?\b/i.test(groups.at(-1) ?? '') };
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
    setup: (root) => {
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
    },
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
      return name ? specQuality(ctx, name) : {};
    },
    checks: (ctx) => [
      { name: 'an OpenSpec skill was used', pass: ctx.skillsUsed.length > 0, detail: ctx.skillsUsed.join(', ') },
      ...SCENARIOS.find((scenario) => scenario.id === 'propose').checks(ctx),
    ],
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

