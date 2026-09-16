---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Generated skills and commands no longer adopt a project that never ran `openspec init`. Every workflow now checks `root` from `openspec list --json` before its first write, and `"root": null` means the project is not set up. What happens next depends on how the workflow was reached. A skill the agent picked on its own drops OpenSpec and answers the request normally, without asking about setup. A workflow the user asked for by name, or ran as a slash command, stops and asks whether to initialize the project, target a store, or handle the request without OpenSpec. A project whose `openspec/config.yaml` names a store this machine cannot resolve (not registered, or a malformed `store:` line) is not mistaken for an uninitialized one: the workflow stops and shows the store error. Neither path lets `openspec new change` create `openspec/` in the current directory as a side effect. Skill descriptions now name OpenSpec so hosts stop offering these workflows in unrelated repositories. `openspec new change` also says when it had to create the root itself, so a directory that was never set up no longer picks up an `openspec/` directory in silence (human output only; `--json` is unchanged).
