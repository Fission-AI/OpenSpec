## Context
OpenSpec slash-command templates currently describe proposal/apply/archive workflows without any external backlog integration. The request is to wire those workflows to Linear via MCP so backlog selection, state transitions, and epic tracking happen automatically when a Linear MCP connection is present.

## Goals / Non-Goals
- Goals:
  - Detect Linear MCP availability and use it only when connected.
  - Persist a preferred Linear team/project configuration inside `openspec/` and reflect it in `openspec/project.md`.
  - Keep one Linear epic issue per source-of-truth spec under the preferred Linear project.
  - Use Linear backlog stories as the starting point for proposals and move story states through the lifecycle.
- Non-Goals:
  - Implement a non-MCP Linear API client.
  - Replace OpenSpec change naming or proposal structure.

## Decisions
- Decision: Store Linear preferences in `openspec/linear.yml` with `team_id` and `project_id` keys.
  - Rationale: YAML is concise, easy to hand-edit, and fits alongside existing markdown without frontmatter ambiguity.
- Decision: Add a new `## Linear MCP` section to `openspec/project.md` containing the preferred team and project IDs.
  - Rationale: Keeps the preferences visible in the primary project overview while still retaining the canonical config in `openspec/linear.yml`.
- Decision: Represent epics as regular Linear issues labeled `Epic` in the preferred project.
  - Rationale: The MCP API exposes issues and labels directly; using a label avoids relying on ambiguous milestone semantics.
- Decision: Use Linear issue description as the destination for proposal content (proposal body without frontmatter).
  - Rationale: Keeps the story aligned with the current proposal while avoiding YAML noise.
- Decision: Order backlog story selection by priority (fall back to recency if priority is unavailable) and show an interactive list.
  - Rationale: Aligns with the idea of “top stories” while keeping the prompt deterministic.

## Risks / Trade-offs
- Ambiguity around “epic” semantics in Linear could require adjustment if teams rely on milestones or issue types; the `Epic` label approach is a best-effort default.
- The Linear MCP may not be connected in all environments; instructions must degrade gracefully.

## Migration Plan
1. Update slash-command templates to include Linear MCP detection and the new workflow steps.
2. Add the new `linear-mcp-workflow` spec delta and validate the change.
3. Ensure any prompt-generation tests that assert template text are updated.

## Open Questions
- Should the `Epic` label name be configurable (e.g., `Epic`, `Milestone`, `Large Story`) via the Linear config file?
- Do we want to include Linear project names (in addition to IDs) in `openspec/project.md` for readability?
