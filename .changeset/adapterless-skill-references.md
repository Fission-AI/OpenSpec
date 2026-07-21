---
'@fission-ai/openspec': patch
---

Generated skills for tools without a command adapter (Kimi Code, Mistral Vibe, Hermes, ForgeCode, CodeArts) no longer reference `/opsx:*` commands that were never generated: skill cross-references, the init getting-started hint, and the profile-migration message now use each tool's documented skill invocation (Kimi Code: `/skill:openspec-*`; others: `/openspec-*`). The committed skills.sh distribution is regenerated the same way.
