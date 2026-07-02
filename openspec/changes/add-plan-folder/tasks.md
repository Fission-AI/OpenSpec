## 1. Core

- [x] 1.1 Plan module: stage/context split, upward-ref scan, cross-repo rollup
- [x] 1.2 `plan` field in change metadata

## 2. Surfaces

- [x] 2.1 `openspec list --plan [--store <id>]` (human + JSON)
- [x] 2.2 `openspec new change --plan <where>`
- [x] 2.3 Plan stages in `openspec context` and the instruction block
- [x] 2.4 Retire superseded prototype surfaces

## 3. The skill

- [x] 3.1 `openspec-plan` skill + `/opsx:plan` command (explore-style stance),
      registered as an optional workflow (not in the core profile)

## 4. Proof

- [x] 4.1 Dogfood: this repo's `openspec/plan/` groups four real changes via
      `plan: local`; `openspec list --plan` rolls them up live
- [x] 4.2 Tests: plan module (solo + cross-repo), context/instructions
      surfacing, registries, skill parity
- [x] 4.3 `openspec validate add-plan-folder --strict` passes
