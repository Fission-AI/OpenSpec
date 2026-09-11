---
"@fission-ai/openspec": patch
---

Match the natural "openspec <verb>" phrasing to the workflow it names. Every workflow skill's description now lists the phrasings a user actually types ("openspec propose", "opsx apply", and so on), so an agent that hears "do an openspec propose" runs the workflow instead of hand-building the artifacts with the CLI. `openspec update` is deliberately left unclaimed: it is a real CLI command that refreshes generated files, unrelated to the update-change workflow.
