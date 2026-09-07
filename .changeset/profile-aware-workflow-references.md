---
"@fission-ai/openspec": patch
---

Generated skills and commands no longer point at workflows the active profile does not install. On the default `core` profile, the update workflow told agents to hand off to `/opsx:continue` for missing artifacts and to `/opsx:new` for a change of intent — neither of which `core` generates. Every cross-workflow handoff is now decided at generation time against the installed workflow set, and renders a concrete CLI fallback (`openspec status`, `openspec instructions`, `openspec archive`) when the workflow it would name is absent, rather than relying on a runtime availability check the agent had to perform. The onboarding tutorial's command tables are likewise built from the workflows you actually have.

Also folds in #1735, which fixed the same issue (#1734) by removing the optional handoffs outright. The CLI's own runtime instructions no longer name the `openspec-continue-change` skill either, since those strings are chosen at run time and cannot be resolved against a profile; and the blocked-state fallback now carries the full CLI recovery (select the next `ready` artifact from `openspec status`, read its rules with `openspec instructions`, keep the selected `--store`) rather than a one-line pointer.
