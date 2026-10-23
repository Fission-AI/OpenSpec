#!/usr/bin/env node
// Blind pairwise judge for planning quality. For each rep, shows a judge model
// the change one label's skills planned beside the other's, as "Plan 1" and
// "Plan 2" in a random order, and asks which better serves the request.
// usage: judge.mjs <results-dir> <label-a> <label-b> [--scenario propose] [--model m]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { SCENARIOS } from './scenarios.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    scenario: { type: 'string', default: 'propose' },
    model: { type: 'string', default: 'claude-opus-5-5' },
    // The project a repo scenario ran in, for its judge context.
    fixture: { type: 'string' },
  },
});
const [dir, labelA, labelB] = positionals;
if (!dir || !labelA || !labelB) {
  console.error('usage: judge.mjs <results-dir> <label-a> <label-b> [--scenario s] [--model m]');
  process.exit(2);
}

const scenario = SCENARIOS.find((s) => s.id === values.scenario);
const request = scenario.prompt.replace(/^\/\S+\s*/, '');
const context = scenario.judgeContext
  ? `This project is OpenSpec, a spec-driven development CLI. ${scenario.judgeContext(path.resolve(values.fixture))}`
  : `This is a small JavaScript library. Its current source:\n\n\`\`\`js\n${fs.readFileSync(new URL('./fixture/src/todo.js', import.meta.url), 'utf8')}\n\`\`\``;

function plan(label, rep) {
  const root = path.join(dir, label, `${values.scenario}-${rep}.changes`);
  if (!fs.existsSync(root)) return null;
  const files = [];
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  };
  walk(root);
  return files
    .sort()
    .map((file) => `--- ${path.relative(root, file).replace(/^[^/]+\//, '')}\n${fs.readFileSync(file, 'utf8')}`)
    .join('\n\n');
}

const RUBRIC = `Judge which plan better serves the request. Consider, in order:
1. Coverage: does it plan everything the request asks for, and nothing it did not ask for?
2. Specs: are requirements testable (SHALL statements with concrete WHEN/THEN scenarios, including edge cases)?
3. Tasks: are tasks small, ordered, and each verifiable?
4. Grounding: does it fit the existing code it was planned against?
5. Consistency: do proposal, specs, design, and tasks agree with each other?
Reply with JSON only: {"winner": "1" | "2" | "tie", "reason": "<one sentence>"}`;

const verdicts = [];
for (let rep = 1; rep <= 20; rep++) {
  const a = plan(labelA, rep);
  const b = plan(labelB, rep);
  if (!a || !b) continue;
  const aFirst = Math.random() < 0.5;
  const [one, two] = aFirst ? [a, b] : [b, a];
  const prompt = `A developer asked an assistant to plan this change:\n\n> ${request}\n\n${context}\n\nTwo plans were written independently.\n\n# Plan 1\n\n${one}\n\n# Plan 2\n\n${two}\n\n${RUBRIC}`;
  const out = spawnSync(
    'claude',
    ['-p', prompt, '--model', values.model, '--output-format', 'json', '--setting-sources', 'project,local',
      '--tools', '', '--no-session-persistence'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: dir }
  );
  let verdict;
  try {
    const text = JSON.parse(out.stdout).result;
    verdict = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    verdict = { winner: 'error', reason: (out.stdout || out.stderr).slice(0, 200) };
  }
  // Accept only the three answers the rubric allows; anything else is an
  // error, never a silent vote for one side.
  const answer = String(verdict.winner ?? '').trim().toLowerCase();
  const winner =
    answer === 'tie'
      ? 'tie'
      : answer === '1' || answer === '2'
        ? (answer === '1') === aFirst ? labelA : labelB
        : 'error';
  verdicts.push({ rep, winner, reason: verdict.reason });
  console.log(`rep ${rep}: ${winner} - ${verdict.reason}`);
}

const count = (who) => verdicts.filter((v) => v.winner === who).length;
console.log(`\n${labelA} ${count(labelA)} · ${labelB} ${count(labelB)} · tie ${count('tie')} · error ${count('error')} (of ${verdicts.length})`);
fs.writeFileSync(path.join(dir, `judge-${values.scenario}-${labelA}-vs-${labelB}.json`), JSON.stringify(verdicts, null, 2));
