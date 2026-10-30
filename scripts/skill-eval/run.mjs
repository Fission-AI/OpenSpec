#!/usr/bin/env node
// Runs every scenario against the skills one OpenSpec checkout generates and
// writes one JSON result per run. See README.md.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { SCENARIOS } from './scenarios.mjs';

const SELF = fileURLToPath(import.meta.url);
const HERE = path.dirname(SELF);
const WORKFLOWS = ['propose', 'explore', 'continue', 'apply', 'update', 'sync', 'archive', 'verify'];

const { values } = parseArgs({
  options: {
    label: { type: 'string' },
    cli: { type: 'string' },
    'init-cli': { type: 'string' },
    delivery: { type: 'string', default: 'skills' },
    install: { type: 'string', default: 'project' },
    grader: { type: 'string', default: path.resolve(HERE, '../..') },
    model: { type: 'string', default: 'claude-sonnet-5-5' },
    reps: { type: 'string', default: '3' },
    only: { type: 'string' },
    out: { type: 'string', default: path.join(HERE, 'results') },
    parallel: { type: 'string', default: '4' },
    overwrite: { type: 'boolean', default: false },
    // A real project to run the `fixture: 'repo'` scenarios in (e.g. a
    // checkout of OpenSpec itself), instead of the small todo library.
    fixture: { type: 'string' },
  },
});
if (!values.label || !values.cli) {
  console.error('usage: run.mjs --label <name> --cli <openspec checkout> [--model m] [--reps n] [--only a,b] [--out dir]');
  process.exit(2);
}

const cliRoot = path.resolve(values.cli);
// Upgrade mode: set each project up with an older CLI, then run this one's
// `openspec update`, the way an existing user moves to a new release.
const initCliRoot = path.resolve(values['init-cli'] ?? values.cli);
const graderRoot = path.resolve(values.grader);
const outDir = path.resolve(values.out, values.label);
// A rerun into the same label would mix its results with the old ones.
if (!process.env.SKILL_EVAL_JOB) {
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    if (!values.overwrite) {
      console.error(`${outDir} already has results. Pick a new --label, or pass --overwrite to replace them.`);
      process.exit(2);
    }
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}
fs.mkdirSync(outDir, { recursive: true });

function shim(dir, checkout, configHome) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'openspec');
  fs.writeFileSync(
    file,
    `#!/bin/sh\nXDG_CONFIG_HOME="${configHome}" OPENSPEC_TELEMETRY=0 OPENSPEC_NO_UPDATE_CHECK=1 exec node "${checkout}/bin/openspec.js" "$@"\n`,
    { mode: 0o755 }
  );
  return dir;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// `--install plugin`: the Claude Code plugin `openspec setup` installs (the
// `openspec` router plus a `/openspec:<workflow>` skill each), built by the CLI
// under test. `--install single`: the same set in the project's
// `.claude/skills/`, named the way `~/.agents/skills` gets them
// (`openspec-beta` + `openspec-beta-<workflow>`).
async function buildPlugin(dir) {
  const { writeClaudePlugin } = await import(path.join(cliRoot, 'dist/core/machine-setup.js'));
  await writeClaudePlugin(dir, WORKFLOWS);
  return dir;
}

const { generateOpenSpecSkillSet, workflowSkillName, SKILL_NAMESPACE, WORKFLOW_ORDER } =
  values.install === 'project' ? {} : await import(path.join(cliRoot, 'dist/core/shared/openspec-skill.js'));

// `--install npx`: the real `npx skills add` of this checkout's committed
// skills/ mirror, into the project for Claude Code, exactly as a user gets it.
function npxSkills(root) {
  const result = run('npx', ['-y', 'skills', 'add', cliRoot, '-a', 'claude-code', '-y'], { cwd: root });
  if (result.code !== 0 || !fs.existsSync(path.join(root, '.claude', 'skills', SKILL_NAMESPACE, 'SKILL.md'))) {
    throw new Error(`npx skills add failed:\n${result.out.slice(-1500)}`);
  }
}

