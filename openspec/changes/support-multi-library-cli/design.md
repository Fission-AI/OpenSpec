# Design

## Context

Root selection currently returns one project-shaped root through `root-selection.ts`. Command adapters assume that root determines schema resolution, task counting, spec comparison, archive destinations, and workflow edit boundaries. Listing PR #2009 introduces a bounded descendant scanner and aggregate ownership metadata. See proposal.md for motivation and specs/cli-library-selection/spec.md for the shared contract.

## Goals / Non-Goals

**Goals:** Reuse one discovered library set per invocation; resolve an owner before delegation; preserve command-specific parsers, options, and output schemas; keep every write tied to one verified project root.

**Non-Goals:** A registered workspace, new layout, cross-library spec merging, bulk archive/update/init, or changing machine-level registry/config commands.

## Decisions

### Use an invocation-local library set

Promote #2009's small discovery helper to a shared library-discovery module. Keep the existing root resolver authoritative for explicit stores, project pointers, nearest local roots, and fallback provenance. Derive a local discovery base from the nearest selected project or, without a local selection, the original cwd. Never scan local descendants for a store-selected invocation.

Cache the discovery result within that command invocation, including canonical project paths, normalized relative labels, and diagnostics. Command adapters receive this result; they do not implement their own traversal. The scanner's exclusion list and legacy qualification rules stay shared. Avoid a process-global cache because tests and sequential CLI invocations must not retain stale filesystem state.

### Separate discovered scope from resolved command target

Discovery determines where a command may look. A target resolver determines exactly where it will execute.

- Aggregate commands iterate the library set and retain relative ownership labels.
- Existing-item commands collect candidates by `(canonical library, item type, item id)`. A unique candidate becomes the command root. Resolve `--type` before evaluating library ambiguity. Do not give a root-local duplicate priority over a descendant duplicate.
- Root-level operations use an explicit selection or the existing nearest root. Without either, a sole discovered library is usable; several require selection.
- `--library <project-path>` selects one eligible library within the invocation's discovered scope and suppresses aggregation. It resolves from the original cwd, not from whichever root was found first. It accepts the project directory containing `openspec/`, matching existing init/update positional targets. CLI hints quote paths with spaces.
- Existing explicit init/update positional paths keep their setup semantics, including initializing a new project without an existing library. Conflicting explicit targets or a combined store/library selection fail before execution.

A generic workspace abstraction and item identifiers encoded as `library:item` were considered. The former adds machinery without changing the required behavior; the latter conflicts with existing nested spec identifiers and shell/path syntax. An optional explicit selector keeps item IDs intact and default unique lookup automatic.

### Command coverage

| Command family | Default local behavior | Explicit target / write boundary |
| --- | --- | --- |
| `list`, `view` | Aggregate selected local library plus descendants | `--library` or store selects one library |
| `show`, `change show`, `spec show` | Unique owning-library lookup; labeled interactive choices | `--type` resolves type ambiguity; `--library` resolves owner ambiguity |
| `validate --all/--changes/--specs` and legacy bulk forms | Iterate libraries; keep each library's baseline and schema separate | Explicit library/store narrows validation |
| `validate <item>` and noun validation forms | Unique owning-library lookup | No arbitrary choice when names repeat |
| `status`, `instructions`, apply/archive instructions | Resolve named change owner; label candidate choices when omitted | Artifact paths and allowed edit roots come from the owner |
| `archive` and legacy archive forms | Resolve one change owner before preparing any write | Specs and archive destination stay in that library |
| `new change` | Existing nearest local root; otherwise sole discovered library | `--library` selects creation target; ambiguous targetless creation fails |
| `doctor`, `context` | Aggregate local health/working sets with library and reference provenance | Explicit library/store preserves single-root output |
| `schemas`, `templates` | Group inventories by library without merging same-named definitions | Explicit library chooses one project's definitions |
| `schema which/validate` | Resolve requested project schema in library scope; built-in names retain nearest/selected-root semantics | Duplicate project-local definitions require owner selection |
| `schema init/fork` | Nearest root or sole discovered library | Every schema write has one target |
| `init` / `experimental` | Existing cwd setup behavior and explicit positional path remain valid | `--library` targets a discovered product; never initialize all descendants |
| `update` | Nearest selected project or sole discovered library | Existing positional path / `--library` targets one project |
| `change list`, `spec list` | Aggregate matching inventories with ownership labels | Preserve noun-command deprecation warnings and single-root format |
| Store registry/setup, machine config, completion installation, feedback, version | Existing machine-level behavior | No local-library traversal |
| Workset management | Existing explicit member paths and saved selections | Members continue to identify their own roots |

