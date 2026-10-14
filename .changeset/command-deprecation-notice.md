---
"@fission-ai/openspec": patch
---

Generated command files are now marked deprecated. When `openspec update` still writes command files for a project, it ends with a short notice: the next major version installs skills only by default, how to switch now (`openspec config set delivery skills && openspec update`), how to keep commands (`openspec config set delivery both`), and a link to the plan. The notice also appears when every tool is already up to date, and it never appears once delivery is `skills` or for tools that get no command files, such as Codex. Nothing about what OpenSpec installs changes in this release.
