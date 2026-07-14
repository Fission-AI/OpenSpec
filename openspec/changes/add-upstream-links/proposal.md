# Upstream work in stores: links, rollups, workflows, one door

## Why

Teams decide what to build before code exists, and that work spans repos.
Stores gave it a home; nothing gave it motion — no link from implementing
changes to the upstream work they serve, no cross-repo status, no way for
a store to define its own workflow or layout, and no simple entry point.
The initiatives experiment answered with a new untyped layer; users with
custom schemas showed the better shape: upstream work is a change in a
store, and everything else is the existing machinery working one level up.

## What Changes

- **Serves links**: `serves: <change>` / `<store-id>/<change>` in change
  metadata via `new change --serves <ref>` — validated up front, and the
  one flag wires everything: records the checkout for rollups
  (machine-local) and auto-adds `references:` to the repo's config.
- **Live rollup**: `list --downstream [--store <id>]` groups every change
  on the machine under the upstream change it serves; complete means the
  WHOLE change (tasks and schema artifacts); missing refs stay visible,
  archived targets resolve and are marked; `--scan <dir>` rolls up a
  directory of checkouts statelessly (CI needs no linked-root records).
- **Context flows down**: instructions for a linked change open with an
  `<upstream>` block — the upstream change's on-disk path, a directive to
  trace to a requirement, and the divergence rule (flag upstream instead
  of silently diverging).
- **Workflows are data**: schema `notes:` surfaced verbatim to agents;
  per-stage `instructions/<artifact>.md` files; inheritance through
  `references:` (project → referenced stores → user → built-in);
  `schema init` scaffolds custom stage names in the order given, into a
  store via `--store`; a built-in `requirements` workflow (proposal →
  specs with non-goals, success signals, and requirement traceability)
  is the default for fresh stores.
- **Layout is data**: `structure:` in config declares any folders or
  files (keys ending `/` are folders); `store setup` materializes what is
  missing (markdown seeded with its purpose, never overwriting) and
  `store doctor` flags drift.
- **One door**: a generated core-profile skill (`/opsx:store`) reads
  machine state via JSON commands, routes to the one applicable move
  (set up / draft / continue / link / status / archive / custom schema),
  and ends every reply with numbered next steps — zero mechanics of its
  own.
- **Truth boundary made schema-aware**: `validate` requires deltas only
  from schemas that define a specs artifact; new specs seed Purpose from
  the delta's own Purpose section or the change's stated intent; archive
  says "not tracked by this schema" instead of implying a missing
  tasks.md is a defect.
- **Removed**: the initiatives folder convention, stages, evergreen
  files, `list --initiatives`, and the initiatives skill; the noun
  returns to retired vocabulary, legacy metadata stays readable in both
  shapes it ever had.

## Capabilities

### New Capabilities
- `upstream-links`: the serves link, downstream rollup (including `--scan`
  and whole-change completion), and upstream context block
- `schema-openness`: notes, instruction files, inheritance, custom-stage
  scaffolding, executable structure declarations

## Impact

CLI (`new change --serves`, `list --downstream --scan`, `schema init/
validate/which --store`, store setup/doctor), core (`src/core/upstream.ts`
new; resolver, project config, references, archive, validate), generated
skills (new `store` workflow in the core profile), stores-beta docs and
the agent contract.
