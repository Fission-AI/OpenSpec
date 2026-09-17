---
'@fission-ai/openspec': patch
---

Harden the CLI against repositories you have cloned but not yet read ([#1835](https://github.com/Fission-AI/OpenSpec/pull/1835)).

- A `config.yaml` value can no longer close the project context block and inject its own directives into the instructions an agent receives.
- A crafted delta or skill file no longer stalls `openspec update` or `openspec archive` with catastrophic regex backtracking.
- A repository's `.npmrc` can no longer point the update check at a cleartext or attacker-controlled registry; a rejected registry now disables the check instead of falling back.
- `openspec update` now notices a generated `SKILL.md` that was edited by hand and restores it, instead of reporting every tool as up to date.
- `DO_NOT_TRACK=true` and other common spellings of an opt-out now turn telemetry off, and nothing is sent until the first-run notice has been shown.
- Shell-completion installs quote directory paths safely, git probes run with bounded time and output, and dependencies are cleared of known advisories.
