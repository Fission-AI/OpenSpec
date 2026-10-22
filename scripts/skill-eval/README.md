# Skill eval

Runs real agent sessions against the skills an OpenSpec checkout generates, and grades the result with the OpenSpec CLI and the file system, never with the agent's own report.

Each scenario copies `fixture/` (a small todo library with one spec) into a temp directory, runs `openspec init --tools claude`, applies the scenario's setup, and sends one request to headless Claude Code. The agent runs with permissions bypassed inside that throwaway directory, with web access off.

| Scenario | Request | Passes when |
|---|---|---|
| `propose` | propose due dates | one change, every artifact written, `validate --strict` passes, no code touched |
| `propose-then-stop` | propose, "then implement it" | change validates, still no code touched |
| `apply` | apply `add-priority` | all tasks checked (active or archived), `node --test` passes |
| `apply-task-driven` | apply a change whose last task syncs the specs, the default `tasks.md` shape (#1968) | tests pass, main specs validate |
| `verify` | verify a change whose tasks lie | reports the missing check, writes nothing |
| `sync` | sync `add-clear-completed` | main spec gains the requirement, specs validate, change stays active |
| `archive` | archive a finished change | archived, main spec updated, everything validates |
| `archive-unfinished` | archive a change with open tasks | not archived, warns about the tasks |
| `explore` | a design question | answers, writes nothing |
| `explore-draft` | shape a feature before planning | writes nothing; records whether it leaves a draft (scope, capabilities, requirements, open questions) |
| `no-project` | propose in a repo without OpenSpec | creates no `openspec/`, writes nothing |
| `propose-natural` | propose in plain words, no slash command | an OpenSpec skill was used, plus everything `propose` checks |

Scenarios also record observations that are not pass/fail, reported as rates: whether the agent read the existing specs (from the transcript), spec quality for `propose` (existing capability reused, a failure scenario per requirement, one obligation per requirement, no internals in requirement text), and for the apply scenarios whether the main specs ended current and the change archived.

## Run

Build each checkout first (`pnpm build`), then:

```bash
node scripts/skill-eval/run.mjs --label before --cli ../openspec-main --reps 5
node scripts/skill-eval/run.mjs --label after --cli . --reps 5
node scripts/skill-eval/compare.mjs scripts/skill-eval/results before after
```

For planning quality, `judge.mjs` shows a judge model each rep's two plans as "Plan 1" and "Plan 2" in random order and asks which better serves the request:

```bash
node scripts/skill-eval/judge.mjs scripts/skill-eval/results before after --scenario propose
```

`--install plugin` runs each request through the Claude Code plugin `openspec setup` installs (prompts become `/openspec-beta:<workflow>`); `--install single` installs the same `openspec-beta` router and `openspec-beta-<workflow>` skills into the project (prompts become `/openspec-beta-<workflow>`), the way agents reading `~/.agents/skills` get them.

`--init-cli <checkout>` sets each project up with another checkout's CLI and then runs this one's `openspec update`, so every scenario also proves the upgrade path. `--delivery both` installs commands beside skills, the default for existing users.

`--model` picks the agent model, `--only a,b` runs some scenarios, and `--grader` sets the checkout whose CLI grades results (default: this one). Each run writes `<scenario>-<rep>.json` (checks, tokens, cost, turns, time) and the full `stream.jsonl` transcript.
