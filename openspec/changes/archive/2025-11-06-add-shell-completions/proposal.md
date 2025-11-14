# Add Shell Completions

## Why

OpenSpec CLI commands lack shell completion, forcing users to remember all commands, subcommands, flags, and change/spec IDs manually. This creates friction during daily use and slows developer workflows. Shell completions are a standard expectation for modern CLI tools and significantly improve user experience through:
- Faster command discovery via tab completion
- Reduced cognitive load by removing memorization requirements
- Fewer typos through validated suggestions
- Professional polish expected of production-grade tools

## What Changes

This change adds shell completion support for the OpenSpec CLI, starting with **Zsh (including Oh My Zsh)** and establishing a scalable architecture for future shells (bash, fish, PowerShell). The implementation provides:

1. **New `openspec completion` command** with Zsh generation and installation/uninstallation capabilities
2. **Native Zsh integration** that respects standard Zsh tab completion behavior (single-TAB menu navigation)
3. **Dynamic completion providers** that discover active changes and specs from the current project
4. **Plugin-based architecture** using TypeScript interfaces for easy extension to additional shells in future proposals
5. **Installation automation** for Oh My Zsh (priority) and standard Zsh configurations
6. **Context-aware suggestions** that only activate within OpenSpec-enabled projects

The architecture emphasizes clean TypeScript patterns, composable generators, separation of concerns between shell-specific logic and shared completion data providers, and integration with native shell completion systems. Other shells (bash, fish, PowerShell) are architecturally documented but not implemented in this proposal—they will be added in follow-up changes.

## Deltas

### Delta: New CLI completion specification
- **Spec:** cli-completion
- **Operation:** ADDED
- **Description:** Defines requirements for the new `openspec completion` command including generation, installation, and shell-specific behaviors for Oh My Zsh, bash, fish, and PowerShell.