## 1. Project Config Model

- [ ] 1.1 Add explicit `apply` and `archive` operation IDs plus typed `operations.<operation>.guidance` config structures without changing artifact `rules`
- [ ] 1.2 Extend resilient config parsing to preserve valid operations, omit malformed entries independently, filter empty guidance, and warn for unknown operations or fields
- [ ] 1.3 Preserve non-empty multi-line and Markdown guidance without rewriting its content
- [ ] 1.4 Update config generation and help text with separate artifact-rule and operation-guidance examples
- [ ] 1.5 Add project-config tests for valid, absent, malformed, mixed-validity, empty, unknown, multi-line, and Markdown operation guidance

## 2. Shared Runtime Inputs

- [ ] 2.1 Extend the existing root-config loading path to read project config once per instruction command, then pass that parsed snapshot to a shared operation-input helper returning separate optional `context` and `operationGuidance` fields
- [ ] 2.2 Ensure each new command invocation reads a fresh config snapshot, omits empty values, avoids duplicate malformed-field warnings, and never exposes artifact rules as operation guidance
- [ ] 2.3 Add unit tests for operation matching, runtime freshness across commands, one-read/one-warning behavior within a command, absent fields, field separation, and selected-store roots

## 3. Apply Instructions

- [ ] 3.1 Extend apply instruction types and generation with current `context` and apply `operationGuidance` while preserving existing state, progress, tasks, context files, references, and root output
- [ ] 3.2 Render context and operation guidance as distinct advisory sections in apply text output
- [ ] 3.3 Update the apply skill template to label runtime inputs as advisory and keep them separate from CLI-returned state, tasks, progress, context files, and built-in instructions without claiming prompt-level enforcement
- [ ] 3.4 Add template assertions that apply context and guidance are not copied into implementation files or planning artifacts, are not presented as evidence of task completion, and leave CLI-controlled blocked/ready/all-done behavior unchanged
- [ ] 3.5 Add unit and CLI integration tests for apply JSON, text rendering, freshness, absent inputs, and unchanged blocked/ready/all-done behavior

## 4. Archive Runtime Inputs

- [ ] 4.1 Route `openspec instructions archive --change <name>` to a dedicated read-only archive instruction handler using existing repo/store root resolution and change validation
- [ ] 4.2 Return `changeName`, optional current `context`, optional archive `operationGuidance`, and the normal root envelope in JSON without returning the static archive workflow template
- [ ] 4.3 Add human-readable archive input rendering with separate advisory sections and a valid empty-input result
- [ ] 4.4 Add tests for required and invalid changes, selected stores, runtime freshness, absent inputs, JSON/text output, and absence of archive filesystem mutations

## 5. Archive Skill Consumption

- [ ] 5.1 Update the single-change archive skill and command templates to fetch current archive inputs after resolving the selected change and root
- [ ] 5.2 Before archive-driven spec sync writes an artifact, fetch that artifact's current instructions for the selected change/root and apply its artifact rules only to the semantic merge
- [ ] 5.3 Update the bulk archive skill and command templates to fetch archive inputs once per selected root, then fetch artifact instructions per change before syncing so mixed-schema batches use the correct rules
- [ ] 5.4 State in both templates that operation guidance is advisory, artifact rules constrain only the artifact being written, existing CLI checks and contracts are unchanged, and input text is not copied verbatim into output files
- [ ] 5.5 Preserve existing single-change and bulk archive orchestration, prompts, semantic merge ownership, filesystem operations, and summaries
- [ ] 5.6 Add tests for absent and present artifact rules, selected roots, mixed-schema batches, field separation, unchanged CLI checks, and non-copying of rule text
- [ ] 5.7 Regenerate checked-in skills and update affected template/golden hashes

## 6. Documentation and Verification

- [ ] 6.1 Document `operations.apply.guidance`, `operations.archive.guidance`, runtime freshness, selected-root behavior, advisory semantics, artifact rules travelling with archive-produced specs, and the read-only archive instruction command
- [ ] 6.2 Document that archive execution phases, semantic merge ownership, direct archive CLI behavior, and artifact-rule configuration/output remain unchanged by this change
- [ ] 6.3 Run formatting, type checking, build, targeted config/apply/archive/template tests, and the full test suite
- [ ] 6.4 Run `openspec validate extend-config-injection-to-apply-archive --strict` and reconcile every task with the final implementation diff
