# Agent Handoff Output And Delivery Polish

## Status

Deferred as an implementation item.

This work item captures a real beta pain, but the current "Next for your agent"
shape should not be built yet. It assumes a linear workflow path and risks
hardcoding guidance that does not fit dynamic agentic work.

Decision on 2026-05-30: skip this item for now. Keep the notes as research
input for a future handoff receipt model.

## Source Of Truth

Manual beta notes:

- `../11-manual-beta-reality-pass/notes.md`, especially the findings around
  post-setup agent guidance, relative `created_files`, and commands-oriented
  delivery warnings.

Related work:

- `../proposed-initiative-next-agent-handoff-ux/`
- `../14-workspaces-beta-guide-split/`
- `../15-context-store-project-roots-and-schema-led-initiatives/`

## Why This Was Proposed

The beta pass showed that agents can succeed if they know which command to run,
but the first handoff is still too implicit. Setup output, JSON receipts, docs,
and generated delivery artifacts should make the next move obvious without
requiring the user to paste tribal knowledge.

That pain is still valid. The uncertain part is the product shape. A fixed next
step may be wrong when the agent can inspect current state, discover existing
initiatives, skip workspace setup, continue from a repo-local change, or choose
a different planning route.

## Future Direction

If this is revisited, frame it as a receipt or affordance model:

- report what now exists;
- report where canonical context and created artifacts live;
- report relevant state and selected local bindings;
- optionally report available actions, not a required next command;
- avoid a single `next_command` unless the next action is genuinely
  deterministic.

Small deterministic output improvements, such as absolute `created_paths`, may
still be worth splitting into a narrower implementation slice.

## Non-Goals

- Do not implement an `initiative next` command in this slice.
- Do not add progress dashboards or work-status rollups.
- Do not create initiatives, changes, or workspaces automatically as part of
  setup output.
- Do not make every relative path field disappear if existing compatibility
  requires it; add direct absolute path fields instead.
- Do not hardcode a single user or agent journey.

## Deferred Output Sketch

Avoid this prescriptive shape for now:

```text
Next for your agent:
  Ask your coding agent to create or update an initiative in team-context.
```

If a future model exists, prefer contextual receipts:

```json
{
  "created_files": ["brief.md"],
  "created_paths": [
    "/path/to/store/initiatives/billing-launch/brief.md"
  ],
  "handoff_context": {
    "store": "team-context",
    "initiative": "billing-launch",
    "workspace": null
  },
  "available_actions": [
    "inspect_initiative",
    "open_workspace_view",
    "create_repo_local_change"
  ]
}
```

Delivery copy may still need separate work to distinguish:

- baseline OpenSpec guidance or literacy;
- workflow entrypoints such as skills or slash commands.

## Revisit When

- Item 14 clarifies the human guide versus agent playbook split.
- Item 15 clarifies sparse initiative artifacts and context-store project-root
  behavior.
- There is enough beta evidence to decide whether command output should expose
  state receipts, available affordances, direct paths only, or no special
  handoff block.
