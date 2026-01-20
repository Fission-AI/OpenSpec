---
"@fission-ai/openspec": minor
---

### New Features

- **Project-level configuration** — Configure OpenSpec behavior per-project via `openspec/config.yaml`, including custom rules injection, context files, and schema resolution settings

- **Project-local schemas** — Define custom artifact schemas within your project's `openspec/schemas/` directory for project-specific workflows

- **Schema management commands** — New `openspec schema` commands (`list`, `show`, `export`, `validate`) for inspecting and managing artifact schemas (experimental)

### Bug Fixes

- Fixed config loading to handle null `rules` field in project configuration
