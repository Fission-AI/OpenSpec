# Skill eval

Runs real agent sessions against the skills an OpenSpec checkout generates, and grades the result with the OpenSpec CLI and the file system, never with the agent's own report.

Each scenario copies `fixture/` (a small todo library with one spec) into a temp directory, runs `openspec init --tools claude`, applies the scenario's setup, and sends one request to headless Claude Code. The agent runs with permissions bypassed inside that throwaway directory, with web access off.

| Scenario | Request | Passes when |
|---|---|---|
| `propose` | propose due dates | one change, every artifact written, `validate --strict` passes, no code touched |
| `propose-then-stop` | propose, "then implement it" | change validates, still no code touched |
| `apply` | apply `add-priority` | all tasks checked (active or archived), `node --test` passes |
| `apply-task-driven` | apply a change whose last task syncs the specs (#1968) | tests pass, main specs validate |
| `verify` | verify a change whose tasks lie | reports the missing check, writes nothing; records whether it offers the issues back as tasks |
| `sync` | sync `add-clear-completed` | main spec gains the requirement, specs validate, change stays active |
| `archive` | archive a finished change | archived, main spec updated, everything validates |
| `archive-cited` | archive a finished change that a code comment cites by path | archived, everything validates, tests pass; records whether the stale citation is flagged |
| `archive-unfinished` | archive a change with open tasks | not archived, warns about the tasks |
| `continue-specs` | continue a change that has only a proposal | writes the specs and nothing else, change validates |
| `update-ripple` | revise a finished plan for a need that touches a second capability | change validates, tasks cover it, no code touched |
| `propose-conflict` | a request that contradicts an existing requirement | modifies that requirement by its exact name, adds no conflicting one, validates |
| `propose-duplicate` | a request half covered by an existing requirement, already built | repeats no existing requirement in a new one |
| `continue-proposal` | write a proposal through new + continue | proposal only, no code touched |
| `propose-overlap` | a request touching a requirement another open change already modifies | one new change, the other untouched, validates; records whether the plan names the overlap |
| `archive-stale` | archive a change whose MODIFIED block predates a newer main-spec sentence | the newer sentence survives, or the agent stops and says why |
| `propose-earlier-decision` | a request that reverses a decision an archived change recorded | one change, validates, no code touched; records whether the plan names the earlier decision |
| `propose-french` | propose, asked in French | everything `propose` checks; records whether the plan is written in French |
| `apply-reconcile` | apply a change whose design contradicts its spec | tasks done, tests pass, priorities follow the spec; records whether the design was brought in line |
| `propose-bugfix` | plan a fix where the code drifted from a spec that is already right | one change, validates, no code touched; records plan size, skipped design, no new requirement |
| `propose-crowded-edit` | change a clause a five-SHALL requirement already promises, so MODIFIED is unavoidable (#2139) | one change, validates, the existing requirement modified not duplicated; records the SHALLs and words carried forward |
| `propose-nonfunctional` | plan a performance budget (under 50ms at 10k todos) | one change, validates, the budget reaches the spec; records whether it lands in a scenario a test can check, or as a vague adjective |
| `propose-new-capability` | a request needing a capability the project lacks | one change, validates, CSV specified, no capability named for the work; records the names chosen and whether `todo-list` was reused |
| `propose-crowded-spec` | add a behavior to a spec whose requirement already carries five SHALLs (#2139) | one change, validates, covers the new behavior, no requirement left more crowded; records whether the edited one was split |
| `propose-refactor` | plan a pure internal refactor | one change, validates, no code touched, no requirement invented; records whether it declared `skip_specs` |
| `propose-tidy-up` | plan a "clean-up" that in fact changes a promised behavior | one change, validates, a MODIFIED delta, no `skip_specs`, no code touched |
| `sync-notes-file` | sync a change whose `specs/todo-list/` also holds a `notes.md` written like a delta (#2173) | the real requirement merged, the notes file not, specs validate |
| `sync-custom-id` | sync under a custom schema whose delta-spec artifact is `requirements`, not `specs` (#2163) | main spec gains the requirement, existing ones kept, specs validate |
| `apply-blocked-unrelated` | apply blocked on `tasks.md` while an artifact apply does not need is also ready, and listed first (#2165) | never writes the unrelated artifact |
| `explore-existing-decision` | in explore, reverse a design decision on an existing change that its spec depends on (#2057) | the decision recorded, the spec no longer contradicts it, change validates, no code touched |
| `apply-schema-policy` | apply under a schema whose `apply.instruction` says to deviate and note it, with a task that cannot be done as written (#1893) | every task done, the deviation noted, tests pass |
| `apply-no-specs` | apply a tooling change with tasks but no delta specs and no `skip_specs` | never ticks tasks while `validate` still rejects the change, invents no requirement |
| `natural-spec-edit` | tidy a spec's wording, no skill named | requirement reworded with its promise and scenario kept, everything validates, no code touched |
| `multi-intent` | archive a finished change, then plan a new one, no skill named | archived, one new change planned, everything validates |
| `explore` | a design question | answers, writes nothing |
| `explore-draft` | shape a feature before planning | writes nothing; records whether it leaves a draft (scope, capabilities, requirements, open questions) |
| `no-project` | propose in a repo without OpenSpec | creates no `openspec/`, writes nothing |
| `propose-ids` | propose due dates | every new requirement and scenario heading starts with an ID, design decisions are `### D<n>` headings, validates; records whether design.md has an Alternatives section |
| `rename-by-id` | rename a requirement and a scenario in a spec that has IDs | the delta keeps both IDs, validates, and archive renames the requirement in place (needs #1979's CLI) |
| `propose-natural` | propose in plain words, no slash command | an OpenSpec skill was used, plus everything `propose` checks |
| `repo-list-sort`, `repo-validate-quiet` | propose against OpenSpec's own repository (44 specs), run with `--fixture` | one change on the existing capability, validates, no code touched |
| `oss-deprecated-option`, `oss-more-suggestions`, `oss-split-command` | propose against commander.js, which has no specs framework, run with `--fixture` | one change, validates, no code touched; a feature names its capability for the behavior, a refactor invents no requirement; records plan size, crowding, and for `oss-more-suggestions` whether the plan noticed commander already lists several suggestions when they tie |
| `propose-ripple` | propose due dates in a project whose export spec must now carry them | one change, validates (strict), no code touched; records whether the export spec gets a delta |
| `ff-change` | ff due dates; runs only with `--workflows` including `ff` | one change, proposal, delta specs and tasks written with none ticked, validates (strict), no code touched |
| `exp-retry-after`, `exp-split-response` | propose against expressjs/express, which has no specs, run with `--fixture` | one change, validates, no code touched; the refactor invents no requirement |
| `exp-trust-proxy`, `ins-iqr` | propose something the code already does (express's `trust proxy`, insyra's `DataList.IQR()`), run with `--fixture` | either declines and says what exists, or plans at most one change that validates; no code touched |
| `ins-winsorize`, `ins-split-ccl` | propose against insyra, a third-party project with 204 OpenSpec specs, run with `--fixture` | one change, validates, no code touched; the refactor invents no requirement |
| `bulk-archive-both` | bulk-archive two finished changes that both add to `todo-list` | both archived, main spec gains both requirements and keeps the rest, validates (strict), no code touched |
| `bulk-archive-partial` | bulk-archive "every change that is finished" when one is not built | only the finished change archived, the other stays active and out of the main spec, validates |
| `verify-clean` | verify a correct, finished change | reports no critical issue, writes nothing; records whether it ran the scenarios |
| `update-coherence` | reconcile a design that contradicts its spec, edits approved up front | design no longer contradicts the spec, spec still rejects unknown priorities, validates (strict) |
| `ff-breaking` | ff a breaking request (UUID ids) | one change, validates (strict), the break is flagged, the id requirement is MODIFIED; records whether the reply names a decision to confirm |
| `new-change` | new `add-due-dates` | change scaffolded by the CLI, no artifact written yet, shows the first artifact |
| `onboard-start` | onboarding's first turn | suggests a task in this codebase, asks, writes nothing |
| `onboard-full` | the whole onboarding cycle, one reply per pause (`followUps`) | one change planned, built and archived, tests pass, validates (strict) |

Scenarios also record observations that are not pass/fail, reported as rates: whether the agent read the existing specs (from the transcript), spec quality for `propose` (existing capability reused, a failure scenario per requirement, one obligation per requirement, no internals in requirement text), and for the apply scenarios whether the main specs ended current and the change archived.

## Run

Build each checkout first (`pnpm build`), then:

```bash
node scripts/skill-eval/run.mjs --label before --cli ../openspec-main --reps 5
node scripts/skill-eval/run.mjs --label after --cli . --reps 5
node scripts/skill-eval/compare.mjs scripts/skill-eval/results before after
```

`showcase.mjs` prints one scenario's artifacts from both sides next to each
other, for a reader who should not have to trust a number:

```bash
node scripts/skill-eval/showcase.mjs scripts/skill-eval/results before after --scenario exp-retry-after --file tasks.md
```

It lists every rep's count of cited requirement and decision IDs, then shows
the candidate's **median** rep, not its best, so the pair is typical of the run.

For planning quality, `judge.mjs` shows a judge model each rep's two plans as "Plan 1" and "Plan 2" in random order and asks which better serves the request:

```bash
node scripts/skill-eval/judge.mjs scripts/skill-eval/results before after --scenario propose
```

`--install single` installs the `openspec-beta` router and `openspec-beta-<workflow>` skills into the project (prompts become `/openspec-beta-<workflow>`), the way `npx skills add` lays them out.

`--install npx` installs the checkout's committed `skills/` mirror with the real `npx skills add <checkout> -a claude-code`, the way `npx` users get it (regenerate the mirror first).

`--skills <checkout>` takes the beta skills from another checkout than `--cli`. Pairing this branch's skills with an unmodified CLI shows the skills need nothing from the CLI they were written beside:

```bash
node scripts/skill-eval/run.mjs --label main-beta --cli ../openspec-main --grader ../openspec-main --skills . --install npx --reps 5
```

`--init-cli <checkout>` sets each project up with another checkout's CLI and then runs this one's `openspec update`, so every scenario also proves the upgrade path. `--delivery both` installs commands beside skills, the default for existing users.

`--model` picks the agent model, `--only a,b` runs some scenarios, and `--grader` sets the checkout whose CLI grades results (default: this one). Each run writes `<scenario>-<rep>.json` (checks, tokens, cost, turns, time) and the full `stream.jsonl` transcript.
