## 1. Author the missing command template

- [ ] 1.1 Add `getOpsxFeedbackCommandTemplate()` to
      `src/core/templates/workflows/feedback.ts`, following the shape of
      `getOpsxVerifyCommandTemplate`
- [ ] 1.2 Include an `$ARGUMENTS` placeholder so the message can be passed at
      invocation — `test/core/command-generation/adapters.test.ts:158` asserts
      `onboard` is the only command without one, and that assertion is the
      tripwire for this task
- [ ] 1.3 Re-export it from `src/core/templates/skill-templates.ts:21` beside the
      existing skill export

## 2. Rewrite the feedback skill to refine, then draft

- [ ] 2.1 Replace the skill instructions in
      `src/core/templates/workflows/feedback.ts`: find the observable facts
      first and never ask for one of them; put the user's judgements to them —
      what the report is really asking for, who it affects, what it excludes,
      whether the reported problem is the problem or a symptom — each with a
      recommended answer; order by dependency; stop when nothing material is
      unsettled; then one complete draft, submitted on one confirmation
- [ ] 2.2 Give it a way to skip refinement entirely when the report is already
      unambiguous. A skill that manufactures questions for a typo teaches users to
      stop invoking it
- [ ] 2.3 Make the drafted fields the issue forms' fields, per type, in the forms'
      order
- [ ] 2.4 Teach it `openspec feedback --type` and when to choose each type
- [ ] 2.5 Keep the anonymization rules and the show-draft-before-submitting
      guardrail from the current template — they are contract, not style
- [ ] 2.6 Write it in the current style rather than the template's original: state
      why something matters instead of stacking capitalised MUSTs, phrase
      instructions positively rather than as prohibitions, and cut anything not
      pulling its weight. The whole skill has to fit one SKILL.md — see design.md,
      "One file, no reference layer"
- [ ] 2.7 Change the template's `name` from `feedback` to `openspec-feedback`
      (`src/core/templates/workflows/feedback.ts:11`). The frontmatter `name:` in
      the generated SKILL.md comes from this field
      (`src/core/shared/skill-generation.ts:142`), and every other registered
      template sets it equal to its skill directory. Left alone, this would be the
      one skill whose frontmatter disagrees with its directory,
      `OPENSPEC_SKILL_NAMES`, and the `/openspec-feedback` reference in task 3.7.
      The workflow id stays `feedback`

## 3. Register `feedback` as a core workflow

Six id lists carry this information. Two are caught by `tsc` or a test; the rest
drift silently, so all six change in one pass.

- [ ] 3.1 `src/core/profiles.ts:19` — add `feedback` to `ALL_WORKFLOWS`
- [ ] 3.2 `src/core/profiles.ts:14` — add `feedback` to `CORE_WORKFLOWS`
- [ ] 3.3 `src/core/profile-sync-drift.ts:28` — add `feedback: 'openspec-feedback'`
      to `WORKFLOW_TO_SKILL_DIR` (compile-enforced: `Record<WorkflowId, string>`)
- [ ] 3.4 `src/core/init.ts:111` — add the same entry to the duplicate map there
      (typed `Record<string, string>`, so nothing catches its absence)
- [ ] 3.5 `src/core/config.ts:3` — add `openspec-feedback` to
      `OPENSPEC_SKILL_NAMES`, which drives tool detection and skill-status counts
- [ ] 3.6 `src/core/shared/tool-detection.ts:41` — add `feedback` to `COMMAND_IDS`
- [ ] 3.7 `src/utils/command-references.ts:53` — add the entry to
      `COMMAND_TO_SKILL_NAME`, without which `transformCommandInvocations` leaves
      the id unrewritten
- [ ] 3.8 `src/core/shared/skill-generation.ts:70` and `:97` — register the skill
      template and the command template, with their imports
- [ ] 3.9 `src/commands/config.ts:47` — add a `WORKFLOW_PROMPT_META` entry, or the
      picker shows the raw id (`test/commands/config.test.ts:399` enforces this)
- [ ] 3.10 Confirm `src/core/legacy-cleanup.ts:78` needs **no** entry: that list
      cleans up Codex prompts that once shipped, and `feedback` never did

## 4. `--type` on the CLI

- [ ] 4.1 `src/cli/index.ts:567` — add `--type <type>` beside `--body`
- [ ] 4.2 `src/core/completions/command-registry.ts:479` — add the same flag with
      its accepted values, or completions and the CLI disagree
- [ ] 4.3 `src/commands/feedback.ts` — validate the value, rejecting an
      unrecognized type before contacting GitHub
- [ ] 4.4 Build the title per type: the `Feedback: ` prefix for `feedback`, none
      for `bug` and `feature`; keep the existing 72-character grapheme-safe
      shortening for all three
- [ ] 4.5 Build the body sections per type, matching the issue forms' fields and
      order, with the existing metadata footer unchanged
