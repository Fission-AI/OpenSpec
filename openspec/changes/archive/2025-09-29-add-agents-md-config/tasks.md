# Implementation Tasks

## 1. Extend Init Workflow
- [x] 1.1 Add an "AGENTS.md standard" option to the `pastelsdd init` tool-selection prompt, respecting the existing UI conventions.
- [x] 1.2 Generate or refresh a root-level `AGENTS.md` file using the Pastelsdd markers when that option is selected, sourcing content from the canonical template.

## 2. Enhance Update Command
- [x] 2.1 Ensure `pastelsdd update` writes the root `AGENTS.md` from the latest template (creating it if missing) alongside `pastelsdd/AGENTS.md`.
- [x] 2.2 Update success messaging and logging to reflect creation vs refresh of the AGENTS standard file.

## 3. Shared Template Handling
- [x] 3.1 Refactor template utilities if necessary so both commands reuse the same content without duplication.
- [x] 3.2 Add automated tests covering init/update flows for projects with and without an existing `AGENTS.md`, ensuring markers behave correctly.

## 4. Documentation
- [x] 4.1 Update CLI specs and user-facing docs to describe AGENTS standard support.
- [x] 4.2 Run `pastelsdd validate add-agents-md-config --strict` and document any notable behavior changes.
