---
"@fission-ai/openspec": minor
---

Add Gemini CLI support with TOML-based slash commands

This release adds native support for Google's Gemini CLI assistant:
- Gemini CLI now available in AI tools selection during `openspec init`
- Generates TOML configuration files in `.gemini/commands/openspec/`
- Provides three slash commands: `/openspec:proposal`, `/openspec:apply`, `/openspec:archive`
- TOML format with `description` and `prompt` fields for Gemini CLI command discovery
- Comprehensive test coverage for Gemini CLI integration
- Updated documentation to list Gemini CLI under Native Slash Commands

Implements GitHub issue #248