- [ ] 4.6 Request the labels the matching form applies — `bug, needs-triage` for
      `--type bug`, `enhancement, needs-triage` for `--type feature`, `feedback`
      for the default; keep the missing-label retry for all three
- [ ] 4.7 Repository setting, not code: create the `feedback` label in
      `Fission-AI/OpenSpec`, which the command has always requested and the
      repository has never defined

## 5. Prefill the issue form in the manual fallback

Blocked on [#1847](https://github.com/Fission-AI/OpenSpec/pull/1847), which adds
the forms these field ids come from. Nothing else in this change is.

- [ ] 5.1 `generateManualSubmissionUrl()` in `src/commands/feedback.ts:127` — take
      the type, target `template=bug_report.yml` / `feature_request.yml`, and emit
      one parameter per form field id
- [ ] 5.2 Omit a field the command has nothing for, rather than sending it empty
- [ ] 5.3 Cap the encoded URL; over the cap, return today's blank-issue URL with
      the body intact
- [ ] 5.4 Return the blank-issue URL unconditionally for `--type feedback`, which
      has no form
- [ ] 5.5 Keep the `--- FORMATTED FEEDBACK ---` block printing the complete body
      on every fallback path, so no report depends on the URL surviving

## 6. Tests

The first one fails as soon as task 3.2 lands; the rest fail at 13.

- [ ] 6.1 `test/core/profiles.test.ts:12` — `expect(CORE_WORKFLOWS).toEqual([...])`
      is an exact-equality assertion on the six core ids and breaks at seven
- [ ] 6.2 `test/core/profiles.test.ts:27` (`ALL_WORKFLOWS` length) and `:31`
      (exact id list)
- [ ] 6.3 `test/core/shared/skill-generation.test.ts` — the count assertions at
      `:13`, `:94`, `:149`
- [ ] 6.4 `test/core/shared/tool-detection.test.ts:33`
- [ ] 6.5 `test/core/onboarding-commands.test.ts:52` — the note's exact text; note
      that `feedback` joining the **core** profile keeps this at "6 more
      workflows", so verify rather than assume
- [ ] 6.6 `test/core/init.test.ts:2117` and `test/core/update.test.ts:3441` —
      optional-workflow enumerations
- [ ] 6.7 `test/utils/command-references.test.ts:92` and `:139`
- [ ] 6.8 `test/commands/config-profile.test.ts` — a core workflow is checked by
      default, unlike the non-core pattern at `:222`

New coverage:

- [ ] 6.9 `test/commands/feedback.test.ts` — one case per `--type` asserting
      title, body sections, and requested label; the unrecognized-type rejection;
      and that the bare command is byte-identical to today's output
- [ ] 6.10 Fallback URL: form targeted per type, fields prefilled by id, blank-issue
      URL for `feedback`, and blank-issue URL when over the cap
- [ ] 6.11 A test asserting the field ids the CLI hard-codes are exactly the ids
      in `.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml`, so a
      renamed form field fails CI here rather than emptying a field for users
- [ ] 6.12 `test/core/init.test.ts` / `test/core/update.test.ts` — the feedback
      skill and command are written on the default profile

## 7. Parity: hashes and the static mirror

`scripts/parity-hash-shared.mjs` refuses to run while a registered skill has no
pinned hash, so 7.1 comes before 7.2.

- [ ] 7.1 `test/core/templates/skill-templates-parity.test.ts` — add
      `openspec-feedback` to `EXPECTED_GENERATED_SKILL_CONTENT_HASHES` and to
      `GENERATED_SKILL_FACTORIES`, add the command template to
      `EXPECTED_FUNCTION_HASHES`, and delete the comment at `:83` that explains
      why feedback was excluded
- [ ] 7.2 `pnpm build && pnpm regen:parity-hashes`, then
      `pnpm vitest run test/core/templates/skill-templates-parity.test.ts`
- [ ] 7.3 `pnpm build && pnpm generate:skills` to write
      `skills/openspec-feedback/SKILL.md`, and commit it —
      `test/core/templates/skillssh-parity.test.ts` asserts the committed
      directory set equals `getSkillTemplates()` exactly

## 8. Docs

- [ ] 8.1 Add the workflow to `docs/commands.md`, `docs/workflows.md`,
      `docs/supported-tools.md`, `docs/glossary.md`, and `README.md`, matching how
      each already lists `verify` and `onboard`
- [ ] 8.2 `docs-lab/reference/skills.md`, `docs-lab/customize/profiles.md`, and
      `docs-lab/reference/configuration/config-json.md`

## 9. Gate

- [ ] 9.1 `pnpm build && pnpm test && pnpm exec tsc --noEmit && pnpm lint` — the
      four commands CI runs; `pnpm build` first, because the suite runs against
      the build output
- [ ] 9.2 `pnpm changeset` — this changes what every user gets from `init` and
      `update`
- [ ] 9.3 `openspec validate ship-feedback-workflow --strict`
