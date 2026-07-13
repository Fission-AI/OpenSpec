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

A fresh store needs no setup: its changes default to the built-in
`requirements` workflow (proposal → specs, documentation-only — its `notes:`
tell agents there is no implementation phase). To encode your own chain,
scaffold a schema and add one artifact per handoff:

```text
$ openspec schema init product-flow --artifacts proposal,specs --store product-team
✔ Created schema 'product-flow'

Each artifact is a stage — order them with requires: in schema.yaml.
Guidance agents get per stage lives in instructions/<artifact>.md.
```

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

## Any format, one opinion

Artifacts are fully open — any filename, any document format, any template.
A team's existing product-spec format is a 15-line schema away, and a
change made of nothing but that document creates, gates, and archives
cleanly. OpenSpec holds exactly one format opinion, at the truth boundary:
deltas you want merged into standing `specs/` at archive time use the
requirement/scenario format. Freeform artifacts archive as-is, and
validation is schema-aware: a workflow that defines no specs artifact is
never asked for deltas.

## Team-wide status

The rollup reads checkouts on the machine it runs on — pull a teammate's
repo and their work appears. For an always-current team view, run the same
command somewhere that already has every repo. `--scan <dir>` rolls up a
directory of checkouts with no per-machine state at all, so a CI job is
four lines (run against a real fresh environment):

```text
$ git clone <store-remote> plans
$ git clone <repo-remotes...> checkouts/…
$ openspec store register ./plans --id team-plans
$ openspec list --downstream --store team-plans --scan ./checkouts

onboarding-revamp   0/2 serving changes complete
  · api-implements      api             1/2 tasks
  · web-app-implements  web-app         1/2 tasks
```

Publish the `--json` form of that output and the whole team has one answer
without any new machinery.

Schemas version the same way everything in a store does: git. Pulling the
store updates the workflow for every repo that references it; a repo that
needs to pin or diverge defines a project-local schema with the same name,
which wins.

## Reference

| Surface | What it carries |
|---------|-----------------|
| `.openspec.yaml` | `serves: <change>` or `serves: <store-id>/<change>` |
| `schema.yaml` | optional `notes:` (workflow guidance, surfaced verbatim to agents) |
| `<schema>/instructions/<artifact>.md` | per-artifact instruction files; a file wins over inline `instruction:` |
| `config.yaml` | `structure:` — folder → purpose map, surfaced in `context` and the references index |
| `openspec schema init <name> [--store <id>]` | scaffold a workflow: schema.yaml + instructions/ + templates/ |
| `openspec schemas [--store <id>]` | includes inherited schemas with their source store |
| `openspec list --downstream [--store <id>]` | the rollup; outside any root it shows every registered store's |
| `openspec context` | referenced stores show artifact types, in-motion changes, and layout |
