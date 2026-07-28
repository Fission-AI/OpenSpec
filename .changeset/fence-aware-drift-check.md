---
"@fission-ai/openspec": patch
---

The archive scenario-drift check now ignores `#### Scenario:` lines inside fenced code blocks, matching validate: a fenced example no longer false-aborts an archive, and a fenced name no longer masks a genuinely dropped scenario.
