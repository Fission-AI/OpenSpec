---
'@fission-ai/openspec': patch
---

Apply now says when a change has no delta specs. Apply gates on the schema's `apply.requires` alone, so a change whose `tasks.md` was written ahead of its specs read as ready to implement even though it had no spec deltas at all — the state `openspec validate` rejects. `openspec instructions apply` now reports that gap as a warning (text and `--json`), naming both ways out: write the specs, or declare `skip_specs: true`. Changes that have specs, declare `skip_specs`, or are still blocked on their own required artifacts are unaffected.
