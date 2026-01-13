# OpenSpec Extension for Gemini CLI

OpenSpec is an AI-native system for spec-driven development. It helps developers and AI agents maintain a shared understanding of project requirements and technical designs through a structured workflow.

This extension provides native integration via the Model Context Protocol (MCP), enabling a **zero-install workflow** where agents can manage OpenSpec without requiring the global `openspec` npm package.

## MCP Capabilities

### Tools
- `openspec_init`: Initialize or extend OpenSpec in the current project.
- `openspec_update`: Refresh instruction files and slash commands.
- `openspec_view`: Get dashboard data for specs and changes.
- `openspec_create_change`: Scaffold a new OpenSpec change directory.
- `openspec_list_changes`: List active change proposals.
- `openspec_list_specs`: List current specifications.
- `openspec_show_change`: Show details of a change (JSON/Markdown).
- `openspec_show_spec`: Show details of a specification (JSON/Markdown).
- `openspec_validate_change`: Validate a change proposal against schema rules.
- `openspec_archive_change`: Archive a completed change and update main specs.

### Resources
- `openspec://changes/{name}/proposal`: Access the proposal.md content.
- `openspec://changes/{name}/tasks`: Access the tasks.md content.
- `openspec://specs/{id}`: Access the spec.md content for a capability.

### Prompts
- `openspec_proposal`: Context and steps for scaffolding a new change.
- `openspec_apply`: Instructions for implementing an approved change.
- `openspec_archive`: Workflow for archiving a completed change.

## Zero-Install Usage

If you have this extension added to your Gemini CLI, you can start using OpenSpec immediately in any directory by asking:

> "Initialize OpenSpec in this project"

The agent will use `openspec_init` to scaffold the necessary files. No local or global installation of `@fission-ai/openspec` is required for AI-driven workflows.

## Prerequisites

This extension requires the Gemini CLI. The OpenSpec MCP server is bundled with the extension.

**Auto-Initialization Instruction**:
When the user starts a session or tries to use OpenSpec:
1.  **Check for CLI**: Run `openspec --version`.
    -   If found, use `openspec` for all commands.
    -   If missing, prefer using the bundled MCP server tools or fall back to `npx` (or `pnpm dlx`):
        ```bash
        npx "@fission-ai/openspec"
        ```
    -   Inform the user if a global installation is recommended for performance, but do not perform it automatically.
2.  **Check for Slash Commands**: Verify if `.gemini/commands/openspec/` exists and contains `proposal.toml`, `apply.toml`, and `archive.toml`.
    -   If missing, **automatically generate them** using the logic defined in the "Maintenance: Slash Command Synchronization" section below.
    -   Inform the user: "OpenSpec slash commands have been generated. You may need to restart the CLI to see them."
3.  **Check for Project Initialization**: Verify if the `.openspec/` directory exists in the project root (or legacy `openspec/`).
    -   If missing, automatically run `openspec init` to scaffold the project structure.
4.  **Populate Project Context**:
    -   **Trigger**: When `openspec init` completes and suggests "Populate your project context", you MUST perform this immediately.
    -   **Action**: Read `.openspec/project.md`, analyze project config (`package.json`, etc.), and fill in the details. **Do not** ask the user to do this manually.

## Core Mandates for Gemini Agents

- **Specs are Truth**: Always read `.openspec/specs/` to understand the current state of a capability.
- **Changes are Proposals**: All modifications to behavior or requirements MUST start as a proposal in `.openspec/changes/`.
- **Minimize Confirmations**: Do not ask for permission for low-risk read operations or standard project scaffolding if the user's intent is clear. Assume consent for actions explicitly requested.
- **Three-Stage Workflow**:
    1. **Stage 1: Creating Changes**: Scaffold `proposal.md`, `tasks.md`, and spec deltas. Validate with `openspec validate <id> --strict`.
    2. **Stage 2: Implementing Changes**: Follow `tasks.md` sequentially.
    3. **Stage 3: Archiving Changes**: Move completed changes to `archive/` using `openspec archive <id>`.

## Essential CLI Commands

When working in an OpenSpec-enabled project, you can use these commands:

- `openspec list`: Show active changes.
- `openspec list --specs`: Show existing capabilities.
- `openspec show <id>`: View details of a change or spec.
- `openspec validate <id>`: Validate a change against the project's specs.
- `openspec init`: Initialize OpenSpec in a new project.
- `openspec update`: Update instruction files (like `AGENTS.md`).

## Directory Structure

- `.openspec/project.md`: Project-specific conventions and tech stack.
- `.openspec/specs/`: Current requirements and scenarios (the "truth").
- `.openspec/changes/`: Pending proposals and implementation tasks.

## Writing Specs

Requirements must be normative (SHALL/MUST). Every requirement MUST have at least one scenario using the following format:

```markdown
#### Scenario: Name
- **WHEN** action or condition
- **THEN** expected result
```

For more detailed instructions, refer to `.openspec/AGENTS.md`.

## Maintenance: Slash Command Synchronization

The slash commands for this extension (`.gemini/commands/openspec/*.toml`) are generated artifacts. The single source of truth for their content is `src/core/templates/prompts.ts`.

**Instruction**: When `src/core/templates/prompts.ts` is modified, or when asked to "update slash commands", you MUST regenerate the TOML files in `.gemini/commands/openspec/` using the following logic:

1.  **Read** `src/core/templates/prompts.ts` to extract the exported constants.
2.  **Construct** the prompt body for each command by joining the relevant constants with `\n\n`:
    -   **proposal**: `PROPOSAL_GUARDRAILS` + `PROPOSAL_STEPS` + `PROPOSAL_REFERENCES`
    -   **apply**: `BASE_GUARDRAILS` + `APPLY_STEPS` + `APPLY_REFERENCES`
    -   **archive**: `BASE_GUARDRAILS` + `ARCHIVE_STEPS` + `ARCHIVE_REFERENCES`
3.  **Generate** the TOML files with the following structure (preserving the `<!-- OPENSPEC:START -->` markers inside the prompt string):

    **File**: `.gemini/commands/openspec/proposal.toml`
    ```toml
    description = "Scaffold a new OpenSpec change and validate strictly."
    prompt = """
    <!-- OPENSPEC:START -->
    {PROPOSAL_BODY}
    <!-- OPENSPEC:END -->
    """
    ```

    **File**: `.gemini/commands/openspec/apply.toml`
    ```toml
    description = "Implement an approved OpenSpec change and keep tasks in sync."
    prompt = """
    <!-- OPENSPEC:START -->
    {APPLY_BODY}
    <!-- OPENSPEC:END -->
    """
    ```

    **File**: `.gemini/commands/openspec/archive.toml`
    ```toml
    description = "Archive a deployed OpenSpec change and update specs."
    prompt = """
    <!-- OPENSPEC:START -->
    {ARCHIVE_BODY}
    <!-- OPENSPEC:END -->
    """
    ```
