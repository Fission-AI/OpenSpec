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
- **`structure:` config** — declare what a root's folders are for; surfaced in `openspec context` and the references index
- **One-command store setup** — `openspec store setup <id>` no longer requires `--path` (defaults to `~/openspec/<id>`) and its output teaches the draft → serve → rollup loop

### Fixes

- Legacy `initiative:` change metadata is tolerated in both the object and string forms (read-only, never re-emitted) instead of failing `status`
- `openspec new change` no longer names the wrong schema in its progress line when the root's config sets a default
- `openspec schema init --default` now writes the `schema:` key the config reader uses (previously wrote `defaultSchema:`, which nothing read), and its next-step hint prints a valid command
