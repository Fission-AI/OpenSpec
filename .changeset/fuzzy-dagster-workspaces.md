---
"@fission-ai/openspec": patch
---

Move beta workspace view state to `.openspec-workspace/view.yaml` and ignore foreign root `workspace.yaml` files during workspace discovery so `openspec update` keeps working in Dagster projects.
