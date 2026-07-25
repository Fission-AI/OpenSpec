---
"@fission-ai/openspec": patch
---

Only advertise onboarding commands that will actually exist. The `openspec init` welcome screen and the `openspec update` "Getting started" summary listed `/opsx:new` and `/opsx:continue`, which the default `core` profile never generates, so users were told to run commands that did not exist. Both surfaces now list the commands for the installed workflows. The `init` and `update` completion hints also name the skill (`/openspec-propose`) instead of a command for tools that receive no command files — Codex, and any tool under skills-only delivery.
