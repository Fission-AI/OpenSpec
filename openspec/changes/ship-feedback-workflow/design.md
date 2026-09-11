## Context

See proposal.md — Why. Three facts about the existing code shape every decision
below.

- **Workflow ids are a wide seam, and part of it is compile-enforced.**
  `WORKFLOW_TO_SKILL_DIR` in `src/core/profile-sync-drift.ts:28` is typed
  `Record<WorkflowId, string>`, so adding an id to `ALL_WORKFLOWS` without adding
  it there fails `tsc`. Four other maps carry the same information without that
  protection: the duplicate `WORKFLOW_TO_SKILL_DIR` in `src/core/init.ts:111`
  (typed `Record<string, string>`), `COMMAND_TO_SKILL_NAME` in
  `src/utils/command-references.ts:53`, `OPENSPEC_SKILL_NAMES` in
  `src/core/config.ts:3`, and `COMMAND_IDS` in
  `src/core/shared/tool-detection.ts:41`. Only the first is protected; the other
  four drift silently, because the tests around them assert fixed counts rather
  than derive from `ALL_WORKFLOWS`.
- **`feedback` is the only workflow module with no command template.** Every
  other `src/core/templates/workflows/*.ts` exports a `getOpsx*CommandTemplate`
  beside its skill template. `getCommandTemplates()` and `COMMAND_IDS` assume the
  pair, and `profile-sync-drift` reads a missing command file under
  `delivery: 'both'` as drift to repair on every run.
- **The core profile is the default, and the only profile most users ever have.**
  `getProfileWorkflows` (`src/core/profiles.ts:45`) returns `CORE_WORKFLOWS`
  unconditionally for any non-`custom` profile and ignores `customWorkflows`
  entirely for `core`; `DEFAULT_CONFIG.profile` is `'core'`
  (`src/core/global-config.ts:45`). An id added to `ALL_WORKFLOWS` alone reaches a
  user only if they open `openspec config profile` and tick it, which also flips
  them to `custom`.

## Goals / Non-Goals

**Goals**

- A user who says "file that as an issue" gets a well-formed issue, without
  reading anything and without being interviewed.
- A skill-filed issue and a form-filed issue carry the same fields, so triage
  reads one shape.
- `openspec feedback` with no flags behaves exactly as it does today.

**Non-Goals**

- CI enforcement that every PR links an issue. #1834 rules it out, and a gate
  punishes the people the easy path has not reached yet.
- Sending anything anywhere without an explicit confirmation. Feedback submission
  stays a deliberate act, independent of telemetry
  (`cli-feedback` — "Feedback always works").
- Reading the issue forms at runtime. The CLI never fetches or parses
  `.github/`; see "Coupling to the forms" below.

## Decisions

### Keep the workflow id `feedback`

#1834 leaves this open: keep `feedback`, or rename to `report`?

Keep `feedback`. It is already the CLI verb (`openspec feedback`) and already the
capability name (`openspec/specs/cli-feedback/`). Renaming would split the skill from the command it tells the agent
to run, for a word that is no clearer at the point of use — a user asking to
"report a bug" and a user asking to "send feedback" both want the same skill, and
the skill's description is what an agent matches on, not its id.

`report` would also be the first workflow id that names a document rather than an
act, against `propose` / `apply` / `archive` / `verify`.

### Make it a core workflow, not an optional one

This is the one decision here that changes the default install for every user, and
it is the decision most worth arguing with.

The case for optional: the six core workflows are the steps of one loop — propose,
explore, apply, update, sync, archive. `feedback` is not a step in that loop. Every
core workflow costs a file in every configured tool's skill directory for every
user, forever, and a skill about the tool itself is a weaker claim on that space
than a skill about the user's work.

The case for core, which we take: the problem #1834 describes is not that the
feedback skill is hard to find, it is that nobody has it. Shipping it as opt-in
reproduces the current outcome at a smaller scale — the users who would tick a box
in `openspec config profile` are the users already able to write a good issue by
hand. The whole value is in reaching the user who has not read anything, and only
the default install reaches them.

The cost is bounded and reversible: one skill, one command file, no change to any
other workflow, and moving it out of `CORE_WORKFLOWS` later is a one-line change
with the same update path in reverse.

