## 1. enpal-spec-driven Schema

- [x] 1.1 Copy `schemas/spec-driven/` to `schemas/enpal-spec-driven/` (schema.yaml + all templates)
- [x] 1.2 Update `name` and `description` fields in `schemas/enpal-spec-driven/schema.yaml`
- [x] 1.3 Update the proposal artifact `instruction` in `schemas/enpal-spec-driven/schema.yaml` to reference the exploration convention (check `openspec/explorations/` for a matching doc before writing)
- [x] 1.4 Verify `openspec schema which enpal-spec-driven` resolves to `source: project`
- [x] 1.5 Verify `openspec schemas` lists `enpal-spec-driven`
- [x] 1.6 Verify a change created with `enpal-spec-driven` has the same artifact sequence as `spec-driven`

## 2. Exploration Doc Convention

- [x] 2.1 Ensure `openspec/explorations/` directory exists (create if needed)
- [x] 2.2 Document the path convention and doc structure in a `openspec/explorations/README.md` (format: `<yyyy-mm>/exploration-<date>-<topic>.md`, sections: Context, Rounds, Insights & Decisions, Open Questions)

## 3. Explore Skill — Exploration Doc Output

- [x] 3.1 Update the explore skill template (`src/core/templates/workflows/explore.ts`) to create the exploration doc at session start using `path.join()` for the path
- [x] 3.2 Implement topic derivation from skill argument (kebab-case from user input; prompt if no argument)
- [x] 3.3 Implement Phase 1 → Phase 2 transition: signal transition when concrete decisions surface, do not force if exploration is purely investigative
- [x] 3.4 Implement Q&A round structure: 2–5 questions per round, one theme per round, options with recommended choice marked, stop after each round and wait for reply
- [x] 3.5 Implement incremental append: after each round, append Q&A log to exploration doc (do not rewrite the file)
- [x] 3.6 Implement unlimited rounds: continue asking rounds until all significant ambiguity is resolved (no artificial round limit)
- [x] 3.7 Implement end-of-session wrap-up: write Insights & Decisions and Open Questions sections to doc, offer `/enpalspec:propose`
- [x] 3.8 Add Windows CI verification: test path construction for exploration doc on Windows path separators

## 4. Propose Skill — Exploration Scan and Gate

- [x] 4.1 Update the propose skill template to scan `openspec/explorations/` (all `<yyyy-mm>/` subdirectories) for matching exploration docs at invocation
- [x] 4.2 Implement topic matching: compare change description against exploration filenames and `# Exploration: <topic>` header line
- [x] 4.3 When match found: state explicitly which doc is being used, read it, seed proposal from Insights & Decisions
- [x] 4.4 When multiple matches found: list them, select most recent, state selection
- [x] 4.5 When no match found and change is non-trivial: prompt user ("No exploration found. Explore first, or continue anyway?")
- [x] 4.6 Implement trivial change detection: agent judges triviality from description (typo fix, rename, config value, no new capabilities); if trivial, skip gate and briefly state reasoning
- [x] 4.7 When user chooses "explore now": output instruction to run `/enpalspec:explore <topic>` and exit without creating artifacts
- [x] 4.8 Carry exploration Open Questions into design.md Open Questions section
- [x] 4.9 Add Windows CI verification: test exploration scan path construction on Windows
