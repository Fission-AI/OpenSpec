# OpenSpec Extension for Gemini CLI

OpenSpec is an AI-native system for spec-driven development. It helps developers and AI agents maintain a shared understanding of project requirements and technical designs through a structured workflow.

## Prerequisites

To use this extension effectively, ensure the OpenSpec CLI is installed globally on your system:

```bash
npm install -g @fission-ai/openspec
```

**Auto-Initialization Instruction**:
When the user starts a session or tries to use OpenSpec:
1.  **Check for CLI**: Run `openspec --version`. If missing, guide the user to install it via `npm install -g @fission-ai/openspec`.
2.  **Check for Slash Commands**: Verify if `.gemini/commands/openspec/` exists and contains `proposal.toml`, `apply.toml`, and `archive.toml`.
    -   If these files are missing, you **MUST automatically generate them** using the logic defined in the "Maintenance: Slash Command Synchronization" section below.
    -   Inform the user: "OpenSpec slash commands have been generated. You may need to restart the CLI to see them."

## Core Mandates for Gemini Agents

- **Specs are Truth**: Always read `openspec/specs/` to understand the current state of a capability.
- **Changes are Proposals**: All modifications to behavior or requirements MUST start as a proposal in `openspec/changes/`.
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

- `openspec/project.md`: Project-specific conventions and tech stack.
- `openspec/specs/`: Current requirements and scenarios (the "truth").
- `openspec/changes/`: Pending proposals and implementation tasks.

## Writing Specs

Requirements must be normative (SHALL/MUST). Every requirement MUST have at least one scenario using the following format:

```markdown
#### Scenario: Name
- **WHEN** action or condition
- **THEN** expected result
```

For more detailed instructions, refer to `openspec/AGENTS.md`.

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
