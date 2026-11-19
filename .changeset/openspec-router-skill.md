---
"@fission-ai/openspec": minor
---

Add the `openspec` skill: one place to start for anything OpenSpec. Invoke it (`/openspec`, or `$openspec` in Codex) and ask for anything: where a change stands, what to do next, how to set something up, or several steps in order. It answers, or hands the request to the skill that does it, and falls back to CLI steps when that skill is not installed. It is part of the core profile, so `openspec update` adds it; a custom profile can add it with `openspec config profile`.

Skills can now carry `references/` files beside `SKILL.md`. They are installed, refreshed, and removed with their skill, so a skill can stay short and keep detail it needs only sometimes in a file it reads when it needs it.
