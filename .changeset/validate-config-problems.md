---
"@fission-ai/openspec": patch
---

`openspec validate --all/--changes/--specs` now inspects `openspec/config.yaml`: an unparseable file or a dropped field fails validation (exit 1) and is reported as `config/openspec/config.yaml` in text, `--json` (optional `config` key) and `--report findings` output; an ignored unknown operation id or field is a warning that only fails under `--strict`. `rules:` lists are validated item by item, so one malformed entry no longer drops the artifact's whole rule set, and the warning names `rules.<artifact>[i]`.
