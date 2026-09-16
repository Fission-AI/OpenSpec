---
'@fission-ai/openspec': patch
---

Stop archive adding a second copy of an existing requirement under a name that differs only in case or spacing. ADDED and the RENAMED target compared requirement names exactly, while REMOVED and the RENAMED source already treated a case or whitespace variant as a mistyped header, so an ADDED `late fees` beside an existing `Late Fees`, or a rename to `LATE FEES`, archived cleanly and left two contradicting requirements in the main spec, which `validate` then accepted. Both now refuse with an error naming the existing requirement, in the same form REMOVED already used. The exact-duplicate error is unchanged, a case-only rename of a requirement to its own name still works, and a variant of a requirement the same delta removes or renames away is still allowed, because ADDED is checked against the spec as it stands after the earlier operations, as the exact check already was.