function writeSingleSkill(root) {
  const skills = generateOpenSpecSkillSet({
    workflows: WORKFLOWS,
    version: 'eval',
    skillName: workflowSkillName,
    invoke: (id) => `/${workflowSkillName(id)}`,
  });
  for (const skill of skills) {
    const skillDir = path.join(root, '.claude', 'skills', skill.dirName);
    for (const file of skill.files) {
      fs.mkdirSync(path.dirname(path.join(skillDir, file.relativePath)), { recursive: true });
      fs.writeFileSync(path.join(skillDir, file.relativePath), file.content);
    }
  }
}

// Scenario prompts name the per-workflow skill (`/openspec-apply-change`).
const WORKFLOW_OF = {
  'openspec-propose': 'propose',
  'openspec-explore': 'explore',
  'openspec-apply-change': 'apply',
  'openspec-verify-change': 'verify',
  'openspec-sync-specs': 'sync',
  'openspec-archive-change': 'archive',
  'openspec-continue-change': 'continue',
  'openspec-update-change': 'update',
};

function promptFor(prompt) {
  if (values.install === 'project') return prompt;
  return prompt.replace(/^\/(openspec-[a-z-]+)/, (match, skill) => {
    const id = WORKFLOW_OF[skill];
    if (!id) throw new Error(`no workflow for ${skill}`);
    // A workflow the router ships as steps only (sync) is started through the router.
    if (!WORKFLOW_ORDER.includes(id)) {
      return values.install === 'plugin' ? `/${SKILL_NAMESPACE}:${SKILL_NAMESPACE} ${id}` : `/${SKILL_NAMESPACE} ${id}`;
    }
    return values.install === 'plugin' ? `/${SKILL_NAMESPACE}:${id}` : `/${workflowSkillName(id)}`;
  });
}

function upgrade(dir, env) {
  const result = run('openspec', ['update'], { cwd: dir, env });
  if (result.code !== 0) throw new Error(`openspec update failed:\n${result.out}`);
}

function makeProject(scenario, work) {
  const root = path.join(work, values.fixture ? 'project' : 'todo-lite');
  fs.cpSync(values.fixture ? path.resolve(values.fixture) : path.join(HERE, 'fixture'), root, { recursive: true });
  const configHome = path.join(work, 'config');
  fs.mkdirSync(path.join(configHome, 'openspec'), { recursive: true });
  fs.writeFileSync(
    path.join(configHome, 'openspec', 'config.json'),
    JSON.stringify({ profile: 'custom', delivery: values.delivery, workflows: WORKFLOWS, telemetry: { noticeSeen: true } })
  );
  const bin = shim(path.join(work, 'bin'), cliRoot, configHome);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const initBin = shim(path.join(work, 'init-bin'), initCliRoot, configHome);
  const initEnv = { ...process.env, PATH: `${initBin}:${process.env.PATH}` };

  if (scenario.init === false) {
    // Skills are installed for the user, but this repository never adopted OpenSpec.
    const scratch = path.join(work, 'skills-source');
    fs.mkdirSync(scratch);
    if (values.install === 'single') {
      writeSingleSkill(root);
    } else if (values.install === 'npx') {
      npxSkills(root);
    } else if (values.install !== 'plugin') {
      run('openspec', ['init', '--tools', 'claude'], { cwd: scratch, env: initEnv });
      if (initCliRoot !== cliRoot) upgrade(scratch, env);
      fs.cpSync(path.join(scratch, '.claude'), path.join(root, '.claude'), { recursive: true });
    }
    fs.rmSync(path.join(root, 'openspec'), { recursive: true, force: true });
  } else {
    const tools = values.install === 'project' ? 'claude' : 'none';
    const init = run('openspec', ['init', '--tools', tools], { cwd: root, env: initEnv });
    if (init.code !== 0) throw new Error(`openspec init failed:\n${init.out}`);
    if (initCliRoot !== cliRoot) upgrade(root, env);
    if (values.install === 'single') writeSingleSkill(root);
    if (values.install === 'npx') npxSkills(root);
  }
  scenario.setup?.(root);
  // The starting commit is the baseline every "what changed" check diffs
  // against, so it must exist. Signing is off: it is a throwaway repository.
  run('git', ['init', '-q'], { cwd: root });
  run('git', ['add', '-A'], { cwd: root });
  const commit = run(
    'git',
    ['-c', 'user.name=dev', '-c', 'user.email=dev@example.com', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'start'],
    { cwd: root }
  );
  if (commit.code !== 0) throw new Error(`could not commit the starting fixture:\n${commit.out}`);
  return { root, env, configHome };
}

