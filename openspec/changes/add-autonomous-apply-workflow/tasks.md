# Tasks: add-autonomous-apply-workflow

## 1. Skill template infrastructure

- [ ] 1.1 Create `src/core/templates/workflows/autonomous-apply.ts` implementing `getAutonomousApplySkillTemplate()` returning the `openspec-autonomous-apply` SkillTemplate (name, description, instructions). Verify: `pnpm build` passes; template import resolves.
- [ ] 1.2 Register `openspec-autonomous-apply` in `OPENSPEC_SKILL_NAMES` in `src/core/config.ts`. Verify: `pnpm build` passes; registry diff clean.

## 2. Skill content (the reusable workflow contract)

- [ ] 2.1 Write Phase 1–P instructions: preflight (open change detection, config read, baseline branch commit, scope confirmation), worktree setup (path, cleanup, containment rules), apply implementation isolation. Include explicit prohibition of writes outside worktree and `$HOME` modification.
- [ ] 2.2 Write Phase R instructions: autonomous reference-run validation loop (run → inspect → classify → fix-one → rerun, detached launch, findings log, out-of-scope input-data classification) adapted from `Autonomous_Iterative_Workflow_Validation/SKILL.md` but parameterized by proposal reference command and dataset.
- [ ] 2.3 Write Phase R2 instructions: local multi-agent review fan-out with hard concurrency cap; two static reviewers (correctness, security) + optional dynamic reviewers; bounded `parallel()` usage; adversarial verification of findings; fix-round loop.
- [ ] 2.4 Write Phase V instructions: `openspec verify <change-name>` gate; failure feeds back into fix round.
- [ ] 2.5 Write Phase P1/P2 instructions: sequential interactive prompts for review mode (local agents vs GitHub PR reviewer vs manual) and merge strategy (user-manual, auto-PR-auto-merge-on-clean, auto-PR-wait-explicit-merge), all with explicit `AskUserQuestion`/equivalent usage; never parallel prompts.
- [ ] 2.6 Write Phase A instructions: merge to main (worktree cleanup), archive change via `/opsx:archive`, final checklist.
- [ ] 2.7 Write Guardrails section: never run reference command in foreground shell; never unbounded concurrency; never merge without user choice; pre-existing lint/test debt classification rule.
- [ ] 2.8 Write Assistant-Specific Notes: Claude Code (`Agent` tool with `isolation:"worktree"`, `Workflow` tool, `AskUserQuestion`), Codex (skill-embedded worktree instructions, sequential subagent mention pattern), OpenCode (`/opsx:autonomous-apply` name mapping, `~/.config/opencode/opencode.json` skills path note).

## 3. Generation and distribution

- [ ] 3.1 Run `pnpm build` then `pnpm generate:skills`; verify `skills/openspec-autonomous-apply/SKILL.md` is created. Verify: `git status` shows new file; parity test passes.
- [ ] 3.2 Update `skills/README.md` with a short mention of the new skill and its purpose.

## 4. Configuration support

- [ ] 4.1 Add optional `agent` block to project config schema in `src/core/project-config.ts` (e.g. `agent.max_parallel_requests: number` default 2) with Zod validation (must be integer 1–4). Verify: `pnpm test` includes schema validation test; invalid values warn and fall back to 2.

## 5. Installation documentation (three assistants)

- [ ] 5.1 Create `docs/install-claude-code.md`: Claude Code-specific install (npx openspec init, expected `.claude/skills/openspec-autonomous-apply` output, example user prompt to invoke `/openspec-autonomous-apply`).
- [ ] 5.2 Create `docs/install-codex.md`: Codex-specific install (npx openspec init --tools codex, `.agents/skills/` output, skill invocation behavior, concurrency-cap caveat).
- [ ] 5.3 Create `docs/install-opencode.md`: OpenCode-specific install (npx openspec init --tools opencode, `.opencode/skills/` output, `opencode.json` `paths`/`skills` configuration, `/opsx:autonomous-apply` name).
- [ ] 5.4 Update `docs/installation.md` (or README install section) with quick links to the three assistant-specific guides and a one-paragraph explanation of when to use autonomous-apply vs standard apply.

## 6. Testing and validation

- [ ] 6.1 Run `pnpm lint`, `pnpm build`, `pnpm test` (full vitest suite incl. parity); all green. Verify: no test regressions; parity test locks in generated skill.
- [ ] 6.2 Manual smoke: fresh temp directory, run `npx openspec@latest init --tools claude-code` (or local CLI equivalent), confirm `openspec-autonomous-apply/SKILL.md` is generated. Verify: install docs instructions alone are sufficient.
- [ ] 6.3 OpenSpec change parity: run `openspec status add-autonomous-apply-workflow --json` in OpenSpec repo and confirm all required artifacts exist. Verify: no missing artifacts.

## 7. Finalization

- [ ] 7.1 Create PR for branch `feat/openspec-autonomous-apply`, trigger review (Workflow fan-out per user preference), fix confirmed findings, merge to main. Verify: PR merged; main branch green.

