---
"@fission-ai/openspec": patch
---

The update workflow now states the glob new-file exception at both places that state the scope rule (step 2 and the guardrails), not only where the rule is restated. It said to edit only the concrete files in `existingOutputPaths`, while the file step 4 creates to fill a gap under a partly written glob artifact is by definition not in that list, so an agent applying the blanket rule refused the operation the flow exists to perform.