function grade(scenario, root, configHome, result, skillsUsed = []) {
  const graderBin = shim(path.join(path.dirname(root), 'grader-bin'), graderRoot, configHome);
  const env = { ...process.env, PATH: `${graderBin}:${process.env.PATH}` };
  const ctx = {
    root,
    result,
    skillsUsed,
    read: (file) => (fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : null),
    exists: (file) => fs.existsSync(path.join(root, file)),
    run: (cmd, args) => run(cmd, args, { cwd: root, env }),
    openspec: (args) => run('openspec', args, { cwd: root, env }),
    openspecJson: (args) => {
      try {
        return JSON.parse(run('openspec', args, { cwd: root, env }).out.replace(/^[^{]*/, ''));
      } catch {
        return null;
      }
    },
    changedFiles: () =>
      run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root })
        .out.split('\n')
        .filter(Boolean)
        .map((line) => line.slice(3).replace(/^"|"$/g, ''))
        .filter((file) => !file.startsWith('.claude/')),
  };
  return { checks: scenario.checks(ctx), metrics: scenario.metrics?.(ctx) ?? {} };
}

function summarizeStream(stream) {
  const lines = stream.split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const final = lines.findLast((event) => event.type === 'result') ?? {};
  const reads = [];
  // Did the agent open the project's existing specs (not just list the
  // folder)? A file read, a search inside them, or the CLI's spec views count.
  let readSpecs = false;
  // The spec-reading audit's measure: specs read before the first file of a
  // change is written. Null when the run writes no change file.
  let readSpecsBeforeDraft = null;
  // Did the agent run the project's tests, or validate its plan?
  let ranTests = false;
  let ranValidate = false;
  for (const event of lines) {
    if (event.type !== 'assistant') continue;
    for (const part of event.message?.content ?? []) {
      if (part.type !== 'tool_use') continue;
      const input = part.input ?? {};
      if (readSpecsBeforeDraft === null && ['Write', 'Edit', 'MultiEdit'].includes(part.name) && /openspec\/changes\/(?!archive\/)[^/]+\//.test(input.file_path ?? '')) {
        readSpecsBeforeDraft = readSpecs;
      }
      if (part.name === 'Bash' && /node --test|npm (run )?test|pnpm (run )?test|vitest/.test(input.command ?? '')) ranTests = true;
      if (part.name === 'Bash' && /openspec validate/.test(input.command ?? '')) ranValidate = true;
      if (part.name === 'Read') reads.push(input.file_path);
      if (part.name === 'Skill') reads.push(`skill:${input.skill ?? input.command}`);
      const target = `${input.file_path ?? ''} ${input.path ?? ''} ${input.command ?? ''}`;
      if (
        (['Read', 'Grep'].includes(part.name) && /openspec\/specs\//.test(target)) ||
        (part.name === 'Bash' && /(cat|grep|head|sed|less)[^|;&]*openspec\/specs\/|openspec (show|list --specs)\b/.test(target))
      ) {
        readSpecs = true;
      }
    }
  }
  const usage = final.usage ?? {};
  return {
    result: final.result ?? '',
    isError: final.is_error ?? true,
    costUsd: final.total_cost_usd ?? null,
    turns: final.num_turns ?? null,
    durationMs: final.duration_ms ?? null,
    inputTokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0,
    skillFilesRead: reads.filter((file) => file && /(^skill:|skills\/)/.test(file)).map((file) => file.replace(/^.*skills\//, '')),
    readSpecs,
    readSpecsBeforeDraft,
    ranTests,
    ranValidate,
  };
}

async function runOne(scenario, rep) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-lite-'));
  const base = path.join(outDir, `${scenario.id}-${rep}`);
  try {
    const { root, configHome, env } = makeProject(scenario, work);
    const started = Date.now();
    const plugin = values.install === 'plugin' ? ['--plugin-dir', await buildPlugin(path.join(work, 'plugin'))] : [];
    const prompt = promptFor(scenario.prompt);
    const agent = spawnSync(
      'claude',
      [
        '-p', prompt,
        ...plugin,
        '--model', values.model,
        '--output-format', 'stream-json', '--verbose',
        '--setting-sources', 'project,local',
        // Each run gets a throwaway project in a temp directory, so the agent
        // may run any shell command there; web access stays off.
        '--permission-mode', 'bypassPermissions',
        '--disallowedTools', 'WebFetch', 'WebSearch',
        '--no-session-persistence',
        '--max-budget-usd', '5',
      ],
      { cwd: root, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 20 * 60 * 1000 }
    );
    const summary = summarizeStream(agent.stdout ?? '');
    const { checks, metrics } = grade(scenario, root, configHome, summary.result, summary.skillFilesRead);
    const record = {
      label: values.label,
      model: values.model,
      scenario: scenario.id,
      rep,
      pass: !summary.isError && checks.every((check) => check.pass),
      checks,
      ...summary,
      // Observations that are not pass/fail, reported as rates by compare.mjs.
      metrics: {
        readSpecs: summary.readSpecs,
        ranTests: summary.ranTests,
        ranValidate: summary.ranValidate,
        namesAssumptions: /\bassum/i.test(summary.result ?? ''),
        ...(summary.readSpecsBeforeDraft === null ? {} : { readSpecsBeforeDraft: summary.readSpecsBeforeDraft }),
        ...metrics,
      },
      wallMs: Date.now() - started,
    };
    fs.writeFileSync(`${base}.json`, JSON.stringify(record, null, 2));
    fs.writeFileSync(`${base}.stream.jsonl`, agent.stdout ?? '');
    // Keep what the agent planned, for judge.mjs: only the change folders this
    // run created or touched, since a real project already has others.
    fs.rmSync(`${base}.changes`, { recursive: true, force: true });
    const touched = new Set(
      run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root })
        .out.split('\n')
        .map((line) => /^...openspec\/changes\/([^/]+)\//.exec(line)?.[1])
        .filter((name) => name && name !== 'archive')
    );
    for (const name of touched) {
      const dir = path.join(root, 'openspec', 'changes', name);
      // An archived change was touched but no longer lives here.
      if (fs.existsSync(dir)) fs.cpSync(dir, path.join(`${base}.changes`, name), { recursive: true });
    }
    return record;
  } catch (error) {
    // A run that could not even start still counts, as a failure.
    const record = {
      label: values.label,
      model: values.model,
      scenario: scenario.id,
      rep,
      pass: false,
      checks: [{ name: 'run completed', pass: false, detail: String(error?.stack ?? error).slice(0, 2000) }],
      result: '',
      isError: true,
      costUsd: null,
      turns: null,
      durationMs: null,
      inputTokens: 0,
      outputTokens: 0,
      skillFilesRead: [],
    };
    fs.writeFileSync(`${base}.json`, JSON.stringify(record, null, 2));
    return record;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// Repo scenarios run only against --fixture, and the todo scenarios only without it.
const pool = SCENARIOS.filter((s) => (s.fixture === 'repo') === Boolean(values.fixture));
const selected = values.only ? pool.filter((s) => values.only.split(',').includes(s.id)) : pool;
const jobs = selected.flatMap((scenario) =>
  Array.from({ length: Number(values.reps) }, (_, i) => ({ scenario, rep: i + 1 }))
);

// Run jobs in a worker pool of child processes so agents work concurrently.
if (process.env.SKILL_EVAL_JOB) {
  const { scenario: id, rep } = JSON.parse(process.env.SKILL_EVAL_JOB);
  const record = await runOne(SCENARIOS.find((s) => s.id === id), rep);
  console.log(`${record.pass ? 'PASS' : 'FAIL'} ${values.label} ${id}#${rep} $${record.costUsd?.toFixed(2)} ${record.turns} turns`);
} else {
  const { spawn } = await import('node:child_process');
  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) {
      const job = queue.shift();
      await new Promise((resolve) => {
        const child = spawn(process.execPath, [SELF, ...process.argv.slice(2)], {
          env: { ...process.env, SKILL_EVAL_JOB: JSON.stringify({ scenario: job.scenario.id, rep: job.rep }) },
          stdio: 'inherit',
        });
        child.on('exit', (code) => {
          if (code !== 0) console.error(`worker for ${job.scenario.id}#${job.rep} exited with code ${code}`);
          resolve();
        });
      });
    }
  };
  await Promise.all(Array.from({ length: Number(values.parallel) }, worker));
}
