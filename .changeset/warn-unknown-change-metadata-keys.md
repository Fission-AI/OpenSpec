---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Change metadata** — Warn when `.openspec.yaml` contains unrecognized keys such as `skip_design`. Those keys were stripped with no signal, so `status` still demanded the design artifact and `validate --strict` exited 0. `status`, `validate`, and `archive` now name the ignored keys; `validate --strict` fails.
