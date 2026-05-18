## 1. Workspace Guidance Model

- [ ] 1.1 Decide whether workspace guidance is injected through a generation transform, a small shared template block, or a dedicated workspace guidance skill.
- [ ] 1.2 Keep workspace setup/update installing profile-selected workflow skills rather than creating a separate workspace workflow family.
- [ ] 1.3 Define the workspace-mode guidance agents need before creating a change: inspect links, keep implementation read-only, identify likely affected areas, and preserve unresolved questions.

## 2. Change-Starting Skill Updates

- [ ] 2.1 Update `openspec-new-change` skill guidance for workspace planning homes.
- [ ] 2.2 Update `openspec-propose` skill guidance for workspace planning homes.
- [ ] 2.3 Update `openspec-ff-change` skill guidance for workspace planning homes.
- [ ] 2.4 In workspace mode, instruct agents to pass `--goal "<product goal>"` when creating the change.
- [ ] 2.5 In workspace mode, instruct agents to pass `--areas <names>` only for known registered workspace link names.
- [ ] 2.6 In workspace mode, instruct agents to omit `--areas` and record unresolved area questions in artifacts when areas are unclear.

## 3. Flag Semantics

- [ ] 3.1 Decide whether `--goal` should be rejected outside workspace-scoped change creation or explicitly documented for repo-local changes.
- [ ] 3.2 Align CLI help, tests, and generated skill instructions with the chosen `--goal` semantics.
- [ ] 3.3 Add tests for `--goal` and `--areas` behavior from workspace and repo-local planning homes.

## 4. Workspace Skill Verification

- [ ] 4.1 Add tests that workspace setup writes skills with workspace-native planning guidance.
- [ ] 4.2 Add tests that workspace update refreshes the workspace-native guidance.
- [ ] 4.3 Add tests that generated change-starting skills include the `--goal` / `--areas` workspace creation path.
- [ ] 4.4 Verify unsupported workspace workflows still guard against repo-local fallback edits.

## 5. Documentation And Review

- [ ] 5.1 Update CLI/docs text where users need to understand workspace-local skill behavior.
- [ ] 5.2 Run targeted tests for skill generation, workspace setup/update, and artifact workflow templates.
- [ ] 5.3 Run `openspec validate workspace-agent-guidance --strict`.
- [ ] 5.4 Manually inspect generated workspace-local skills from a clean workspace and record the observed guidance.
