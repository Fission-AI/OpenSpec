# Tasks: Add ATD Workflow Façades

## 1. Shared workflow composition

- [x] 1.1 Extract parameterized instruction-body builders from `continue-change.ts`, `apply-change.ts`, `verify-change.ts`, and `archive-change.ts`; preserve existing generic skill and command output byte-for-byte; verify with focused template snapshot/parity tests
- [x] 1.2 Add the shared ATD schema guard (`schemaName` must be `atd-sdlc` or `atd-sdlc-lite`) and instruction-contract tests asserting the generated templates direct the agent to stop on a `spec-driven` change without mutation and to name the corresponding generic workflow

## 2. ATD workflow template modules

- [x] 2.1 Create `src/core/templates/workflows/atd-continue.ts` (skill `atd-change-continue`, command `atd-continue`) by composing the shared continue body; name journey step 2, create one next artifact from status/instructions, and hand off to `atd-change-apply` when apply-ready; verify `pnpm build` and focused tests
- [x] 2.2 Create `src/core/templates/workflows/atd-apply.ts` (skill `atd-change-apply`, command `atd-apply`) by composing the shared apply body; follow schema-provided standards/apply instructions, complete every tracked task including closure tasks, and hand off to `atd-change-verify`; verify focused tests
- [x] 2.3 Create `src/core/templates/workflows/atd-verify.ts` (skill `atd-change-verify`, command `atd-verify`) by composing the shared verify body; verify tests, AC traceability, standards, documentation, and closure readiness, then hand off to `atd-change-close`; verify focused tests
- [x] 2.4 Create `src/core/templates/workflows/atd-close.ts` (skill `atd-change-close`, command `atd-close`) by composing the shared archive body with a hard gate on `openspec instructions apply --json` reporting `state: "all_done"`; retain delta-spec assessment/sync/post-sync verification, never override incomplete work, and never perform publication or Jira closure; verify focused tests
- [x] 2.5 Update `src/core/templates/workflows/atd-triage.ts` so its hand-off names `atd-change-continue`; verify `test/core/atd-triage-workflow.test.ts`

## 3. Registry and profile surfaces

- [x] 3.1 Export the four template pairs from `src/core/templates/skill-templates.ts` and register them in both registries in `src/core/shared/skill-generation.ts`; verify exactly one skill and command entry per workflow id
- [x] 3.2 Add the four ids to `ALL_WORKFLOWS`, recompose `CORE_WORKFLOWS` as `atd-triage`, `atd-continue`, `atd-apply`, `atd-verify`, `atd-close`, `explore`, `update`, and update profile/config expectations and any `CoreWorkflowId` usages affected by removed generic core ids; verify profile tests and `tsc --noEmit`
- [x] 3.3 Extend `WORKFLOW_TO_SKILL_DIR`, `SKILL_NAMES`, and `COMMAND_IDS` with all four façades; add behavior tests proving façade-only skill and command installations are detected
- [x] 3.4 Add registry-parity coverage tying both generation registries, `WORKFLOW_TO_SKILL_DIR`, `SKILL_NAMES`, and `COMMAND_IDS` to `ALL_WORKFLOWS`; verify an intentional omission fails the test

## 4. Journey and delivery tests

- [x] 4.1 Add `test/core/atd-facades-workflow.test.ts` covering both skill and command surfaces: journey positions/handoffs, ATD-only schema guard, shared store guidance, continue/apply/verify composition, close hard gate, and absence of closure writes in close
- [x] 4.2 Add an integration test for `atd-close`: incomplete tasks block without override; completed full-schema tasks with unsynced deltas enter the archive sync assessment and cannot archive on failed verification
- [x] 4.3 Test core-profile init and update for skills-only, commands-only, and combined delivery: install the five ATD façades plus explore/update and remove or omit generic propose/sync/archive/continue/apply/verify surfaces
- [x] 4.4 Bump count/order expectations from 13 to 17 and run the full test suite

## 5. Distribution and coordination

- [x] 5.1 Run `pnpm build && pnpm generate:skills`; commit the four new `skills/atd-change-*/SKILL.md` files and verify skills.sh parity. Keep ignored `.claude/` output uncommitted
- [x] 5.2 Align `add-atd-docs-site` journey requirements with the five-step `atd-change-*` vocabulary before either change ships; verify both changes validate strictly
- [x] 5.3 Add the appropriate changeset for the user-visible workflow/profile change; verify package contents and release notes describe the new default ATD journey
