# Upstream work: typed planning in a store

> Specs are what is true. Changes are what is in motion. **Upstream work is
> just a change in the store — typed by a schema the store defines.**

A team that plans before code moves (product briefs, platform contracts,
requirements handoffs) does not need a new folder convention. It needs the
two primitives OpenSpec already has, working one level up:

| Need | Mechanism |
|------|-----------|
| "Our planning work has its own shape" | a **schema in the store** (`openspec/schemas/<name>/`) |
| "Engineers' work should trace to ours" | a **serves link** (`openspec new change <name> --serves <store>/<change>`) |
| "What is true, standing, forever" | the store's **specs/** — archive syncs them, as always |
| "Where does everything stand" | `openspec list --downstream --store <id>` |

All output below is from a real run.

## The store defines the workflow

A schema is a folder. Long-form guidance lives in files beside it, and a
top-level `notes:` tells agents how this workflow differs from the default:

```text
product-hub/openspec/
  config.yaml                     # schema: product-brief  + structure: map
  schemas/product-brief/
    schema.yaml                   # brief → requirements, notes: no implementation phase
    instructions/brief.md         # per-artifact guidance as files, like templates
    instructions/requirements.md
    templates/…
  research/                       # declared in config `structure:` so agents know
  decisions/                      #   what these folders are for
```

Planning work is then an ordinary change, with review gates and artifact
dependencies enforced by the graph:

```text
$ openspec new change onboarding-revamp --store product-hub
Schema: product-brief
```

There is no apply phase in this schema — the schema's `notes:` say so, and
every instruction surface repeats it to the agent verbatim
(`<schema_notes>` in `openspec instructions`). When the requirements are
approved, archiving syncs them into the store's `specs/`.

## Downstream repos inherit and link

A repo that references the store sees its schemas the same way it already
sees its specs — resolution order is project → referenced stores → user →
package:

```text
$ openspec schemas          # in web-app, which references product-hub
  product-brief (from store 'product-hub')
```

Linking a change to the work it serves does all the wiring in one flag:
it records the checkout so rollups find this repo (machine-local, nothing
committed), and references the store so agents here see its context:

```text
$ openspec new change add-welcome-tour --serves product-hub/onboarding-revamp
Serves: product-hub/onboarding-revamp  (rollup: openspec list --downstream --store product-hub)
Referenced store 'product-hub' in openspec/config.yaml — agents here now see its context.
```

The serving change's instructions open with the upstream context on disk —
the intent travels without anyone pasting it:

```text
<upstream ref="product-hub/onboarding-revamp">
This change serves the change 'onboarding-revamp' in store 'product-hub'.
Upstream context: ~/openspec/product-hub/openspec/changes/onboarding-revamp
Before working, read its artifacts (proposal, specs, and any others its schema defines); …
</upstream>
```

## Status flows back live

Rollup is discovered from facts on disk (one `serves:` line per change, task
checkboxes), never from prose, and works from anywhere:

```text
$ openspec list --downstream --store product-hub

onboarding-revamp   1/2 serving changes complete
  ✓ add-invite-endpoint  api             2/2 tasks
  · add-welcome-tour     web-app         1/2 tasks
```

Truth flows up: archive the upstream change when its requirements land, and
the link keeps resolving — marked so downstream agents trace against specs:

```text
onboarding-revamp   1/2 serving changes complete  (archived — its requirements now live in specs/)
```

## Reference

| Surface | What it carries |
|---------|-----------------|
| `.openspec.yaml` | `serves: <change>` or `serves: <store-id>/<change>` |
| `schema.yaml` | optional `notes:` (workflow guidance, surfaced verbatim to agents) |
| `<schema>/instructions/<artifact>.md` | per-artifact instruction files; a file wins over inline `instruction:` |
| `config.yaml` | `structure:` — folder → purpose map, surfaced in `context` and the references index |
| `openspec schemas [--store <id>]` | includes inherited schemas with their source store |
| `openspec list --downstream [--store <id>]` | the rollup; outside any root it shows every registered store's |
| `openspec context` | referenced stores show artifact types, in-motion changes, and layout |
