---
"@fission-ai/openspec": patch
---

A delta spec that introduces a brand-new capability can now open with a `## Purpose`, and `openspec archive` uses it as the Purpose of the main spec it creates instead of always writing the `TBD - created by archiving change <name>. Update Purpose after archive.` placeholder over it. The body is copied trimmed but otherwise verbatim, fenced code blocks included. The `specs` artifact instruction, its example, the delta template and the `openspec-sync-specs` skill all now tell authors and agents to write one, so the CLI and agent-driven sync paths produce the same main spec.

Archive keeps the placeholder, and says why, when the delta has no `## Purpose` outside a code fence or HTML comment, when the section body is empty, or when carrying the body over would leave a spec the main spec parser cannot read. A carried Purpose shorter than the strict-mode minimum is kept but warned about, since `openspec validate --strict` reports it as too brief. The Purpose of an existing main spec is never touched, and archive now warns instead of dropping a delta's Purpose silently in that case.
