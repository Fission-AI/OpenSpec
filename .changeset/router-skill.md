---
"@fission-ai/openspec": minor
---

Add an `openspec-router` skill that sends a request to the OpenSpec skill that handles it. The steps of each skill now live in the router's `references/` folder, word for word, and the twelve skills are short files that point at them. Run `openspec update` to get the new layout.
