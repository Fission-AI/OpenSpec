# Capstone Whole-Delta Review Gauntlet (6.1) — Findings Ledger

Run 2026-06-11 over `origin/main...HEAD` with four mechanisms:
`/code-review` at max effort (3 finder fan-outs + a 12-candidate
verification pass + gap sweep), a 32-agent adversarial Workflow
(six lenses × refute-style verification + completeness critic), a
codex whole-delta review, and the audits' queued items. Every finding
below was CONFIRMED (most live-reproduced). Status column tracks the
fix round.

## P1 (2)

| # | Finding | Status |
|---|---------|--------|
| G1 | The recommended `~/openspec/<id>` layout makes `$HOME` a "nearest" root: any `openspec/` DIRECTORY counts in the walk, so every lifecycle command under the home tree silently lands planning files in `$HOME/openspec/changes/` and the registered-store hint never fires. | **fixed** (37ad867; live re-verified) |
| G2 | `status`/`instructions` `--json` thrown errors emit NO JSON document (plus a stray blank line on stdout); part of the broader JSON-failure-contract family. | **fixed** (37ad867; live re-verified) |

## P2 (13)

| # | Finding | Status |
|---|---------|--------|
| G3 | The JSON failure contract family: `show`/`validate` unknown item, `list` (no failurePayload AND the changes-dir throw), `store <unknown subcommand>`, all exit 1 with zero JSON on stdout; agent-contract.md currently claims this fixed. | **fixed** (37ad867; live re-verified) |
| G4 | `doctor`/`context` miss the shared `--store-path` rejection seam (Commander unknown-option instead of the typed `store_path_not_supported`). | **fixed** (37ad867; live re-verified) |
| G5 | doctor's unguarded `gitOriginUrl(root.path)` walks UP: a non-repo store nested in another checkout reports the enclosing repo's origin + spurious `store_remote_divergence` (live-reproduced; violates operations.ts's own documented guard). | **fixed** (37ad867; live re-verified) |
| G6 | Stale registry lock = permanent `store_registry_busy` with a fix that can never work; Ctrl-C during `store remove` (which holds the lock across a recursive rm) orphans it; doctor is blind to it; EACCES also misreported as busy. | **fixed** (37ad867; live re-verified) |
| G7 | Config-only roots: `new change` creates the change but never completes the shape (the scaffold guard fires only when `openspec/` is wholly absent) — doctor immediately calls the root the tool just wrote to unhealthy. | **fixed** (37ad867; live re-verified) |
| G8 | Prompt-injection surface: target `remote` strings, referenced-store spec ids (raw directory names), and Purpose summaries render verbatim into `<referenced_stores>`/instruction output — newlines/control chars from a hostile clone can forge instruction lines. | **fixed** (37ad867; live re-verified) |
| G9 | Five more accepted specs REQUIRE deleted behavior (artifact-graph, schema-resolution, change-creation P2; cli-update, openspec-conventions P3) — the L2 excision covered only cli-config/cli-artifact-workflow. | **fixed** (37ad867; live re-verified) |
| G10 | Generated workflow skills still instruct agents to parse `planningHome` from status JSON surfaces that changed (archive-change template). | **fixed** (37ad867; live re-verified) |
| G11 | The generated zsh completion script is syntactically invalid — the `--store` description's apostrophe ("you've") breaks zsh quoting (completeness critic, live). | **fixed** (37ad867; live re-verified) |
| G12 | `store remove` deletes the store folder BEFORE the registry write commits — a failed commit leaves a phantom registration pointing at deleted files. | **fixed** (37ad867; live re-verified) |
| G13 | Setup's prepare/execute split: directory policy (non-empty, nested-git) is asserted only at prepare; the interactive confirm gap is unbounded, and the rollback's `kind === 'missing'` branch recursively deletes content setup never created (live-reproduced both sides). | **fixed** (37ad867; live re-verified) |
| G14 | Orphaned fresh `.git` after a failed initial commit (cleanup nested under `createdPaths.length > 0`); a rerun then registers a commitless store — the exact empty-clone state the slice exists to prevent. | **fixed** (37ad867; live re-verified) |
| G15 | Registry rollback race: `commitStoreRegistration`'s catch deletes store metadata outside the lock and can delete metadata a concurrently committed registration depends on (live-reproduced; P3→P2 borderline, queued with G12/G13). | **fixed** (37ad867; live re-verified) |

## P3 (taken-cheap vs recorded)

Queued for the fix round (cheap, mechanical): fence-marker desync in
purpose extraction; stat-EACCES-as-absent in `pathIsFile` (registered
stores reported unregistered with clone fixes); `existsSync` vs
`isDirectory` in the stale-target sweep (a FILE at a mapped path
presents available and lands in the code-workspace); the scaffolded
config baking a one-off `--schema` as the root default; `list --json`
compact-vs-pretty inconsistency; the declared-pointer repo-id fix text;
the root-relative "Created change at" print (absolute path instead);
write-side cross-section overlap check; docs fixes (affected_areas
wording, `--remote` in the setup options table, `vibe` in --tools,
the stale `list` output example); the dead-code P3 queue from the
technical audits (apply fallback + resolveCurrentPlanningHomeSync,
resolveRegisteredStore, references barrel line, PlanningHomeSummary,
parseJson consolidation).

Recorded as known gaps for the report (not fixed this round, mapped to
Later Ideas / release notes): registry fsync durability; the reference
index byte budget growing linearly past 50KB at extreme reference
counts; Windows clone-recipe quoting (single quotes vs cmd.exe);
`view`/`templates`/`schemas`/deprecated noun forms remaining cwd-based
(documented in the agent contract); completions enumerating ids from
bare cwd; the cross-platform CI matrix not run on this branch;
semver/changeset planning for the deleted CLI surface; README not yet
describing the store model (L1 — public concept docs rewrite).

## Verdicts

- codex: FIX-FIRST (2 P2, 1 P3 — all in the table above).
- Workflow (32 agents, 6 lenses, refute-style verification): 25
  confirmed findings + 7 completeness gaps — all triaged above.
- /code-review max: 12/12 candidates CONFIRMED by the verification
  pass (3 cross-finding violations of the code's own documented
  invariants) + 6 gap-sweep finds — all triaged above.

All 15 P1/P2 findings were fixed in commit 37ad867 and re-verified by
live probes (the JSON contract codes, the --store-path seam, the
stale-lock steal, the config-only scaffold completion, the phantom-root
regression test) plus the full suite (97 files, 1,761 tests). The
queued-cheap P3 set landed in the same commit; the recorded-for-report
items appear in the release-readiness report's known gaps.
