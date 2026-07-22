---
"@fission-ai/openspec": minor
---

### Features

- **ATD workflow façades** — four new workflows complete the five-step ATD journey started by `atd-triage`: `atd-continue` (skill `atd-change-continue`, `/opsx:atd-continue`), `atd-apply` (`atd-change-apply`, `/opsx:atd-apply`), `atd-verify` (`atd-change-verify`, `/opsx:atd-verify`), and `atd-close` (`atd-change-close`, `/opsx:atd-close`). Each is a thin façade composed from the corresponding generic workflow's shared instruction-body builder, adding ATD-only schema validation (`atd-sdlc` / `atd-sdlc-lite`; other schemas are directed to the generic workflow), journey naming, and step policy. `atd-close` hard-gates on `openspec instructions apply --json` reporting `state: "all_done"` — no incomplete-work override — and retains the archive workflow's delta-spec sync assessment; it never performs publication or Jira closure itself.
- **Core profile recomposed** — the default install is now the ATD journey: `atd-triage`, `atd-continue`, `atd-apply`, `atd-verify`, `atd-close`, plus `explore` and `update`. Generic `propose`, `continue`, `apply`, `verify`, `sync`, and `archive` leave the core profile but remain fully available through the custom profile (`openspec config profile`). Existing installs converge via `openspec update`'s standard profile-drift sync.
