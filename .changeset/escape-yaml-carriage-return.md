---
"@fission-ai/openspec": patch
---

fix(adapters): escape carriage returns in generated YAML frontmatter

`escapeYamlValue` flagged `\r` as a character requiring quoting but never escaped it, leaving a literal carriage return inside the double-quoted scalar where YAML line folding/normalization could silently corrupt the value (realistic with CRLF-authored command descriptions). Carriage returns are now escaped as `\r`. The helper — previously duplicated verbatim across five adapters (bob, claude, cursor, pi, windsurf) — is extracted into a shared `command-generation/yaml.ts` module so the behavior stays consistent and is fixed in one place.
