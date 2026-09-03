---
"@fission-ai/openspec": patch
---

Make the vendor-neutral tool target findable when your assistant is not on the list. `openspec init` now shows it as "Other / Universal (shared .agents skills)"; the picker's search box matches it on `universal`, `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`, `vendor-neutral` and `agents.md`; a search that matches nothing points at it instead of ending at "No matches"; and `--tools <unknown>` names it in the error. The search box also accepts punctuation and pasted text, so `.agents`, `amazon-q` and `claude code` filter instead of silently dropping their `.`, `-` and spaces.
