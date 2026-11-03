## 1. Project Config Model

- [x] 1.1 Add explicit `apply` and `archive` operation IDs plus typed `operations.<operation>.guidance` config structures without changing artifact `rules`
- [x] 1.2 Extend resilient config parsing to preserve valid operations, omit malformed entries independently, filter empty guidance, and warn for unknown operations or fields
- [x] 1.3 Preserve non-empty multi-line and Markdown guidance without rewriting its content
- [x] 1.4 Update config generation and help text with separate artifact-rule and advisory operation-guidance examples
- [x] 1.5 Add project-config tests for valid, absent, malformed, mixed-validity, empty, unknown, multi-line, and Markdown operation guidance

## 2. Shared Runtime Inputs

- [x] 2.1 Extend the existing root-config loading path to read project config once per instruction command, then pass that parsed snapshot to a shared operation-input helper returning separate optional `context` and `operationGuidance` fields
- [x] 2.2 Ensure each new command invocation reads a fresh config snapshot, omits empty values, avoids duplicate malformed-field warnings, and never exposes artifact rules as operation guidance
- [x] 2.3 Add unit tests for operation matching, runtime freshness across commands, one-read/one-warning behavior within a command, absent fields, field separation, and selected-store roots

## 3. Apply Instructions

- [x] 3.1 Extend apply instruction types and generation with current `context` and apply `operationGuidance` while preserving existing state, progress, tasks, context files, references, and root output
- [x] 3.2 Render project context as a required prompt-level input section and operation guidance as a separate advisory section in apply text output
- [x] 3.3 Update the apply skill and generated templates to require relevant context consumption, consider every guidance entry, and follow guidance only when applicable and compatible with the built-in workflow
- [x] 3.4 Keep both fields separate from CLI-returned state, tasks, progress, context files, and built-in instructions; report context conflicts, explain rejected guidance, prevent input copying, and preserve blocked/ready/all-done behavior
- [x] 3.5 Add unit, CLI integration, and template-parity tests for required context labeling and consumption, advisory guidance handling, conflict reporting, absent inputs, runtime freshness, and unchanged apply state behavior

## 4. Archive Runtime Inputs

- [x] 4.1 Route `openspec instructions archive --change <name>` to a dedicated read-only archive instruction handler using existing repo/store root resolution and change validation
- [x] 4.2 Return `changeName`, optional current `context`, optional archive `operationGuidance`, and the normal root envelope in JSON without returning the static archive workflow template
- [x] 4.3 Render project context as a required prompt-level input section and operation guidance as a separate advisory section in human-readable archive output, with a valid empty-input result
- [x] 4.4 Add tests for required and invalid changes, selected stores, runtime freshness, absent inputs, JSON output, final text labels, and absence of archive filesystem mutations

## 5. Archive and Sync Skill Consumption

- [x] 5.1 Fetch current archive inputs in the single-change archive workflow after resolving the selected change and root, and stop before spec inspection, writes, or moves on a non-zero or invalid JSON response
- [x] 5.2 Fetch archive inputs once per selected root in bulk archive and stop the whole batch before spec inspection, writes, or moves on lookup failure
- [x] 5.3 Require single and bulk archive skills to apply relevant context, treat operation guidance as advisory, report context conflicts, and explain guidance that is inapplicable or conflicts with controlling workflow input
- [x] 5.4 Keep `artifactPaths.specs.existingOutputPaths` as the only delta-spec source in archive, bulk archive, and standalone sync; treat a missing `specs` entry or empty output list as no spec sync and do not infer deltas from other artifacts
- [x] 5.5 Before archive-driven spec sync writes a main spec, fetch `openspec instructions specs` once for the selected change/root, apply its rules to the semantic merge, and pass the specs-rule snapshot into inline sync; stop before any main-spec write or change move on lookup failure
- [x] 5.6 Fetch current `specs` instructions during standalone sync, reuse an archive-supplied specs-rule snapshot without re-fetching, and stop before writing a main spec on direct lookup failure
- [x] 5.7 Resolve every required specs-instruction snapshot in bulk archive before the first main-spec write; report the affected change and stop the whole batch before writes or moves if any lookup fails
- [x] 5.8 Keep context, advisory operation guidance, artifact rules, conflict analysis, and CLI-derived values structurally separate; constrain rules to written artifacts, preserve existing checks and contracts, and prevent instruction text from being copied into output files
- [x] 5.9 Preserve existing single-change and bulk archive orchestration, prompts, semantic merge ownership, filesystem operations, and summaries
- [x] 5.10 Add tests for required context and advisory guidance semantics, conflict reporting, present/missing/empty `artifactPaths.specs`, artifact rules, selected roots, direct and inline sync, snapshot reuse, invalid responses, no-write/no-move behavior, mixed-schema batches, field separation, unchanged CLI checks, and non-copying
- [x] 5.11 Regenerate checked-in apply, archive, bulk archive, and sync skills and update affected template/golden hashes

## 6. Documentation and Verification

- [x] 6.1 Document required context consumption, advisory `operations.apply.guidance` and `operations.archive.guidance`, runtime freshness, selected-root behavior, field separation, fail-closed archive/specs instruction consumption, `artifactPaths.specs` as the spec-sync contract, `specs` rules travelling with produced main specs, and the read-only archive instruction command
- [x] 6.2 Document that archive execution phases, semantic merge ownership, direct archive CLI behavior, and artifact-rule configuration/output remain unchanged by this change
- [x] 6.3 Add a minor changeset covering runtime apply/archive inputs and archive-driven spec-rule consumption
- [x] 6.4 Run formatting, type checking, build, targeted config/apply/archive/template tests, and the full test suite
- [x] 6.5 Verify repo/store root selection and path handling on Windows CI and the existing supported platforms
- [x] 6.6 Run `openspec validate extend-config-injection-to-apply-archive --strict` and reconcile every task with the final implementation diff
