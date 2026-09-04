---
"@fission-ai/openspec": patch
---

Fix `retire_capabilities` refusing any spec whose scenario bullets wrap onto a second line. The continuation line was counted as content the merge could not account for, which blocked the retirement and suppressed the hint that names the marker (#1780).
