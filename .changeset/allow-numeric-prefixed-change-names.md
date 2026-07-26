---
'@fission-ai/openspec': patch
---

`openspec new change` now accepts numeric-prefixed names like `100-add-feature` or `00001-add-auth`, useful for ordering or tiering changes. Change names now use the same kebab-case grammar as store ids and change metadata (a leading digit is allowed); `archive` already treated date-prefixed names as a supported convention. Uppercase, spaces, underscores, and leading/trailing or consecutive hyphens are still rejected, and every previously valid name stays valid.
