## Why
- Kilo Code supports customizable slash command "workflows" by loading Markdown files from `.kilocode/workflows/` and exposing each file as a `/filename.md` action inside chat. These workflows can drive CLI usage, MCP integrations, and scripted release or project tasks, making them a good fit for codifying OpenSpec routines.
- Today OpenSpec contributors have to hand-build those Markdown files (and keep them updated) if they want Kilo to run project hygiene like `openspec list`, `openspec validate`, or spec scaffolding. That creates inconsistent setups and stale automation across teams.

## What Changes
- Extend the existing `openspec init` AI tool selection flow to list "Kilo Code" and scaffold recommended `.kilocode/workflows/*.md` slash commands when selected, mirroring how Claude Code and Cursor are handled.
- Refresh `.kilocode/workflows/*.md` during `openspec update` runs whenever the managed Kilo files already exist so teams stay current without manual edits.
- Ship curated workflow templates that walk Kilo through the OpenSpec research loop (gather context, list specs/changes), proposal authoring, and validation, including inline reminders about when to ask for missing parameters.

## Impact
- Affected specs: cli-init, cli-update
- Affected code: CLI command wiring, workflow template assets, documentation
