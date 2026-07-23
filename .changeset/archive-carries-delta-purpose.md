---
"@fission-ai/openspec": patch
---

A delta spec that introduces a brand-new capability can now open with a `## Purpose`, and `openspec archive` uses it as the Purpose of the main spec it creates instead of writing the `TBD - created by archiving change <name>. Update Purpose after archive.` placeholder over it. The `specs` artifact instruction, its example, the delta template and the `openspec-sync-specs` skill all tell authors and agents to write one, so the CLI and agent-driven sync paths produce the same main spec.

Archive keeps the placeholder when the delta has no usable `## Purpose`:

- no `## Purpose` header outside a code fence or HTML comment, or a body that is only a code fence or only a comment
- a body that would leave a spec its own parser cannot read — a heading or requirement header that truncates a section, an unterminated fence, or any HTML comment
- in the second case archive also says why, and still completes rather than aborting

A carried Purpose under 50 characters is kept but warned about, since `openspec validate --strict` reports it as too brief. The Purpose of an existing main spec is never touched; archive warns when it ignores a delta's Purpose there.