`apply` is an agent workflow supported by apply instructions, not a newly invented CLI mutation command. Keep the owning product's implementation/edit scope in its action context. Root-library edits remain root scoped.

### Reuse data collectors and keep presentation separate

Extract view's existing change/spec collectors and section renderer only as needed to render several libraries. Build one aggregate summary, then per-library sections. Keep active-change percentage sorting, workflow artifact states, and per-library schema lookup. Empty libraries remain visible. Preserve a single-library dashboard layout where practical; no repeated absolute-path banners.

Show and named validation resolve an owner, then delegate to their existing change/spec implementations. Bulk validation retains the existing concurrency limit across the whole invocation rather than multiplying it per library. Compare each change delta against its owner's baseline. Archive receives the resolved owner before task checks, merge preparation, and move calculation.

Schema and template inventories identify owner-specific definitions even when names match. Context runs existing assembly for each local library and records declaration origin when deduplicating referenced store roots; local duplicate item names never collapse. Doctor retains established diagnostic codes and annotates aggregate results by library.

### Add metadata without replacing payloads

Preserve every single-library JSON shape, including errors and legacy noun arrays. Aggregated top-level results retain existing command payload arrays and add `library` to entries plus `roots` metadata. Validation issues retain locations relative to the owning root, with the library label making them unambiguous. Context keeps the selected root as `root` when one exists and adds discovered `roots`; without a selected local root, expose `root: null` with the discovered roots rather than inventing a project owner.

Legacy noun JSON remains an array; aggregated entries add library/root ownership fields instead of replacing that array with an envelope. Raw Markdown show stays raw; owner verification and ambiguity diagnostics use the existing stderr/error channels. Banners and ANSI styles never enter JSON.

### Do not choose through unreadable candidates

Aggregate reads collect one actionable diagnostic per library and continue with readable libraries. Existing-item mutations require complete candidate inspection before concluding that a name is unique. A failed library read can conceal a duplicate; therefore stop selection before any write. Explicitly selecting a healthy library can recover without touching an unhealthy sibling.

### Support native paths and existing terminal behavior

Use Node path operations and the shared canonicalization utilities for filesystem identity. Normalize display identifiers to relative forward-slash labels. Test native Windows separators, case/short-name aliases where supported, junctions, directory symlinks, and quoted path hints. Terminal colors inherit the existing theme, and plain/narrow output remains readable. Screenshots use fictional temporary fixture data.

## Risks / Trade-offs

- Duplicate names change formerly root-local direct behavior → return explicit candidates and copyable selection commands; preserve product cwd scope.
- An unavailable library can conceal a mutation target → require complete ownership resolution or explicit selection before delegating a write.
- Schema names are commonly repeated → preserve selected-root resolution for built-in schemas and label project-local schema inventories instead of merging definitions.
- Aggregate validation can increase work → prune traversal and share the existing concurrency bound; do not introduce configuration or background indexing.
- Global default stores and project pointers could leak unrelated work → reuse existing store precedence and suppress local aggregation for selected stores.
- Broad adapter coverage can leave aliases behind → maintain the command matrix as a test inventory, including deprecated noun forms, hints, and completion flags.

## Migration Plan

1. Obtain proposal approval before implementation, following CONTRIBUTING.md.
2. Land or reuse #2009's listing scanner and presentation conventions.
3. Introduce shared discovery/selection and wire aggregate reads, then named reads/workflows, then one-library mutations and aliases.
4. Update help, docs, agent guidance, completions, and a user-facing changeset in the implementation PR.
5. Run the contribution checks and Windows CI; publish fictional-data captures of view and cross-library inspection/validation.

Rollback the implementation changeset and adapters together; the repository layout and artifacts require no data migration.
