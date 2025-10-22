---
"@fission-ai/openspec": minor
---

Add support for multiple AI assistants and improve validation

This release adds support for several new AI coding assistants:
- CodeBuddy Code - AI-powered coding assistant
- CodeRabbit - AI code review assistant
- Cline - Claude-powered CLI assistant
- Crush AI - AI assistant platform
- Auggie (Augment CLI) - Code augmentation tool

New features:
- Archive slash command now supports arguments for more flexible workflows

Bug fixes:
- Delta spec validation now handles case-insensitive headers and properly detects empty sections
- Archive validation now correctly honors --no-validate flag and ignores metadata

Documentation improvements:
- Added VS Code dev container configuration for easier development setup
- Updated AGENTS.md with explicit change-id notation
- Enhanced slash commands documentation with restart notes
