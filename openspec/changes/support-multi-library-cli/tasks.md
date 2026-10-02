# Tasks

## 1. Shared local library discovery and selection

- [ ] 1.1 Reuse the listing scanner as a shared invocation-local library set; verify fixtures cover root/descendant/no-root/legacy libraries, pruning, symlinks, physical deduplication, and malformed/unreadable roots.
- [ ] 1.2 Add optional library selection and selector conflict checks; verify native relative paths, spaces, invalid/outside/excluded targets, and store/pointer/default precedence with CLI fixtures.
- [ ] 1.3 Add typed item-owner resolution and duplicate diagnostics; verify root-versus-descendant and sibling duplicates, nested spec IDs, type ambiguity, unknown items, and unreadable candidate handling.
- [ ] 1.4 Add shared completion/help entries and library-preserving command hints; verify generated hints run with paths containing spaces and document scope and selection examples.

## 2. Aggregate read commands

- [ ] 2.1 Render view with one combined summary and per-library sections using existing status/schema collectors; verify duplicate names, empty libraries, workflow states, category/spec sorting, narrow/plain/color output, and partial failures.
- [ ] 2.2 Extend bulk validation across libraries using one existing concurrency limit; verify owner-local baselines, repeated IDs, filtered modes, partial failures, aggregate JSON ownership, and unchanged single-library responses.
- [ ] 2.3 Extend context and doctor across local libraries with ownership/provenance metadata; verify same-named items, shared referenced stores, per-library diagnostics, clean JSON, and explicitly selected store/library scope.
- [ ] 2.4 Group schema/template inventories without merging library-local definitions; verify matching names, built-in definitions, explicit selection, and one-library output compatibility.
- [ ] 2.5 Update browse/validate/context/doctor/schema reference documentation and verify each sample against temporary fixtures with fictional product names.

## 3. Named reads and workflow ownership

- [ ] 3.1 Route show and interactive choices through owning-library resolution; verify Markdown/JSON formats, type-specific flags, duplicate diagnostics, labeled choices, and existing noninteractive behavior.
- [ ] 3.2 Route named validate, status, instructions, and apply/archive instructions through the resolved owner; verify schema/artifact paths, task counts, prerequisites, action context, and allowed product edit roots.
- [ ] 3.3 Route schema which/validate to project-local owners while preserving selected-root built-in behavior; verify duplicate custom schemas and explicit library selection.
- [ ] 3.4 Wire deprecated change/spec display, list, and validation adapters; verify deprecation channels, library ownership, aggregate array compatibility, and unchanged single-library formats.
- [ ] 3.5 Update user and generated agent guidance for duplicate names and owning-library workflows; verify printed next steps retain the selected product and store flags.

## 4. Single-library mutations and setup

- [ ] 4.1 Route archive through complete owner resolution before write preparation; verify only the owning library's specs/archive change and all siblings stay byte-identical for unique, duplicate, unreadable, and explicit-target cases.
- [ ] 4.2 Target new change using explicit/nearest/sole-library selection; verify ambiguous parent directories write nothing and duplicate names in other selected-out libraries do not block creation.
- [ ] 4.3 Add library targeting to update and schema init/fork while preserving existing options and positional paths; verify generated files and schemas change only inside the selected project.
- [ ] 4.4 Support explicit library selection in init/experimental while retaining existing cwd/new-project setup behavior; verify explicit new paths work and integrations are never initialized across all descendants.
- [ ] 4.5 Update mutation/setup help, completions, documentation, and a patch changeset; verify copyable examples and no required configuration or registration for default reads.

## 5. Integration verification and review artifacts

- [ ] 5.1 Run build, complete tests, TypeScript, lint, and strict change validation against one unchanged build; record results and confirm all command-matrix adapters are covered.
- [ ] 5.2 Verify Windows CI for native separators, canonical identity, junction/symlink exclusions, and command hints; record the passing workflow or exact remaining platform blocker.
- [ ] 5.3 Exercise list/view/show/validate/status/instructions/archive/init/update/schema flows on a temporary split repository; verify mutation targets and sibling artifact hashes end to end.
- [ ] 5.4 Capture actual source-built view and read/validation output from fictional fixtures, publish screenshots outside the code diff, and open an implementation draft PR linked to the approved proposal.
