---
"@fission-ai/openspec": patch
---

Fix `retire_capabilities` refusing any spec whose scenario bullets wrap onto a second line. The continuation line was counted as content the merge could not account for, which blocked the retirement and suppressed the hint that names the marker (#1780). A spec bulleted with `+` is covered too: naming only `-` and `*` as list markers reported every one of its scenario bullets as unaccounted content, so that capability could not be retired at all either.
