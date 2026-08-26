---
"@fission-ai/openspec": patch
---

`openspec update` now names what it generated in the IDE restart hint — "Restart your IDE for the new commands to take effect." or "…the new skills…" — instead of the generic "Restart your IDE for changes to take effect.". `init` already did this; both commands now resolve the hint through a shared `formatIdeRestart` helper, so the same event reads the same way whichever command produced it.
