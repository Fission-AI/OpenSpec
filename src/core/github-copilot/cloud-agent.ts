/**
 * GitHub Copilot Cloud Agent Support
 *
 * Generates copilot-setup-steps.yml and .github/agents/openspec.agent.md
 * when the github-copilot tool is selected during init/update.
 * These files enable the GitHub Copilot coding agent (cloud) to use the
 * OpenSpec CLI in its ephemeral dev environment.
 */

import path from 'path';
import { FileSystemUtils } from '../../utils/file-system.js';

const COPILOT_TOOL_ID = 'github-copilot';

/**
 * Check if a tool list includes github-copilot.
 */
export function includesGitHubCopilot(toolIds: string[]): boolean {
  return toolIds.includes(COPILOT_TOOL_ID);
}

/**
 * Generate the copilot-setup-steps.yml workflow file content.
 * This workflow pre-installs the OpenSpec CLI in the Copilot coding agent's
 * ephemeral GitHub Actions environment.
 */
export function generateCopilotSetupSteps(): string {
  return `name: "Copilot Setup Steps"

# Runs automatically when changed (for validation) and can be triggered manually.
on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml
  pull_request:
    paths:
      - .github/workflows/copilot-setup-steps.yml

jobs:
  # The job MUST be called \`copilot-setup-steps\` for Copilot coding agent to pick it up.
  copilot-setup-steps:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    permissions:
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install OpenSpec CLI
        run: npm install -g @fission-ai/openspec

      - name: Verify OpenSpec CLI
        run: openspec --version
`;
}

/**
 * Generate the .github/agents/openspec.agent.md custom agent file content.
 * This tells the GitHub Copilot coding agent how to use the OpenSpec CLI.
 */
export function generateCopilotAgentFile(): string {
  return `---
name: OpenSpec
description: "Manages OpenSpec changes, specs, and workflows using the OpenSpec CLI. Use this agent for proposing changes, exploring ideas, validating artifacts, checking status, and archiving completed work."
tools:
  - "terminal"
---

# OpenSpec Agent

You are a specialized agent for managing OpenSpec workflows. You have access to the \`openspec\` CLI which is pre-installed in the development environment via \`copilot-setup-steps.yml\`.

## What is OpenSpec?

OpenSpec is a structured change management system for codebases. It organizes work into **changes** with planning artifacts (proposals, specs, designs, tasks) that guide implementation.

## Available Commands

### Agent-Compatible CLI Commands (prefer \`--json\` for structured output)

| Command | Purpose |
|---------|---------|
| \`openspec list [--json]\` | List all changes and specs |
| \`openspec show <item> [--json]\` | View a specific change or spec |
| \`openspec validate [--all] [--json]\` | Validate changes and specs for issues |
| \`openspec status [--json]\` | Show artifact progress for active changes |
| \`openspec instructions [--json]\` | Get next-step instructions for a change |
| \`openspec templates [--json]\` | List available templates |
| \`openspec schemas [--json]\` | List available workflow schemas |
| \`openspec archive <change>\` | Archive a completed change |

### Interactive CLI Commands (use when prompted by the user)

| Command | Purpose |
|---------|---------|
| \`openspec init\` | Initialize OpenSpec in the project |
| \`openspec update\` | Update OpenSpec configuration and artifacts |
| \`openspec view\` | Interactive dashboard |
| \`openspec config\` | View or modify settings |

## Workflow

When asked to work with OpenSpec, follow this pattern:

1. **Check current state**: Run \`openspec status --json\` to understand what changes exist and their progress.
2. **Follow instructions**: Run \`openspec instructions --json\` to get context-aware next steps.
3. **Validate before completing**: Run \`openspec validate --all --json\` to ensure artifacts are correct.

## Creating New Changes

When the user wants to propose a new change:

1. Create the change directory under \`openspec/changes/<change-name>/\`
2. Generate the required planning artifacts based on the project's configured workflow schema
3. Run \`openspec validate --json\` to verify the artifacts are well-formed

## Key Directories

- \`openspec/\` — Root OpenSpec directory
- \`openspec/changes/\` — Active changes with their artifacts
- \`openspec/config.yaml\` — Project configuration
- \`openspec/explorations/\` — Exploration documents

## Best Practices

- Always use \`--json\` flag when you need to parse output programmatically
- Run \`openspec validate\` after creating or modifying artifacts
- Check \`openspec status\` before starting work to understand the current state
- When archiving, ensure all tasks are completed and validated first
`;
}

/**
 * File paths (relative to project root) for the generated files.
 */
export const COPILOT_CLOUD_FILES = {
  setupSteps: path.join('.github', 'workflows', 'copilot-setup-steps.yml'),
  agent: path.join('.github', 'agents', 'openspec.agent.md'),
} as const;

/**
 * Write copilot cloud agent files to the project directory.
 * Only writes if the files don't already exist (to avoid overwriting user customizations).
 *
 * @returns Object indicating which files were written.
 */
export async function writeCopilotCloudFiles(
  projectPath: string,
  options?: { force?: boolean }
): Promise<{ setupStepsWritten: boolean; agentWritten: boolean }> {
  const force = options?.force ?? false;
  let setupStepsWritten = false;
  let agentWritten = false;

  const setupStepsPath = path.join(projectPath, COPILOT_CLOUD_FILES.setupSteps);
  const agentPath = path.join(projectPath, COPILOT_CLOUD_FILES.agent);

  // Write copilot-setup-steps.yml
  if (force || !(await FileSystemUtils.fileExists(setupStepsPath))) {
    await FileSystemUtils.writeFile(setupStepsPath, generateCopilotSetupSteps());
    setupStepsWritten = true;
  }

  // Write openspec.agent.md
  if (force || !(await FileSystemUtils.fileExists(agentPath))) {
    await FileSystemUtils.writeFile(agentPath, generateCopilotAgentFile());
    agentWritten = true;
  }

  return { setupStepsWritten, agentWritten };
}

/**
 * Remove copilot cloud agent files from the project directory.
 * Used when github-copilot is deselected.
 *
 * @returns Number of files removed.
 */
export async function removeCopilotCloudFiles(projectPath: string): Promise<number> {
  let removed = 0;

  for (const relPath of Object.values(COPILOT_CLOUD_FILES)) {
    const fullPath = path.join(projectPath, relPath);
    if (await FileSystemUtils.fileExists(fullPath)) {
      const fs = await import('fs');
      await fs.promises.unlink(fullPath);
      removed++;
    }
  }

  return removed;
}
