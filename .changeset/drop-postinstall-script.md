---
"@fission-ai/openspec": patch
---

Drop the npm `postinstall` script. Its only job was printing a one-line tip about opt-in shell completions, but shipping any install script made `npm install -g @fission-ai/openspec` emit an `allow-scripts` warning that reads as a packaging fault (and `npm approve-scripts` then fails with `ENOMATCH` on a global install, since it looks in the local project). The tip now prints from the CLI on its first run — to stderr, in an interactive terminal, once, and not at all if you already have completions installed — and the published package declares no `preinstall`/`install`/`postinstall` script, so a registry install runs no OpenSpec code. Suppress the tip with `OPENSPEC_NO_COMPLETIONS=1`.
