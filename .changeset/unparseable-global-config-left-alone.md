---
'@fission-ai/openspec': patch
---

Stop OpenSpec rewriting a global config file it cannot parse. After a hand edit left a typo such as a trailing comma in `config.json`, the next command of any kind, including read-only ones like `openspec list`, read the fallback defaults as telemetry consent, minted a new anonymous ID and wrote it back, replacing the whole file: a `telemetry.enabled false` opt-out, the chosen profile and the workflow list were all lost, and usage events were sent. A config file that exists but cannot be parsed is now never written implicitly, and telemetry and the update check treat it as opted out. `config set`, `config unset` and `config profile` refuse with an error that names the file and points to `openspec config edit`, and `openspec config reset --all` still replaces it. The existing "Invalid JSON" warning is unchanged, and valid or missing config files behave exactly as before.
