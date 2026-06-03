---
"@fission-ai/openspec": patch
---

Move beta workspace view state to `.openspec-workspace/view.yaml`, stop top-level `openspec update` from routing into workspace updates, and ignore foreign root `workspace.yaml` files so Dagster projects keep updating normally.
