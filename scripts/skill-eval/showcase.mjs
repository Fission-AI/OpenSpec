#!/usr/bin/env node
// Pulls one scenario's artifacts from two result sets and prints them side by
// side, so a reader can see the difference instead of trusting a number.
// Picks the rep whose pair differs most on the traceability metric, rather
// than letting whoever writes the post choose a flattering one.
// usage: showcase.mjs <results-dir> <baseline-label> <candidate-label> --scenario <id> [--file tasks.md]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { scenario: { type: 'string' }, file: { type: 'string', default: 'tasks.md' } },
});
const [dir, before, after] = positionals;
if (!dir || !before || !after || !values.scenario) {
  console.error('usage: showcase.mjs <results-dir> <baseline> <candidate> --scenario <id> [--file tasks.md]');
  process.exit(2);
}

/** The change folder a run wrote, from the snapshot run.mjs saves beside it. */
function changeDir(label, rep) {
  const root = path.join(dir, label, `${values.scenario}-${rep}.changes`);
  if (!fs.existsSync(root)) return null;
  const [name] = fs.readdirSync(root);
  return name ? path.join(root, name) : null;
}

function read(label, rep, relative) {
  const root = changeDir(label, rep);
  if (!root) return null;
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function record(label, rep) {
  const file = path.join(dir, label, `${values.scenario}-${rep}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

/** How many tasks cite a requirement or decision by ID, the clearest gap. */
const citations = (text) => (text ?? '').match(/\[[A-Z][A-Z0-9-]*-?\d+(\.\d+)?\]|\[D\d+\]/g)?.length ?? 0;

const reps = fs
  .readdirSync(path.join(dir, after))
  .flatMap((entry) => entry.match(new RegExp(`^${values.scenario}-(\\d+)\\.json$`))?.[1] ?? [])
  .map(Number)
  .sort((a, b) => a - b);

// The pair to show is the candidate's MEDIAN rep, not its best: the widest gap
// in a run is the one case a reader should trust least.
const pairs = reps
  .map((rep) => ({ rep, a: read(before, rep, values.file), b: read(after, rep, values.file) }))
  .filter(({ a, b }) => a !== null && b !== null);
const ranked = [...pairs].sort((x, y) => citations(x.b) - citations(y.b));
const chosen = ranked.length > 0 ? ranked[Math.floor((ranked.length - 1) / 2)] : null;
if (!chosen) {
  console.error(`no rep of ${values.scenario} has ${values.file} on both sides`);
  process.exit(1);
}

const { rep, a, b } = chosen;
// Every rep's count, so the pair below reads as an illustration of a
// difference that holds across the run rather than the one flattering case.
const counts = (label) =>
  reps.map((n) => citations(read(label, n, values.file))).join(', ');
console.log(`## ${values.scenario} — \`${values.file}\`\n`);
console.log(`IDs cited per rep, ${before}: ${counts(before)}`);
console.log(`IDs cited per rep, ${after}: ${counts(after)}\n`);
console.log(`Below is rep ${rep}, the candidate's median rep, so it is typical rather than its best.\n`);
for (const [label, text] of [[before, a], [after, b]]) {
  console.log(`### ${label}\n`);
  console.log('```markdown');
  console.log(text.trimEnd());
  console.log('```\n');
}
for (const label of [before, after]) {
  const reply = (record(label, rep)?.result ?? '').trim();
  if (reply) console.log(`### ${label} — the message the user reads\n\n> ${reply.split('\n').join('\n> ')}\n`);
}
