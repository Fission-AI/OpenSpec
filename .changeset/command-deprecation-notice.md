---
"@fission-ai/openspec": minor
---

Command files are deprecated and go away in OpenSpec 2.0; skills stay and do the same work. While a configured tool still gets command files, `openspec update` ends with a short notice saying so, with the one command to switch now (`openspec config set delivery skills && openspec update`) and a link to the plan ([#2022](https://github.com/Fission-AI/OpenSpec/issues/2022)). The notice never shows once delivery is `skills`, nor for tools that get no command files, such as Codex. Nothing OpenSpec installs changes in this release.
