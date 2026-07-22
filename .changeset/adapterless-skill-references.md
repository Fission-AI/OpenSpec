---
'@fission-ai/openspec': patch
---

Generated skills for tools without a command adapter (Kimi Code, Mistral Vibe, Hermes, ForgeCode, CodeArts) no longer reference `/opsx:*` commands that were never generated: skill cross-references, the init getting-started hint, and the profile-migration message now use each tool's documented skill invocation (Kimi Code: `/skill:openspec-*`; others: `/openspec-*`), and Codex — skills-invocable with no slash surface — gets a syntax-neutral hint that names the skill. Selections that mix invocation syntaxes print one labeled hint per distinct form, so every advertised instruction is usable by the tool it names. When `delivery: commands` would generate nothing for a selected tool, init prints a configuration correction naming that tool, even when other tools did get commands or skills. The committed skills.sh distribution is regenerated with skill references (default `/openspec-*` form, as that channel installs skills only).
