# Agent Handoff Output And Delivery Polish Tasks

Status: deferred. Do not implement these tasks until the handoff model is
redesigned as contextual receipts or affordances rather than fixed linear
"next step" guidance.

- [ ] Revisit after Item 14 and Item 15 clarify the beta docs, sparse
      initiative flow, and context-store project-root model.
- [ ] Decide whether any deterministic receipt improvements, such as
      `created_paths`, should be split into a smaller independent slice.
- [ ] Decide whether delivery terminology belongs in a separate
      command-surface/delivery item.

## Deferred Original Tasks

- [ ] Decide which existing commands should print a "Next for your agent"
      handoff block.
- [ ] Define the minimal handoff content for context-store setup, initiative
      creation, workspace opening, and repo-local linked change creation.
- [ ] Add direct created-path fields, such as `created_paths`, where JSON output
      currently forces agents to combine relative file names with returned
      roots.
- [ ] Preserve compatibility for existing relative `created_files` fields where
      callers may already depend on them.
- [ ] Update `initiative create --json` and sparse initiative creation output
      from Item 15 to include direct artifact paths and next commands.
- [ ] Decide how generated docs or setup output points to the agent CLI
      playbook without requiring a pasted mini-playbook in every guide step.
- [ ] Clarify delivery terminology so commands-oriented delivery means workflow
      commands as entrypoints, not absence of baseline OpenSpec guidance.
- [ ] Add warnings when a selected tool does not support workflow slash command
      delivery.
- [ ] Define how baseline OpenSpec guidance is reported when commands-oriented
      delivery is selected for a tool that still supports skills.
- [ ] Add tests or fixtures for human output, JSON output, and delivery-warning
      behavior.
- [ ] Update beta docs and generated agent guidance with the polished handoff
      and delivery language.
