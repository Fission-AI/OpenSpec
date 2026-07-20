---
"@fission-ai/openspec": patch
---

### Fixed

- Ignore Markdown structure (requirement headers, delta sections, scenarios, REMOVED/RENAMED entries) that appears inside fenced code blocks when parsing delta specs. Previously a fenced `### Requirement:` example was parsed as a real (phantom) requirement, producing spurious `validate` errors and risking incorrect `archive` output. Fenced-code detection is now shared across the Markdown parsers so `validate` and `archive` behave consistently.
