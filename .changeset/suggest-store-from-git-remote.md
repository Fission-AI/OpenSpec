---
"@fission-ai/openspec": minor
---

### Features

- When a command finds no OpenSpec root and you have registered stores, the error now names the store whose id matches your repo's name in its `origin` remote, with the `--store` flag and the `store:` line that select it. OpenSpec only suggests it and never picks a store by name, because repos in different organizations can share a name.
