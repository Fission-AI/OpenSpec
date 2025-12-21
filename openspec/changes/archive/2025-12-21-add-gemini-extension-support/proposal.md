# Add Gemini CLI Extension Support

## Goal
Transform the OpenSpec repository into a valid Gemini CLI extension to enhance the development experience for users employing the Gemini CLI.

## Motivation
Integrating with Gemini CLI allows us to provide deep, project-specific context and potentially custom tools directly to the AI agent. This "eases the integration path" by making the agent "OpenSpec-aware" out of the box when this extension is installed or linked.

## Proposed Solution
1.  **Extension Manifest**: Create a `gemini-extension.json` file in the project root. This file defines the extension metadata and points to the context file.
2.  **Context File**: Create a `GEMINI.md` file in the project root. This file will contain high-level instructions, architectural overviews, and usage guides for OpenSpec, tailored for the Gemini agent. It should reference or inline key parts of `AGENTS.md` and `openspec/project.md`.
3.  **Unified Prompts**: Extract core slash command prompts into a shared `src/core/templates/prompts.ts` file. This ensures that all agent integrations (Claude, Cursor, Gemini, etc.) use the same underlying instructions.
4.  **Native Slash Commands**: Create native Gemini CLI slash command files (`.toml`) in `.gemini/commands/openspec/` that consume the unified prompts. This allows users to trigger OpenSpec workflows directly via `/openspec:proposal`, etc.

## Benefits
- **Contextual Awareness**: Gemini CLI will automatically understand OpenSpec commands (`openspec init`, `openspec change`, etc.) and conventions without manual prompting.
- **Standardization**: Ensures that the AI assistant follows the project's specific coding and contribution guidelines.
- **Extensibility**: Lay the groundwork for future MCP server integrations (e.g., tools to automatically validate specs or scaffold changes).
