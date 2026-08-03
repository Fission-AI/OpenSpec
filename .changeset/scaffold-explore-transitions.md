---
"@fission-ai/openspec": patch
---

When exploration turns into a new change, generated explore guidance now runs `openspec new change` before writing proposal artifacts. This preserves the required `.openspec.yaml` metadata instead of letting an agent create an incomplete change directory by hand. After the user accepts a capture, explore also creates the requested artifacts without requiring another workflow command.
