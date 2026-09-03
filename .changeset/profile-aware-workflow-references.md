---
"@fission-ai/openspec": patch
---

Generated skills and commands no longer point at workflows the active profile does not install. On the default `core` profile, the update workflow told agents to hand off to `/opsx:continue` for missing artifacts and to `/opsx:new` for a change of intent — neither of which `core` generates. Every cross-workflow handoff is now decided at generation time against the installed workflow set, and renders a concrete CLI fallback (`openspec status`, `openspec instructions`, `openspec archive`) when the workflow it would name is absent, rather than relying on a runtime availability check the agent had to perform. The onboarding tutorial's command tables are likewise built from the workflows you actually have.
