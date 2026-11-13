---
"@fission-ai/openspec": patch
---

`openspec update` now brings the global skills up to date when a tool holds its own copies of them, not links to the shared copy. That is what `npx skills add Fission-AI/OpenSpec --global --agent <tool>` leaves for a single tool, and what Antigravity gets. Before, the shared copy was refreshed and the tool kept reading its old ones.

A folder there with your own text is still never replaced, and an edit update replaces is named first.
