---
"@fission-ai/openspec": patch
---

The update workflow's scope guardrail now states the glob new-file exception where it is read. It said to edit only the concrete files in `existingOutputPaths`, while the file step 4 creates to fill a gap under a partly written glob artifact is by definition not in that list, so an agent applying the blanket rule refused the operation the flow exists to perform.
