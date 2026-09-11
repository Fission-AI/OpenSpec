---
'@fission-ai/openspec': patch
---

Fix the update-change workflow contradicting its own confirmation gate. Step 4 said to apply the requested edit while step 5 said to write only after the user confirms, and "apply" reads as a write verb in that document - step 5 is itself titled "Confirm and apply". Step 4 now drafts the edit and step 5 remains the only write path, so `/opsx:update "the design now uses X"` always shows the revision before writing it. Both delivery surfaces carry the same wording and it is now pinned by tests.
