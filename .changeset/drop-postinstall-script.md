---
"@fission-ai/openspec": patch
---

Drop the npm `postinstall` script. Its only job was printing a one-line tip about opt-in shell completions, but shipping any install script made `npm install -g @fission-ai/openspec` emit an `allow-scripts` warning that reads as a packaging fault (and `npm approve-scripts` then fails with `ENOMATCH` on a global install, since it looks in the local project). The tip now prints from the CLI on its first run — to stderr, so piped output stays clean — and the published package ships no lifecycle scripts at all.
