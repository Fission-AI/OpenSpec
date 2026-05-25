# Context Store And Initiatives Questions

## Open

- What is the first concrete context store command surface?
- Should the user-facing command vocabulary say `context`, `store`, or
  something more product-facing?
- What migration or compatibility path should existing workspace-planning
  changes get once initiatives exist?
- How should linked repo changes report progress back into an initiative without
  becoming a Jira clone?
- How should monorepos map capabilities, folders, and repo-local changes?
- Should OpenSpec support configurable change homes across context stores and
  local OpenSpec repos, and what ownership rules keep that model safe?

## Resolved

- Workspaces should not be the durable shared planning object.
- Initiative roadmap implementation should be tracked inside the initiative
  until repo-owned implementation changes are needed.
