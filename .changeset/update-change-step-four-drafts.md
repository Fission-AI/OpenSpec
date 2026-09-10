---
'@fission-ai/openspec': patch
---

Resolve the contradiction that left `/opsx:update`'s only write path without a governing rule. Step 4 told the agent to "Apply the requested edit", while step 5 and the guardrails told it to write only after the user confirms each revision — so the same `/opsx:update "the design now uses X"` either wrote immediately or stopped and showed the proposed revision first, depending on which passage the agent weighed. Step 4 now drafts the edit in the conversation and step 5 owns every artifact write, matching the workflow's own specified behavior: propose each revision and apply it only after user confirmation. Fixes #1836.
