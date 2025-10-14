---
"@fission-ai/openspec": minor
---

Add factory function support for slash commands and non-interactive init options

This release includes two new features:

- **Factory function support for slash commands**: Slash commands can now be defined as functions that return command objects, enabling dynamic command configuration
- **Non-interactive init options**: Added `--tools`, `--all-tools`, and `--skip-tools` CLI flags to `openspec init` for automated initialization in CI/CD pipelines while maintaining backward compatibility with interactive mode