Consequence to handle rather than assume: existing projects on a `custom` profile
must not silently gain a workflow they did not choose.
`displayMissingCoreWorkflowsNote` (`src/core/update.ts:689`, called at `:656`)
already handles this: it returns early unless the profile is `custom`, diffs
`CORE_WORKFLOWS` against the user's workflows, points at `openspec config
profile`, and mutates nothing. This change relies on that path rather than adding
one.

### `--type` defaults to `feedback`, and each type carries the form's labels

| `--type` | Title | Body sections | Labels |
|---|---|---|---|
| `feedback` (default) | `Feedback: <msg>` | Summary, Details | `feedback` |
| `bug` | `<msg>` | What happened, Expected, Repro, Version, Agent, Environment | `bug`, `needs-triage` |
| `feature` | `<msg>` | Problem, Who it affects, What you tried, Proposal | `enhancement`, `needs-triage` |

Four things follow from this table.

The default is `feedback` because the bare command must not change behavior for
anyone typing it today. `--type bug` and `--type feature` drop the `Feedback: `
prefix, because a title reading `Feedback: archive drops the main spec` misfiles
a bug report.

The default keeps asking for the `feedback` label, and the fix for that label not
existing is to create it, not to stop asking. The alternative — dropping the label
request for the default type — buys one saved round trip and costs the ability to
find general feedback in the issue list at all, which is the thing the label is
for. `bug` and `enhancement` already exist. The missing-label retry stays for all
three, because a label that exists today can be renamed tomorrow and a renamed
label must not cost a user their report.

The labels per type are the forms' labels, `needs-triage` included. A report
filed by the CLI and a report filed through the form have to land in the same
triage queue, or the CLI path quietly skips it.

The fields per type are the issue forms' fields, in the forms' order. That is the
point: the same report, whoever files it and however.

### The manual fallback targets the form, and degrades to today's URL

`generateManualSubmissionUrl()` gains `template=bug_report.yml` (or
`feature_request.yml`) and one query parameter per form field id — GitHub's own
prefill mechanism, which needs no API and no auth.

Two failure modes are handled rather than hoped away.

**Length.** A prefilled URL carries the whole body twice-encoded, and a long
report can exceed what GitHub and some browsers accept. The builder caps the
encoded URL; over the cap it returns the blank-issue URL the command builds today,
with the body intact. A user who lands on a blank form with their text still in it
has lost formatting, not their report. `--type feedback` uses that blank-issue URL
unconditionally, since it has no form to target.

**Coupling to the forms.** The field ids (`what_happened`, `expected`, `repro`,
`version`, `agent`, `environment`; `problem`, `who`, `tried`, `proposal`) become an
interface the CLI depends on and `.github/` owns. The CLI does not read `.github/`
— it cannot, since it runs in the user's project. It hard-codes the ids, and a
test asserts that the ids it hard-codes are exactly the ids present in
`.github/ISSUE_TEMPLATE/*.yml`, so renaming a field in a form fails CI in this
repository rather than silently emptying a field for users. If an id ever does go
stale in a released version, GitHub ignores unknown prefill parameters: the user
gets the right form with one field blank, not an error.

### The skill's own `name` has to change, even though the workflow id does not

The workflow id and the skill's frontmatter `name` are different things, and
`feedback` is currently wrong in the second. `dirName` is a free literal per entry
in `getSkillTemplates()` (`src/core/shared/skill-generation.ts:61`), but the
SKILL.md frontmatter is written from `template.name`
(`src/core/shared/skill-generation.ts:142`), and every registered template sets
`name` equal to its dirName — `openspec-verify-change`, `openspec-onboard`, and so
on. `src/core/templates/workflows/feedback.ts:11` sets `name: 'feedback'`, written
when nothing deployed it.

Registering it as-is would commit `skills/openspec-feedback/SKILL.md` whose
frontmatter says `feedback` — the only skill where the two disagree, and a
disagreement with both `OPENSPEC_SKILL_NAMES` and the `/openspec-feedback`
reference in `COMMAND_TO_SKILL_NAME`. The template's `name` becomes
`openspec-feedback`; the workflow id stays `feedback`, exactly as `verify` maps to
`openspec-verify-change`.

### The command template must take `$ARGUMENTS`

`test/core/command-generation/adapters.test.ts:158` asserts that `onboard` is the
only command with no `$ARGUMENTS` placeholder, and the file describes that
assertion as a tripwire for exactly this situation. `/opsx-feedback <what went
wrong>` should accept the message anyway — an agent invoking it already has the
sentence.

## Risks / Trade-offs

- **A seventh core skill for every user.** Accepted above, and cheap to reverse.
- **Five parallel id maps, three unprotected.** This change adds a sixth entry to
  each. It does not consolidate them — that is a refactor with its own blast
  radius and belongs in its own proposal — but the tasks below touch all of them
  in one pass. Be clear about what actually catches an omission: only `tsc`, via
  the `Record<WorkflowId, string>` at `profile-sync-drift.ts:28`. The other guards
  are fixed-count assertions such as `tool-detection.test.ts:33`, which fail when
  you *add* an entry and stay silent when you skip one, and
  `command-references.test.ts:92`, whose list is hand-written and does not derive
  from `ALL_WORKFLOWS` — it omits `propose`, which is in the map. Omitting
  `feedback` from `COMMAND_TO_SKILL_NAME` fails nothing at all.
- **The skill tells an agent to run a command that posts to GitHub.** Mitigated by
  contract rather than convention: the amended skill requirement in `cli-feedback`
  keeps showing the complete draft and receiving explicit confirmation a MUST.
- **Anonymization is instruction, not enforcement.** An agent can still include a
  path it should have redacted. This is the same bound the existing spec accepts;
  making it mechanical would mean parsing the body the agent wrote, which is a
  different change.

## Migration

None for data. `openspec update` installs the new skill and command on the next
run; `openspec init` installs them for new projects. Projects on a `custom`
profile keep their selection and are nudged, not modified.
