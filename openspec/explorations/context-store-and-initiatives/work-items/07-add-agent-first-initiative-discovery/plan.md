# Add Agent-First Initiative Discovery

## Status

Implementation complete; verification in progress.

## Source Of Truth

Start from `../../direction.md`.

This item exists because the expected workflow is agent-first:

```text
Using initiative billing-launch, explore the API work and create a proposal.
```

Before repo-local linking, local resolution, or workspace opening can work, the
agent needs a small command that answers:

- Which initiative did the user mean?
- Which context store contains the canonical initiative?
- Where is the initiative metadata, and what root should the agent inspect?

## Goal

Add agent-first initiative discovery without turning `show` into a reader,
progress dashboard, repo resolver, or workspace launcher.

## Locked Direction So Far

- `initiative show <id>` is a locator/discovery command.
- It should return identity, context-store location, initiative location, and
  the initiative metadata path.
- It should not concatenate markdown, summarize file contents, compute progress,
  resolve repos, list linked changes, or open workspaces.
- Default lookup searches all locally registered context stores.
- `--store <id>` filters to one registered store.
- `--store-path <path>` remains the explicit local-path escape hatch.
- Duplicate initiative ids across stores are ambiguous. The command should not
  auto-pick a match.
- In default all-store lookup, unreadable stores make the lookup incomplete.
  The command should fail rather than silently returning a possibly false
  unique match.
- Explicit `--store` and `--store-path` modes only consider the selected store.

## Output Contract Direction

The first JSON contract should be a resolver/read-pointer projection, not a
full serialization of `initiative.yaml`.

Suggested success shape:

```json
{
  "context_store": {
    "id": "platform",
    "root": "/path/to/platform-context"
  },
  "initiative": {
    "version": 1,
    "id": "billing-launch",
    "title": "Billing Launch",
    "summary": "Coordinate billing launch work.",
    "created": "2026-05-21",
    "root": "/path/to/platform-context/initiatives/billing-launch",
    "store_path": "initiatives/billing-launch",
    "metadata_path": "/path/to/platform-context/initiatives/billing-launch/initiative.yaml"
  },
  "status": []
}
```

Locked field decisions:

- Keep `initiative.version`.
- Keep `initiative.created`.
- Keep `initiative.id`, `title`, `summary`, `root`, `store_path`, and
  `metadata_path`.
- Keep `context_store.id` and `root`.
- Omit `context_store.source` from `initiative show` v1. It is selector
  provenance, not context-store identity. Existing create/list output can remain
  unchanged for now.
- Omit a top-level `resolution` field from v1.
- Omit `initiative.status` from the v1 projection.
- Omit `initiative.owners` from the v1 projection.
- Omit arbitrary `initiative.metadata` from the v1 projection.
- Omit a `files` list from the v1 projection.
- Omit top-level `matches`.
- Put ambiguity and incomplete-lookup candidates under the relevant diagnostic
  entry, such as `status[0].details.matches`.
- Keep top-level `status` as command diagnostics only, not initiative work
  progress.

## Still To Decide

- Nothing for the minimal v1 slice.

## Human Output Direction

Success output should stay locator-focused:

```text
OpenSpec initiative: Billing Launch

ID: billing-launch
Summary: Coordinate billing launch work.
Context store: platform
Location: /path/to/platform-context/initiatives/billing-launch

Files:
  Metadata: /path/to/platform-context/initiatives/billing-launch/initiative.yaml
```

Error output should stay plain:

- Not found: say the initiative was not found in registered context stores and
  suggest `openspec initiative list`.
- Ambiguous: show matching stores and paths, then suggest
  `openspec initiative show <id> --store <store>`.
- Incomplete lookup: say some context stores could not be read, include partial
  matches when present, then suggest `openspec context-store doctor`.

## File Listing Direction

`initiative show` should not list initiative folder contents in v1.

Only `initiative.yaml` is required to identify and validate the initiative. All
other files are schema/config dependent and may differ across teams. Once the
command has resolved `initiative.root`, agents can use normal filesystem tools
to inspect the folder. Later schema-aware views can expose important files
without hardcoding today's default template filenames.

## Completion Direction

Add static shell completion metadata for:

```text
initiative show <id> --store <id> --store-path <path> --json
```

Do not add dynamic completions for registered store ids or initiative ids in
this slice.

## Core Read Operation Direction

Add a focused `readInitiative` operation for exact lookup.

Behavior:

- Return `null` when the initiative folder or `initiative.yaml` is absent.
- Throw when `initiative.yaml` exists but is invalid.
- Throw when the parsed `initiative.yaml` id does not match the folder id.
- Do not scan unrelated initiative folders.

## Lookup Error Precedence

For default all-store lookup, any unreadable registered store makes lookup
incomplete.

If one or more readable stores contain the initiative and one or more other
stores cannot be read, the primary error should still be
`initiative_lookup_incomplete`, not success or ambiguity. Include any readable
partial matches under the diagnostic details.

Explicit `--store` and `--store-path` modes are scoped to the selected store and
do not check unrelated registered stores.

Invalid exact initiative folders are broken shared state, not "not found".

If `initiatives/<id>/initiative.yaml` exists but is invalid or has a mismatched
id, `initiative show` should fail with an invalid-initiative diagnostic. In
default all-store lookup, unreadable stores still take precedence as
`initiative_lookup_incomplete` because the full candidate set is unknowable.

## Explicitly Out Of Scope

- Top-level `openspec show` integration.
- Markdown content bundles or generated context packs.
- Checked-in initiative snapshots in repo-local changes.
- Repo-local change linking.
- Local repo/workspace resolution.
- Workspace opening.
- Git sync status, dirty state, remotes, pull, push, or conflicts.
- Initiative progress or status dashboards.
