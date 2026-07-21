---
'@fission-ai/openspec': patch
---

Generated skills for tools without a command adapter (Kimi Code, Mistral Vibe, Hermes, ForgeCode, CodeArts) no longer reference `/opsx:*` commands that were never generated: skill cross-references, the init getting-started hint, and the profile-migration message now use each tool's documented skill invocation (Kimi Code: `/skill:openspec-*`; others: `/openspec-*`). When `delivery: commands` would generate nothing for such tools, init now prints a configuration correction instead of a dead hint. The committed skills.sh distribution is regenerated with skill references (default `/openspec-*` form, as that channel installs skills only).
