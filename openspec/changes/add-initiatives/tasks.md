## 1. Core

- [x] 1.1 Initiatives module: portfolio read (initiatives / evergreen /
      stages), upward-ref scan, cross-repo rollup, legacy normalization
- [x] 1.2 `initiative` field in change metadata: string ref union with the
      legacy object shape

## 2. Surfaces

- [x] 2.1 `openspec list --initiatives [--store <id>]` (human + JSON),
      including the outside-a-root fallback to registered stores
- [x] 2.2 `openspec new change --initiative <ref>`
- [x] 2.3 Initiatives in `openspec context` and the instruction block

## 3. The skill

- [x] 3.1 `openspec-initiatives` skill + `/opsx:initiatives` command
      (state-routed moves, numbered handoff menus), in the core profile so
      the documented happy path (`openspec init` → `/opsx:initiatives`) works

## 4. Proof

- [x] 4.1 Dogfood: this repo's `openspec/initiatives/smoother-setup/` groups
      real changes; `openspec list --initiatives` rolls them up live
- [x] 4.2 Tests: initiatives module (solo + cross-repo + legacy + fallback),
      context/instructions surfacing, registries, skill parity
- [x] 4.3 `openspec validate add-initiatives --strict` passes

## 5. Dogfood round 2 (real multi-repo product, this machine)

- [x] 5.1 Rollup discovers plain code repos: linking a change records the
      checkout (machine-local, nothing written into the repo)
- [x] 5.2 The join: `instructions` / `instructions apply` open a linked
      change with the initiative it serves and its upstream path on disk
- [x] 5.3 Completion nudge: a fully-complete initiative prompts an
      evergreen sync in the rollup
- [x] 5.4 Friction batch: store setup seeds `initiatives/`, link hints are
      store-qualified, `openspec init` leads the no-root fix, `--remote`
      help names the real metadata path
