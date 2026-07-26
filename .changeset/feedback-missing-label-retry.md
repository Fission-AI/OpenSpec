---
"@fission-ai/openspec": patch
---

Fix `openspec feedback` failing when the repository does not define the `feedback` label. The command now retries without the label and notes that it was not applied, instead of exiting with an error and discarding the feedback.
