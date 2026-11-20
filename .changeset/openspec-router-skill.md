---
"@fission-ai/openspec": minor
---

New `openspec` router skill: one entry point for anything OpenSpec. Type `/openspec` (or `$openspec` in Codex) and ask for anything, such as "where does add-auth stand?", "how do I add a schema?", or "verify add-auth, then archive it". It answers, or routes the request to the skill that does the work, so you no longer need to know which of the 12 workflow skills to call.

Use it when you're not sure how to do something in OpenSpec, want to know where a change stands, or want several steps done together. A model on its own doesn't know OpenSpec's folders, commands, or which workflow fits, so it guesses. The router gives it that map and has it check your project's real state first. If the skill a step needs isn't installed, it does that step with the CLI. The workflow skills still tab-complete for when you know what you want.

The router is part of the core profile, so `openspec update` adds it. On a custom profile, add it with `openspec config profile`.

Skills can now keep extra detail in a `references/` folder next to `SKILL.md`. The agent reads `SKILL.md` first and opens a reference only when the task needs it, which is how agents already load skills. OpenSpec installs, updates, and removes reference files along with their skill. The router is the first skill to use them.
