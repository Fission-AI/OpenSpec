---
"@fission-ai/openspec": minor
---

### New Features

- **Atlassian Rovo Dev CLI** — `openspec init --tools rovodev` installs the OpenSpec workflow skills for Atlassian's Rovo Dev CLI. It is skills-only (no slash commands), written to `.rovodev`.

### Bug Fixes

- **Codex skills now live in the shared `.agents` directory** — `openspec init` and `openspec update` install Codex skills under `.agents/skills/` (the canonical location assistants read) and migrate an existing `.codex` skills directory in place. Files you customized are preserved, not overwritten.
- **`openspec status` separates planning from implementation** — status now reports `isPlanningComplete` (every planning artifact is written) distinctly from overall progress, and its messages no longer imply a change is finished before it has been implemented. `isComplete` is kept as a compatibility alias, so existing scripts keep working.
