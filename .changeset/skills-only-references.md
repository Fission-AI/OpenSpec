---
'@fission-ai/openspec': patch
---

Fix skills-only delivery emitting `/opsx:*` command references. Generated SKILL.md files now reference the corresponding skills (e.g. `/openspec-apply-change`) when `delivery: 'skills'` is configured, instead of commands that were never generated.
