---
"@fission-ai/openspec": patch
---

Match the natural "openspec <verb>" phrasing to the workflow it names. Users and agents say "openspec propose" or "do an openspec apply", but no workflow skill's description contained that phrasing — and a skill's description is what an agent matches on — so the phrase read as an invitation to hand-build the artifacts with the CLI instead of running the workflow. Every workflow skill's description now names the phrasings a user actually types ("openspec propose", "opsx apply", and so on). Run `openspec update` to pick it up. `openspec update` itself is deliberately left unclaimed: it is a real CLI command that refreshes generated files, unrelated to the update-change workflow, which claims "openspec update change" instead. Commands-only installs write no skills and are unchanged. Fixes #1221.
