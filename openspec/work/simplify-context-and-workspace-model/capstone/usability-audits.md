# Capstone Usability Audits (6.1) — Results

Executed 2026-06-11 against the branch head.

## Error-catalog walk: 55 wrong turns, 46 pass, 9 fail

A live walk of every likely wrong turn on the new paths (13 walk
families, human + JSON surfaces), judged against the bar: actionable,
store-carrying, correct exit code, honest. The resolution-layer
taxonomy held up well — differentiated no-root hints, single-document
JSON failures with code/fix fields, shell-parseable clone fixes,
namespace-collision messages in both directions.

Failures (fixed before the release-readiness report; the fix round is
the next capstone commit):

- **F1 (P1)** Unparseable `openspec/config.yaml` in a real root dumps
  a raw YAMLParseError with node_modules stack frames
  (`project-config.ts` console.warn passes the error object).
- **F2 (P2)** The corrupt-registry fix never names the registry file —
  "Repair or remove the store registry file" with no path, and the
  suggested escalation (`store doctor`) dead-ends identically.
- **F3 (P2)** `instructions` under a corrupt registry drops the Fix
  line entirely (the ✖ Error surface).
- **F4 (P2)** `validate` failure summaries offer no drill-down command
  (nothing carries `--store`).
- **F5 (P2)** Implicit-root scaffolding (`new change` in a bare dir,
  non-interactive init) creates a root that doctor immediately calls
  unhealthy (no config.yaml/specs/archive) — the trap is the dishonest
  half.
- **F6–F9 (P3)** A bare pathless duplicate warning for malformed
  pointers on real roots; the pointer-to-unknown-store fix shaped for
  the wrong mistake; store-register-at-code-repo fix assumes a store
  clone; `archive <nonexistent>` lists no candidates while
  `status --change` does.

Full table preserved in the audit transcript (the gauntlet re-verifies
the fixes).

## Vocabulary sweep (including docs/cli.md)

- Retired `context store` forms: zero hits in the enforced live sweep
  roots (`src`, `test`, `docs`, `scripts`, and local `.codex` guidance
  when present). Planning-history artifacts under `openspec/` are
  intentionally outside that sweep.
- `workspace`: no deleted command-model token growth. Remaining live
  hits are intentional: the `.code-workspace` file format name (the VS
  Code convention), `workspace-file` opener style, compatibility tests,
  and historical comments. Generated templates remain pinned
  residue-free by the parity test.
- `initiative`: one genuine finding — `ChangeStatus.initiative`
  (instruction-loader) still passes a stored legacy initiative link
  through to status JSON. Reading legacy metadata is user-data
  tolerance (correct); RE-EMITTING it on a user-facing JSON surface is
  residue. Queued in the fix round: drop the passthrough, keep the
  schema parse tolerance. The `initiative_option_removed` rejection
  string is deliberate (the ledger's recorded survivor).
- `docs/cli.md` and README: clean for retired `context store` forms and
  old command-model terms; live `.code-workspace` wording remains by
  design.

## Time-to-first-success: 2 commands, 2 concepts

Measured live from a clean machine state (isolated XDG, no
configuration):

1. `openspec store setup team-plans --path ~/openspec/team-plans` —
   creates the store, registers it, prints the next command.
2. `openspec new change my-first-change --store team-plans` — the
   first store-scoped change exists; the output prints the next
   command (`status`) with `--store` carried.

Concepts a new user must hold: **store** (a standalone planning repo
registered on this machine) and **change** (the unit of work). The
root concept stays implicit until multi-root work begins. Every step's
output names the next step — the journey is self-guiding, which the
cold-start dogfood (journey 4) confirmed end-to-end.
