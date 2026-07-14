---
"@fission-ai/openspec": minor
---

### New Features (stores beta)

- **Upstream links** — `openspec new change <name> --serves <store-id>/<change>` links a change to the store work it implements; the link wires context automatically (the store is referenced in the repo's config, the repo is recorded machine-locally for rollups), and the change's instructions carry the upstream artifacts to read first
- **Downstream rollup** — `openspec list --downstream [--store <id>]` shows each of the root's changes and every change on this machine that serves it, live from task checkboxes; archived upstream work stays visible and resolvable
- **Built-in `requirements` schema** — a documentation-only workflow (proposal → specs); fresh stores default to it, so a store is ready for shared planning with zero configuration
- **`openspec schema init` upgrades** — accepts `--store <id>` to scaffold into a registered store, and seeds per-stage `instructions/<artifact>.md` files (guidance agents receive, editable per stage) alongside templates
- **Schema inheritance** — repos that declare `references: [<store>]` resolve the store's schemas (project → referenced stores → user → built-in); `openspec schemas` labels inherited entries with their source store and accepts `--store <id>`
- **Schema `notes:` and instruction files** — a schema's top-level `notes:` are surfaced verbatim on every instruction surface; `instructions/<artifact>.md` beside the schema wins over inline `instruction:`
- **`structure:` config, now executable** — declare any folders or files in a root's layout (keys ending `/` are folders, other keys files); surfaced in `openspec context` and the references index, materialized by `store setup <id>` (markdown files seeded with their purpose), and drift is flagged by `store doctor`
- **`/opsx:store` — one door** — a generated skill (core profile) that reads machine state and routes the whole loop conversationally: set up, draft, link with `--serves`, show status, archive; every mechanic stays a deterministic CLI command underneath
- **One-command store setup** — `openspec store setup <id>` no longer requires `--path` (defaults to `~/openspec/<id>`) and its output teaches the draft → serve → rollup loop
- **Stateless CI rollups** — `openspec list --downstream --scan <dir>` scans a directory of checkouts with no per-machine state, so a CI job can publish team-wide status
- **Whole-change rollup status** — a serving change only counts as complete when its tasks AND its schema's artifacts are done; half-done work renders both counts
- **Custom stages in `schema init`** — `--artifacts` accepts custom kebab-case stage names in workflow order (each stage requires the previous); `schema validate` and `schema which` accept `--store <id>`

- **Intent stays honest** — a serving change's instructions carry a divergence rule (flag upstream instead of silently diverging), and the built-in `requirements` workflow now asks for explicit non-goals and measurable success signals, with requirement-traceability enforced in its specs guidance

### Fixes

- Legacy `initiative:` change metadata is tolerated in both the object and string forms (read-only, never re-emitted) instead of failing `status`
- `openspec new change` no longer names the wrong schema in its progress line when the root's config sets a default
- `openspec schema init --default` now writes the `schema:` key the config reader uses (previously wrote `defaultSchema:`, which nothing read), and its next-step hint prints a valid command
- `openspec validate` no longer demands delta specs from changes whose workflow schema defines no specs artifact (deliberately spec-less workflows validated with a spurious error)
- New specs created by archiving seed their Purpose from an explicit `## Purpose` in the delta spec, then the proposal's Why section, instead of a TBD placeholder
- Instruction output no longer ships an empty `<success_criteria>` placeholder; `status` prints a glyph legend when artifacts are blocked; archiving a change whose schema has no tasks phase says "not tracked by this schema" instead of "No tasks"
