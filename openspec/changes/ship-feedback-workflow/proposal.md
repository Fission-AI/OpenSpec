## Why

`CONTRIBUTING.md` asks every change to start with an issue. Filing one is now the
path of least resistance for someone who opens this repository on GitHub —
[#1847](https://github.com/Fission-AI/OpenSpec/pull/1847) added the issue forms and
the PR template. It is still not the path of least resistance for the person who
hits the bug: a user in their own project, with `openspec` installed and an agent
open, who says "file that as an issue."

Two things stand between them and a well-formed issue.

**The skill that was supposed to do this has never existed for anyone.**
`openspec/specs/cli-feedback/spec.md` specifies a `/feedback` skill that gathers
context, drafts, anonymizes, and submits. The template is written and exported
(`src/core/templates/workflows/feedback.ts`, re-exported at
`src/core/templates/skill-templates.ts:21`), but `feedback` is not in
`ALL_WORKFLOWS` (`src/core/profiles.ts:19`), so it is in no skill registry, no
tool's skill directory, and no user's project. The requirement is unimplemented,
and the parity suite records that deliberately: `skill-templates-parity.test.ts:83`
excludes it from the generated-skill list because it "is covered in function
payload parity" — the payload of a template nothing deploys.

**What the CLI emits does not match what the forms ask for.**
`openspec feedback "..."` posts a free-form `## Summary` / `## Details` body under
a `Feedback: ` title, with no expected-vs-actual, no repro, and no agent or model —
the four things triage asks for every time. It requests the `feedback` label, which
this repository does not define, so every submission falls back to unlabeled and
prints a note saying so. And the manual URL in `generateManualSubmissionUrl()`
(`src/commands/feedback.ts:127`) passes bare `title`/`body`, which now lands on the
*blank* issue form — so every user without `gh` bypasses the forms #1847 just added.

The result is that the two people most able to write a good bug report — the user
who just hit it, and the agent that watched it happen — are the two we equip least.

## What Changes

- **Register `feedback` as a workflow.** It joins `ALL_WORKFLOWS` and
  `CORE_WORKFLOWS`, so `openspec init` and `openspec update` install it by default
  alongside the six workflows already there. A skill nobody opts into does not
  change the outcome for anyone; see design.md for why this is worth a seventh
  core workflow and what it costs.
- **Author the missing command template.** `feedback` is the only workflow whose
  module exports a skill template and no `getOpsx*CommandTemplate`. Without one it
  is a skills-only workflow that `profile-sync-drift` reports as drift forever
  under `delivery: 'both'`.
- **Rewrite the skill to draft, not interrogate.** It already has the
  conversation, the failing command, the version and the platform. It fills those
  in itself, asks only for what it genuinely cannot infer, shows one complete
  draft, and submits on a single confirmation. Its fields are the bug form's
  fields, so a skill-filed issue and a form-filed issue read the same.
- **`openspec feedback --type bug|feature|feedback`.** Each type emits the body
  the matching form asks for and requests the labels that form applies — `bug,
  needs-triage`, `enhancement, needs-triage`, or `feedback` — so a CLI-filed
  report lands in the same triage queue as a form-filed one. `feedback` stays the default, so the bare command a
  user types today behaves exactly as it does today, including the retry that
  rescues a submission when a label is missing.
- **Define the `feedback` label in this repository.** It is the one the command
  has always asked for and the one this repository has never had, which is why
  every submission today is created unlabeled and apologizes for it. This is a
  repository setting, not code — no released version changes.
- **Prefill the form in the manual fallback.** The URL gains
  `?template=bug_report.yml` and the form's own field ids, so a user without `gh`
  lands on the filled-in form rather than a blank box. The URL is capped, and falls
  back to the blank-issue URL it builds today when prefill would exceed the cap.
- **Not breaking.** `openspec feedback "msg"` with no flags keeps its title,
  its body shape, and its exit codes. No existing workflow id, skill directory, or
  command name changes.

## Capabilities

### New Capabilities

None. The skill contract already lives in `cli-feedback` as the "Feedback skill
for agents" requirement; it is amended there rather than moved to an
`opsx-feedback-skill` capability, because moving it changes nothing for a reader
and costs a removal plus a new file.

### Modified Capabilities

- `cli-feedback`: `--type` and its effect on title, body, and label; the manual fallback URL
  targeting the issue form with prefilled fields; the feedback skill requirement
  amended to draft rather than interrogate, and stated as installed rather than
  merely specified.

## Depends on

[#1847](https://github.com/Fission-AI/OpenSpec/pull/1847), unmerged. It adds
`.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml`; every field id
this change prefills and the test that pins those ids read those files, so the
form-prefill work (tasks 5 and 6.11) cannot start until it lands. Everything else
here — registering the workflow, the command template, the skill rewrite, `--type`
— is independent of it.

## Impact

- **Affected behavior**: `openspec feedback` (new flag, new bodies, new fallback
  URL); `openspec init` and `openspec update` for every user, which now install a
  seventh core skill and command; `openspec config profile`, whose picker gains a
  row.
- **Existing projects**: `openspec update` adds the skill on the next run. Projects
  on a `custom` profile are nudged about the newly-core workflow rather than having
  it added silently, via the path `src/core/update.ts:689` already takes.
- **Unaffected**: every other workflow, the schema system, and
  `config-schema.ts`, which validates `workflows` as `z.array(z.string())` with no
  enum.
- **Docs**: `docs/commands.md`, `docs/workflows.md`, `docs/supported-tools.md`,
  `docs/glossary.md`, and `README.md` list workflows by name and gain a row.
- **Repository, not product**: the `bug_report.yml` / `feature_request.yml` field
  ids become an interface the CLI depends on. design.md states how that coupling
  fails safe.
