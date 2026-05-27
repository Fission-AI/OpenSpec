---
"@thiagodiogo/pastelsdd": minor
---

### New Features

- **Testing validation phase in apply workflow** — After all tasks are complete and the card moves to "Em Teste", the workflow now asks how the user wants to validate: test themselves, have Claude run the `verify` skill, or confirm it's already working. On approval, the Trello card is automatically moved to "Ready to Deploy" (`lists.deploy`). If a problem is found, the workflow loops back to fix before re-validating.
