#!/usr/bin/env node
// Prints a markdown table comparing two result sets written by run.mjs.
// usage: compare.mjs <results-dir> <baseline-label> <candidate-label>
import fs from 'node:fs';
import path from 'node:path';

const [dir, before, after] = process.argv.slice(2);
if (!dir || !before || !after) {
  console.error('usage: compare.mjs <results-dir> <baseline-label> <candidate-label>');
  process.exit(2);
}

function load(label) {
  const folder = path.join(dir, label);
  return fs
    .readdirSync(folder)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8')));
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
const change = (from, to) => (from === 0 ? '' : ` (${to >= from ? '+' : ''}${Math.round(((to - from) / from) * 100)}%)`);

function summarize(rows) {
  return {
    runs: rows.length,
    passed: rows.filter((row) => row.pass).length,
    cost: mean(rows.map((row) => row.costUsd ?? 0)),
    tokens: mean(rows.map((row) => row.inputTokens + row.outputTokens)),
    turns: mean(rows.map((row) => row.turns ?? 0)),
    seconds: mean(rows.map((row) => (row.durationMs ?? 0) / 1000)),
  };
}

const a = load(before);
const b = load(after);
const scenarios = [...new Set([...a, ...b].map((row) => row.scenario))].sort();

const lines = [
  `| Scenario | Passed (${before} → ${after}) | Tokens | Cost | Turns | Time |`,
  '|---|---|---|---|---|---|',
];
const row = (name, x, y) =>
  `| ${name} | ${x.passed}/${x.runs} → ${y.passed}/${y.runs} | ${Math.round(x.tokens / 1000)}K → ${Math.round(y.tokens / 1000)}K${change(x.tokens, y.tokens)} | $${x.cost.toFixed(3)} → $${y.cost.toFixed(3)}${change(x.cost, y.cost)} | ${x.turns.toFixed(1)} → ${y.turns.toFixed(1)} | ${Math.round(x.seconds)}s → ${Math.round(y.seconds)}s${change(x.seconds, y.seconds)} |`;

for (const scenario of scenarios) {
  lines.push(
    row(
      scenario,
      summarize(a.filter((r) => r.scenario === scenario)),
      summarize(b.filter((r) => r.scenario === scenario))
    )
  );
}
lines.push(row('**All**', summarize(a), summarize(b)));

// Per-scenario observations (share of runs where each was true).
const metricRows = [];
for (const scenario of scenarios) {
  const names = new Set(
    [...a, ...b].filter((r) => r.scenario === scenario).flatMap((r) => Object.keys(r.metrics ?? {}))
  );
  for (const name of [...names].sort()) {
    const rate = (rows) => {
      const values = rows.filter((r) => r.scenario === scenario && r.metrics && name in r.metrics).map((r) => Number(r.metrics[name]));
      return values.length ? `${Math.round(mean(values) * 100)}%` : 'n/a';
    };
    metricRows.push(`| ${scenario} | ${name} | ${rate(a)} → ${rate(b)} |`);
  }
}
if (metricRows.length) {
  lines.push('', `| Scenario | Observation | ${before} → ${after} |`, '|---|---|---|', ...metricRows);
}
console.log(lines.join('\n'));
