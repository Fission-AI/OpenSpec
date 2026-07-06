# Agent Handoff Output And Delivery Polish Evidence

## Manual Beta Source Notes

The manual beta pass found:

- after context-store setup, the user is told to ask an agent to create an
  initiative, but a fresh agent may not know the beta CLI or where to find the
  playbook;
- `initiative create --json` reports `created_files` as relative names, so
  agents must combine them with the returned root before writing;
- "commands only" can sound like "the agent gets no OpenSpec guidance," even
  though users may only mean slash commands as workflow entrypoints;
- tools without command adapters need a clear warning when workflow slash
  commands cannot be installed.

## Initial Recommendation

Treat this as output polish, not a new workflow engine:

- add direct path fields rather than breaking existing relative fields;
- keep handoff guidance concrete and command-sized;
- keep baseline OpenSpec literacy separate from workflow entrypoints;
- leave the broader "what should I do next?" command to the proposed handoff
  work item.

## Reassessment

After reviewing practical examples, the proposed "Next for your agent" shape
looked too prescriptive. It assumes a fixed linear beta path, but agents may
inspect state, branch, skip setup, continue an existing change, or use context in
a different order.

Conclusion on 2026-05-30:

- Skip Item 13 as an implementation item for now.
- Preserve the evidence because the handoff pain is real.
- Do not hardcode fixed next-step guidance until the product has a clearer
  receipt or affordance model.
- Consider splitting deterministic `created_paths` style receipt fields into a
  smaller future slice if they remain useful.
