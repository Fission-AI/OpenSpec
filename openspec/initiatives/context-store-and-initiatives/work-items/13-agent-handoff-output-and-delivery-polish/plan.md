# Agent Handoff Output And Delivery Polish

## Status

Proposed from the manual beta reality pass.

This work item captures the remaining agent-handoff and delivery-output gaps
that are smaller than the broader `initiative next` discussion but still matter
for the beta flow.

## Source Of Truth

Manual beta notes:

- `../11-manual-beta-reality-pass/notes.md`, especially the findings around
  post-setup agent guidance, relative `created_files`, and commands-oriented
  delivery warnings.

Related work:

- `../proposed-initiative-next-agent-handoff-ux/`
- `../14-workspaces-beta-guide-split/`
- `../15-context-store-project-roots-and-schema-led-initiatives/`

## Why This Exists

The beta pass showed that agents can succeed if they know which command to run,
but the first handoff is still too implicit. Setup output, JSON receipts, docs,
and generated delivery artifacts should make the next move obvious without
requiring the user to paste tribal knowledge.

This work item is deliberately narrower than an `initiative next` command. It
polishes existing command outputs and delivery semantics so a fresh agent can
continue safely.

## Goals

- Make setup and initiative creation output point to the next useful agent
  action.
- Ensure agent-readable JSON returns paths that can be used directly without
  path reconstruction when practical.
- Clarify commands-oriented delivery so "workflow commands" does not mean "the
  agent receives no OpenSpec guidance."
- Warn clearly when the selected tool cannot receive workflow slash commands.
- Keep baseline OpenSpec literacy separate from workflow entrypoints.

## Non-Goals

- Do not implement an `initiative next` command in this slice.
- Do not add progress dashboards or work-status rollups.
- Do not create initiatives, changes, or workspaces automatically as part of
  setup output.
- Do not make every relative path field disappear if existing compatibility
  requires it; add direct absolute path fields instead.

## Output Direction

Commands that create or prepare OpenSpec shared context should include a small
handoff block in human output:

```text
Next for your agent:
  Ask your coding agent to create or update an initiative in team-context.
```

JSON output should prefer both stable relative names and direct absolute paths
where agents need to write files:

```json
{
  "created_files": ["initiative.yaml", "brief.md"],
  "created_paths": [
    "/path/to/store/initiatives/billing-launch/initiative.yaml",
    "/path/to/store/initiatives/billing-launch/brief.md"
  ],
  "next_commands": {}
}
```

Delivery copy should distinguish:

- baseline OpenSpec guidance or literacy;
- workflow entrypoints such as skills or slash commands.

If a user selects commands-oriented delivery for a tool that has no command
adapter, output should warn that workflow slash commands are unavailable while
still installing or recommending baseline guidance when the tool supports it.

## Done When

- A fresh agent can continue after context-store setup or initiative creation
  using command output and docs, without guessing paths or beta command names.
- JSON receipts expose direct paths for created initiative artifacts or explain
  why only relative names are available.
- Commands-oriented delivery output clearly reports what guidance and workflow
  entrypoints were installed, skipped, or unavailable.
- The broader `initiative next` proposal can build on these outputs instead of
  solving first-run handoff from scratch.
