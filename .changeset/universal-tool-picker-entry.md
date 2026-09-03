---
"@fission-ai/openspec": patch
---

Make the vendor-neutral tool target findable in `openspec init`. It is now listed as "Other / Universal (shared .agents skills)", the picker's search box matches it on `universal`, `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`, `vendor-neutral` and `agents.md`, and a search that matches nothing now points at it instead of ending at "No matches". The search box also accepts punctuation, so terms like `.agents` and `amazon-q` filter instead of silently dropping their `.` and `-`.
