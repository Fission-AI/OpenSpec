---
"@fission-ai/openspec": patch
---

Generated skills and commands no longer point at workflows the active profile does not install. On the default `core` profile, the update workflow told agents to hand off to `/opsx:continue` for missing artifacts and to `/opsx:new` for a change of intent — neither of which `core` generates. Both now render a concrete `openspec status` / `openspec instructions` fallback instead, decided at generation time rather than by a runtime availability check the agent had to perform.
