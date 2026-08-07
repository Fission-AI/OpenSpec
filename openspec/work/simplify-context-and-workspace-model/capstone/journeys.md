# Capstone Persona Journeys (6.1) — Results

Executed 2026-06-11 against the branch head. All four pass.

## Journey 1 — Fresh team: PASS (standing e2e)

`test/cli-e2e/store-lifecycle.test.ts` (the 1.3 journey, maintained
through the rename and deletions): machine A creates a store via
`store setup` (committed, clonable), works a change through archive
from a pointer project repo, the project repo stays byte-identical;
machine B clones, registers without ceremony, reads promoted specs.
Green in every full-suite run (now part of the 1,761-test suite).

## Journey 2 — Layered PM-to-dev flow: PASS (new e2e)

`test/cli-e2e/capstone-journeys.test.ts`: requirements live in a
`product-requirements` store; the app repo has its OWN root and a
`references:` declaration. The agent discovers the relationship from
config alone (`openspec context --json` surfaces the member with its
fetch recipe), follows the recipe verbatim to cite the upstream spec
(`openspec show billing-rules --type spec --store product-requirements`),
and the low-level design change lands in the app repo's root while the
store stays read-only throughout.

## Journey 3 — Externalized planning: PASS (new e2e)

Same file: a code repo with NO local root and only `store: team-planning`
in its config runs the entire lifecycle — new change, status,
instructions for every artifact, archive — with ZERO `--store` flags.
The change lives and archives in the store; the code repo never grows
planning state (its `openspec/` still holds only `config.yaml` at the
end).

## Journey 4 — Cold-start agent: PASS (headless dogfood)

A fresh codex headless session (gpt-5.5, medium reasoning) in a scratch
world: a `billing-app` TypeScript project, the `openspec` CLI on PATH,
isolated XDG state, and ONLY the vague prompt "set up planning in a
separate repo for this project... discover how it works from its
--help output." No insider knowledge.

The agent produced the then-intended topology unprompted:

- `openspec store setup billing-app-planning` → a standalone planning
  repo with specs/changes/config/store metadata, its own git history;
- the pointer `store: billing-app-planning` written into the project
  repo's `openspec/config.yaml`;
- self-verified with `openspec doctor`, `openspec context`, and
  `openspec validate --all --store billing-app-planning`.

Independently verified after the run: `openspec context --json` from
inside `billing-app` resolves the declared root. Later review removed the
code-repo relationship portion; the retained proof here is the store setup and
pointer flow.
