---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Don't let a legacy Codex upgrade hijack the vendor-neutral `agents` target** — `openspec update` no longer overwrites an existing `.agents` skills tree (and its ownership marker) when Codex is detected only from leftover global `~/.codex/prompts`. Because Codex and the vendor-neutral `agents` target share `.agents/skills`, a project that used the `agents` target could have its generic skills silently rewritten with Codex-specific syntax and its target flipped to Codex on the next `update --force`. The legacy-upgrade path now respects the established owner of a shared skills directory, matching the one-writer rule `openspec init` already applies. When an upgrade is skipped this way, that tool's repo-local legacy files (e.g. `.codex/prompts/openspec-*.md`) are also preserved rather than cleaned up, since no replacement was written to take their place. A genuine first-time Codex upgrade (no `.agents` tree yet) is unaffected.
