# Add ATD Developer Docs Site

## Why

The ATD SDLC now spans two schemas (`atd-sdlc`, `atd-sdlc-lite`), a triage skill, an external standards store, and per-repo config — but the knowledge lives in two change directories and maintainer-facing collateral under `docs/atd/`, all shaped for people evolving this fork, not for the developers consuming the workflow. Pilot wave 1 participants need one browsable answer to "why this workflow, how do I get set up, which path does my ticket take, what does a real change look like". Without it, onboarding happens over Slack and the answers drift.

Depends on `add-atd-sdlc-schema` and `add-atd-sdlc-lite-triage` for content (both implemented); example pages additionally depend on pilot wave 1 producing real artifacts.

## What Changes

- Add a MkDocs Material documentation site under `docs-site/`, docs-as-code in this repo: markdown pages, mermaid diagrams rendered natively, instant search, no server-side machinery.
- Site structure: `index` (why: one workflow, ticket → documented, standards-conformant code), `architecture` (schema engine, 3-tier resolution, artifact DAG, stores, config/rules injection), `getting-started` (bootstrap, store registration, `openspec/config.yaml`, Atlassian MCP check), `flows/` (triage, full-sdlc, lite, escalation — diagrams lifted from the two shipped changes' design documents), `standards` (store, stack mapping, apply-time fetch, conformance tasks), `examples/` (example-full and example-lite incl. an escalation example, sourced from pilot wave 1's real redacted artifacts — stubs until then), `reference/` (config keys, FAQ).
- Add a GitHub Actions workflow: `mkdocs build --strict` on PRs touching the site (broken nav/links fail), build-and-deploy to GitHub Pages on push to main.
- Anti-drift rule: documentation is updated in the same PR as any schema, skill, or config-contract change. Enforced lightly — a PR-template checklist item plus the strict build; no bespoke content-diffing CI.
- Record one honest rollout prerequisite: verify the org's GitHub plan supports access-controlled Pages on private repositories (GitHub Enterprise Cloud). Fallback destination is Confluence export. This gates publishing, not authoring.

## Capabilities

### New Capabilities

- `atd-developer-docs`: the developer-facing documentation site — strict-buildable source in this repo, the required section set, flow diagrams matching the shipped schemas, examples from real pilot artifacts, the same-PR docs rule, and automated deployment.

### Modified Capabilities

None.

## Impact

- New: `docs-site/mkdocs.yml` + `docs-site/docs/**` (markdown pages only), `.github/workflows/docs.yml`, PR-template checklist item.
- No changes to schemas, templates, CLI, or core code — purely additive files; upstream sync cost stays minimal.
- `docs/atd/` collateral remains the maintainer-facing source for adoption tracking and prerequisites; the site lifts from it and links to it, never the reverse.
