# Where every current page goes

The old-to-new mapping: the source material for each `docs-lab/` page while drafting,
and the redirect list at cutover. The target structure is the page index in
[README.md](README.md).

| Current (`docs/`) | Destination |
|---|---|
| README.md (index) | `start/overview.md`, rewritten as pitch and routing |
| getting-started.md | `start/quickstart.md` |
| installation.md | split: `start/installation.md` (machine-level: matrix, update, uninstall) · `start/setup.md` (project-level: init, what init writes, skills-vs-commands delivery, stores router) |
| how-commands-work.md | `start/quickstart.md` (inline labels) · `help/faq.md` · `help/troubleshooting.md` |
| existing-projects.md | `guides/existing-codebases.md` ("Existing codebases"); walkthrough half to `start/quickstart.md` |
| overview.md | `guides/concepts.md` |
| concepts.md | `guides/concepts.md` (core) · delta format to `reference/schemas/spec-driven/index.md` (Delta specs section) · embedded glossary table deleted |
| explore.md | `guides/explore.md` |
| workflows.md | `guides/apply.md` (execution patterns, continue/ff) · `reference/skills.md` |
| opsx.md | split four ways: config to `customize/project-config.md` · commands to `reference/skills.md` · philosophy to `guides/concepts.md` · architecture to `reference/architecture/` |
| reviewing-changes.md + writing-specs.md | `guides/review-the-plan.md` (merged) |
| editing-changes.md | `guides/change-course.md` |
| team-workflow.md | `guides/teams.md` |
| examples.md | parked: `guides/examples.md` skeleton kept off the index and sync config until real archived changes exist (see README TODOs) |
| customization.md | `customize/project-config.md` + `customize/schemas.md` + `customize/overview.md` (decision ladder) · schema.yaml fields to `reference/schemas/schema-yaml.md` |
| multi-language.md | `customize/project-config.md` §Language and conventions |
| stores-beta/user-guide.md | `multi-repo/stores.md` |
| commands.md | `reference/skills.md` (legacy `/openspec:*` section removed) |
| cli.md | `reference/cli.md` (minus install, which moves to `start/installation.md`) |
| supported-tools.md | `reference/supported-tools.md` |
| glossary.md | `reference/glossary.md` |
| faq.md | `help/faq.md` (unpublished-model claim deleted; update/uninstall to `start/installation.md`) |
| troubleshooting.md | `help/troubleshooting.md`, canonical home for all 5 copies, plus Getting help |
| migration-guide.md | `help/legacy/migration.md` (demoted) |
| agent-contract.md | **off-site**, to repo-side contributor docs |

New pages with no single current source: `customize/overview.md`, `customize/profiles.md`
(today: scattered two-line fragments across 12 pages), and the
`reference/schemas/` and `reference/configuration/` sections (which replaced the
planned `reference/file-formats.md`).

## Cutover

Point `website/docs.sync.config.mjs` here, add old-to-new redirects in
`website/cloudflare/router/worker.js`, verify `llms.txt` / `llms-full.txt` /
per-page markdown routes, then this folder replaces `docs/`.
