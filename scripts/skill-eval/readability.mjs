#!/usr/bin/env node
// Blind readability judge. For each workflow, shows a judge model the skill a
// person reads today beside what they read in the new layout (the router's
// SKILL.md plus that workflow's references/<workflow>.md), as "Version 1" and
// "Version 2" in a random order, and asks which is easier to read and trust.
// Also prints plain numbers for each side, so the verdict is not only a model's.
// usage: readability.mjs <old-checkout> <new-checkout> [--reps 3] [--model m] [--out file]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    reps: { type: 'string', default: '3' },
    model: { type: 'string', default: 'claude-opus-5-5' },
    out: { type: 'string' },
  },
});
const [oldRoot, newRoot] = positionals;
if (!oldRoot || !newRoot) {
  console.error('usage: readability.mjs <old-checkout> <new-checkout> [--reps 3] [--model m] [--out file]');
  process.exit(2);
}

// Today's skill folder for each workflow, and the new router's name.
const OLD_DIR = {
  explore: 'openspec-explore',
  propose: 'openspec-propose',
  new: 'openspec-new-change',
  continue: 'openspec-continue-change',
  ff: 'openspec-ff-change',
  update: 'openspec-update-change',
  apply: 'openspec-apply-change',
  verify: 'openspec-verify-change',
  sync: 'openspec-sync-specs',
  archive: 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  onboard: 'openspec-onboard',
};
const router = fs
  .readdirSync(path.join(newRoot, 'skills'))
  .find((name) => fs.existsSync(path.join(newRoot, 'skills', name, 'references')));

const read = (file) => fs.readFileSync(file, 'utf8');
const body = (markdown) => markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

function oldText(id) {
  return body(read(path.join(oldRoot, 'skills', OLD_DIR[id], 'SKILL.md')));
}

function newText(id) {
  const dir = path.join(newRoot, 'skills', router);
  return `${body(read(path.join(dir, 'SKILL.md')))}\n\n--- references/${id}.md\n\n${read(path.join(dir, 'references', `${id}.md`)).trim()}`;
}

/** Words, lines, words per sentence, and lines (40+ chars) that appear more than once. */
function numbers(text) {
  const prose = text.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter(Boolean).length;
  const sentences = Math.max(1, (prose.match(/[.!?](\s|$)/g) ?? []).length);
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length >= 40);
  const repeated = lines.length - new Set(lines).size;
  return { words, lines: text.split('\n').length, wordsPerSentence: +(words / sentences).toFixed(1), repeated };
}

const RUBRIC = `Both versions are instructions for an AI coding agent. A person maintaining the project also has to read them, review changes to them, and trust what the agent will do. Judge which version is easier for that person to read and understand at a glance. Consider, in order:
1. Clarity: plain words, one idea per sentence, nothing left unexplained.
2. Scannability: what to do comes first, with clear steps and short sections.
3. Noise: repeated rules, filler, and detail that does not change what the agent does.
4. Completeness: it still says everything needed to do the job correctly.
Reply with JSON only: {"winner": "1" | "2" | "tie", "reason": "<one sentence>"}`;

const workflows = Object.keys(OLD_DIR).filter(
  (id) =>
    fs.existsSync(path.join(oldRoot, 'skills', OLD_DIR[id], 'SKILL.md')) &&
    fs.existsSync(path.join(newRoot, 'skills', router, 'references', `${id}.md`))
);

const verdicts = [];
for (const id of workflows) {
  const before = oldText(id);
  const after = newText(id);
  for (let rep = 1; rep <= Number(values.reps); rep++) {
    const oldFirst = Math.random() < 0.5;
    const [one, two] = oldFirst ? [before, after] : [after, before];
    const prompt = `Two versions of the instructions for the "${id}" workflow of OpenSpec, a spec-driven development tool.\n\n# Version 1\n\n${one}\n\n# Version 2\n\n${two}\n\n${RUBRIC}`;
    const out = spawnSync(
      'claude',
      ['-p', prompt, '--model', values.model, '--output-format', 'json', '--setting-sources', 'project,local',
        '--tools', '', '--no-session-persistence'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    let verdict;
    try {
      const text = JSON.parse(out.stdout).result;
      verdict = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    } catch {
      verdict = { winner: 'error', reason: (out.stdout || out.stderr).slice(0, 200) };
    }
    const answer = String(verdict.winner ?? '').trim().toLowerCase();
    const winner =
      answer === 'tie' ? 'tie' : answer === '1' || answer === '2' ? ((answer === '1') === oldFirst ? 'old' : 'new') : 'error';
    verdicts.push({ workflow: id, rep, winner, reason: verdict.reason });
    console.log(`${id} #${rep}: ${winner} - ${verdict.reason}`);
  }
}

console.log('\n| Workflow | Old: words / lines / words per sentence / repeated lines | New | Judge (new–old) |');
console.log('|---|---|---|---|');
for (const id of workflows) {
  const a = numbers(oldText(id));
  const b = numbers(newText(id));
  const mine = verdicts.filter((v) => v.workflow === id);
  const count = (who) => mine.filter((v) => v.winner === who).length;
  console.log(
    `| ${id} | ${a.words} / ${a.lines} / ${a.wordsPerSentence} / ${a.repeated} | ${b.words} / ${b.lines} / ${b.wordsPerSentence} / ${b.repeated} | ${count('new')}–${count('old')} |`
  );
}
const total = (who) => verdicts.filter((v) => v.winner === who).length;
console.log(`\nnew ${total('new')} · old ${total('old')} · tie ${total('tie')} · error ${total('error')} (of ${verdicts.length})`);
if (values.out) fs.writeFileSync(values.out, JSON.stringify(verdicts, null, 2));
