---
"@fission-ai/openspec": patch
---

Make the vendor-neutral tool target findable in `openspec init`. It is now listed as "Other / Universal (shared .agents skills)" and the picker's search box matches it on `universal`, `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`, `vendor-neutral`, and `agents.md`. The search box also accepts punctuation, so terms like `.agents` and `amazon-q` filter instead of silently dropping their `.` and `-`.
