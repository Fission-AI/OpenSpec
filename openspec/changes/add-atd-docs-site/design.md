# Design: ATD Developer Docs Site

## Context

`add-atd-sdlc-schema` and `add-atd-sdlc-lite-triage` shipped the workflow; their proposal/design documents and `docs/atd/*.md` are accurate but written for maintainers of this fork. Developers joining pilot waves need consumer-facing onboarding: purpose, setup, the flows their tickets take, and worked examples. The destination decision is already made with the user: MkDocs Material, docs-as-code in this repo, GitHub Pages via Actions.

## Goals / Non-Goals

**Goals**

- One browsable site covering why → architecture → getting started → flows → standards → examples → reference.
- Docs live next to the schemas they describe, so a schema change and its docs change share one PR (anti-drift).
- Zero operational burden beyond editing markdown — CI builds and deploys.

**Non-Goals**

- Documenting upstream OpenSpec generally (link out to upstream docs).
- Site versioning before a second major workflow version exists.
- CI machinery that content-checks docs against schema instructions.
- Replacing `docs/atd/` rollout collateral — it stays the maintainer source of truth.

## Decisions

### D1: MkDocs Material, not Confluence and not a README tree

Material gives markdown-in-repo, native mermaid rendering (superfences), instant search, and a one-step CI build. Alternative: Confluence as the primary home — rejected because WYSIWYG edits happen outside PR review, which breaks the same-PR anti-drift rule and reintroduces the docs/code divergence this site exists to prevent; Confluence survives only as the publishing fallback (D6). Alternative: a plain `README.md`/`docs/` tree — rejected; no navigation or search, and it is essentially what `docs/atd/` already is, which demonstrably does not onboard consumers.

### D2: Same repo, not a separate docs repo

The anti-drift rule is only enforceable when the schema diff and the docs diff are reviewable in one PR. A separate docs repo needs cross-repo coordination for every schema change and recreates the drift problem with extra ceremony. Rejected.

### D3: No versioning (no mike) yet

`mike` adds version-selector machinery to serve multiple doc versions; there is exactly one workflow version. Latest-on-main is correct until a breaking schema revision ships, at which point adopting mike is a small, isolated change. Alternative: setting up mike now "to be ready" — rejected as machinery ahead of need.

### D4: Anti-drift via PR checklist + strict build, not content-checking CI

A CI job that verifies "docs describe the schemas" would have to parse instruction prose and diff semantics — over-engineering for a docs site. Instead: (a) `mkdocs build --strict` runs on every PR touching `docs-site/`, so broken nav and dead internal links fail fast; (b) a PR-template checklist item — "schema/skill/config-contract change → docs-site updated in this PR" — puts the rule in front of every reviewer. Alternative considered: a path-based gate failing PRs that touch `schemas/` without touching `docs-site/` — deferred; it punishes comment fixes and refactors that change no documented behavior, and the pilot will show whether the checklist suffices before adding friction.

### D5: Flow diagrams lifted from the change design documents, not generated

The mermaid diagrams in `add-atd-sdlc-schema/design.md` and `add-atd-sdlc-lite-triage/design.md` are the reviewed source of truth for the shipped flows; flow pages carry them (adapted only for page context), and any change altering a flow updates the page diagram in the same PR per D4. Alternative: generating diagrams from `schema.yaml` DAGs — rejected; the DAG alone cannot express the grilling gate, the final task group, or escalation semantics, so generation would produce emptier diagrams plus generator machinery.

### D6: Examples are real pilot artifacts; stubs until then

`examples/example-full.md` and `examples/example-lite.md` (including one escalation walk-through) are populated from pilot wave 1's real change artifacts, redacted as needed. Synthetic examples drift from real agent output and teach the wrong texture. Until pilot artifacts exist, the pages ship as explicit "pending pilot wave 1" stubs — an honest gap beats invented content presented as real.

## Risks / Trade-offs

- [Access-controlled Pages on private repos requires GitHub Enterprise Cloud; the org's plan is unverified] → recorded as a rollout prerequisite with its own verification task; fallback is exporting the site content to Confluence. Authoring and CI validation proceed either way.
- [Docs drift from shipped schemas] → same-repo same-PR rule, PR checklist item, strict build, and a named diagram source of truth (the change design documents); pilot onboarding questions will surface stale pages quickly.
- [Screenshot rot] → prefer text and mermaid over screenshots; where a screenshot is genuinely needed, caption it with the CLI version it shows so staleness is detectable.
- [Example pages blocked on pilot wave 1] → the dependency is stated on the stub pages; every other section is useful without them.

## Rollout

Author the site and CI first — both work regardless of Pages licensing (`mkdocs build --strict` needs no deployment target). Verify the Pages prerequisite before the first deploy; if unsupported, publish via the Confluence-export fallback and keep the prerequisite open. Announce the site to pilot wave 1 participants and treat their onboarding questions as FAQ input; populate the example pages from the pilot's real artifacts once wave 1 completes.
