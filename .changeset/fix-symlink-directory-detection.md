---
"@fission-ai/openspec": patch
---

fix: Symlinked directories are now correctly detected when scanning `openspec/schemas/`, `openspec/specs/`, `openspec/changes/`, and artifact output subdirectories. Monorepo setups that symlink directories into these locations would get silent failures (e.g., "Unknown schema" errors, missing specs/changes in listings) because `Dirent.isDirectory()` returns `false` for symlinks, causing those entries to be skipped during discovery.
