## 1. Scaffold the reports folder

- [x] 1.1 Add `reports` to `CLEARSPEC_PROJECT_FOLDERS` in `src/core/config.ts` (both the fresh-mode and extend-mode arrays in `createDirectoryStructure()` derive from it, so no `init.ts` logic change is expected)
- [x] 1.2 Confirm `reports/` is created via the existing `FileSystemUtils.createDirectory()` (idempotent) in fresh mode, extend mode, and `--tools none`, using `path.join` only

## 2. Register the three workflows

- [x] 2.1 Add `clearspec-check-readiness`, `clearspec-deep-review`, and `clearspec-discover` to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`
- [x] 2.2 Add `check-readiness`, `deep-review`, and `discover` to `COMMAND_IDS` in `src/core/shared/tool-detection.ts`
- [x] 2.3 Add `check-readiness`, `deep-review`, and `discover` to `ALL_WORKFLOWS` in `src/core/profiles.ts` (so `WorkflowId` recognises them)
- [x] 2.4 Add `check-readiness`, `deep-review`, and `discover` to the `CORE_WORKFLOWS` list in `src/core/profiles.ts`

## 3. Author the skill and command templates

- [x] 3.1 Create `src/core/templates/workflows/check-readiness.ts`, `deep-review.ts`, and `discover.ts`, each exporting a `get<Name>SkillTemplate(): SkillTemplate` (names `clearspec-check-readiness`/`clearspec-deep-review`/`clearspec-discover`, `author: 'clearpoint'`, `version: '1.0'`) and the matching command-template getter, following the structure of `verify-change.ts`
- [x] 3.2 Define named constants for the report filenames (`readiness-report.md`, `review-report.md`, `discovery-report.md`) and the requirements-document filenames (`product-requirements.md`, `engineering-requirements.md`), and reference them from the skill bodies instead of inlining literals
- [x] 3.3 Encode the cross-cutting behaviour in every skill body: before doing anything, load the stage's own prior output and any prior-stage reports from `clearspec/reports/` (and `clearspec/requirements/` for `discover`) into context; continue from the recorded state; update documents in place; run whether or not prior outputs exist; resolve all paths relative to `clearspec/` cross-platform
- [x] 3.3a Instruct every skill body to gather project inputs — including any pre-existing Product/Engineering Requirements docs — in any format (Markdown, Confluence, Google Docs, PDF, or a combination) and from any source (connected MCPs such as Confluence/Google Drive, files under `clearspec/requirements/`/`clearspec/context/`, or dropped directly into the conversation); use whichever sources are present, degrade gracefully when an MCP source is unreachable, and treat any provided requirements docs as inputs distinct from the finalised outputs `discover` produces
- [x] 3.4 Author `check-readiness` (Phase 1): mechanically assess the input documents under `clearspec/requirements/` and `clearspec/context/`; flag missing/insufficient inputs as correctable issues; capture assumptions and risks; do NOT inspect or cross-reference code (a `discover` concern); write/update `reports/readiness-report.md` with a metadata header (status, flagged issues, assumptions, risks, input completeness, remaining gaps); explicitly do NOT run the deep interview
- [x] 3.5 Author `deep-review` (Phase 2): load the readiness report and inputs; run a one-question-at-a-time dialog with a recommended answer per question (grill-me/grilling style), exploring the input documents before asking (no code cross-referencing — deferred to `discover`); if an input file itself must change, direct the user back to `/clsx:check-readiness`; otherwise write findings/answers/discoveries to `reports/review-report.md` plus artifacts, recording outstanding questions in the metadata section
- [x] 3.6 Author `discover` (Phase 3): load inputs and both prior reports; request repos in `clearspec/code/` and cross-reference requirements against code, surfacing open questions/conflicts/risks in the engineering requirements; consolidate Product Requirements before Engineering Requirements, recording unavoidable product gaps explicitly and carrying them into each cycle; run verification cycles (re-assess validity/completeness/quality, update outputs, repeat until sufficient); produce `reports/discovery-report.md` and finalise `requirements/product-requirements.md` and `requirements/engineering-requirements.md` with status metadata headers; allow pausing to ask clarifying questions
- [x] 3.7 Ensure each command body references its `/clsx:` command (`/clsx:check-readiness`, `/clsx:deep-review`, `/clsx:discover`) and matches the slash-command style of the other command templates

## 4. Wire into generation

- [x] 4.1 Re-export the three new getter pairs from `src/core/templates/skill-templates.ts`
- [x] 4.2 Register the three skill entries (`template`, `dirName`, `workflowId`) in `getSkillTemplates()` in `src/core/shared/skill-generation.ts`
- [x] 4.3 Register the three command entries (`id: 'check-readiness' | 'deep-review' | 'discover'`) in `getCommandTemplates()`/`getCommandContents()` in `src/core/shared/skill-generation.ts`

## 5. Tests

- [x] 5.1 Update `test/core/shared/skill-generation.test.ts`: adjust the template-count assertions and assert the three new workflows are present with valid template structure and frontmatter
- [x] 5.2 Add skill-generation tests asserting `getSkillTemplates(['check-readiness'])` (and each of the others) returns the expected skill and that filtering excludes them when not requested
- [x] 5.3 Update `test/core/init.test.ts`: add the three skills to the expected `core` skill set and remove them from any non-core "should not exist" lists
- [x] 5.4 Add init coverage asserting the three `SKILL.md` files and the three `clsx/<id>` command files are generated for a tool (e.g. Claude Code), using `path.join()` for all expected paths
- [x] 5.5 Confirm the `reports/` folder assertion is covered by the existing `CLEARSPEC_PROJECT_FOLDERS` iteration in `test/core/init.test.ts` (fresh mode, extend mode, `--tools none`)
- [x] 5.6 Run `pnpm test` and confirm all skill-generation and init tests pass

## 6. Cross-platform verification

- [x] 6.1 Verify all new source and test path handling uses `path.join`/`path.resolve` with no hardcoded slashes
- [x] 6.2 Confirm Windows CI passes (or run the affected tests on Windows) to validate cross-platform path handling

## 7. Spec sync

- [ ] 7.1 After implementation, ensure the `cli-init` spec reflects the `reports/` folder, the 12 generated skills/commands, and the readiness workflows in the `core` profile (handled at archive time via the delta spec)
