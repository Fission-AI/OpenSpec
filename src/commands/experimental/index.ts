/**
 * Artifact Workflow CLI Commands (Experimental)
 *
 * This module contains all artifact workflow commands in isolation for easy removal.
 * Commands expose the ArtifactGraph and InstructionLoader APIs to users and agents.
 *
 * To remove this feature:
 * 1. Delete this directory
 * 2. Remove the registerArtifactWorkflowCommands() call from src/cli/index.ts
 */

import type { Command } from 'commander';
import ora from 'ora';

import { DEFAULT_SCHEMA } from './shared.js';
import { statusCommand, type StatusOptions } from './status.js';
import {
  instructionsCommand,
  applyInstructionsCommand,
  type InstructionsOptions,
} from './instructions.js';
import { templatesCommand, type TemplatesOptions } from './templates.js';
import { schemasCommand, type SchemasOptions } from './schemas.js';
import { newChangeCommand, type NewChangeOptions } from './new-change.js';
import { artifactExperimentalSetupCommand, type ArtifactExperimentalSetupOptions } from './setup.js';

// -----------------------------------------------------------------------------
// Command Registration
// -----------------------------------------------------------------------------

/**
 * Registers all artifact workflow commands on the given program.
 * All commands are marked as experimental in their help text.
 */
export function registerArtifactWorkflowCommands(program: Command): void {
  // Status command
  program
    .command('status')
    .description('[Experimental] Display artifact completion status for a change')
    .option('--change <id>', 'Change name to show status for')
    .option('--schema <name>', 'Schema override (auto-detected from .openspec.yaml)')
    .option('--json', 'Output as JSON')
    .action(async (options: StatusOptions) => {
      try {
        await statusCommand(options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Instructions command
  program
    .command('instructions [artifact]')
    .description('[Experimental] Output enriched instructions for creating an artifact or applying tasks')
    .option('--change <id>', 'Change name')
    .option('--schema <name>', 'Schema override (auto-detected from .openspec.yaml)')
    .option('--json', 'Output as JSON')
    .action(async (artifactId: string | undefined, options: InstructionsOptions) => {
      try {
        // Special case: "apply" is not an artifact, but a command to get apply instructions
        if (artifactId === 'apply') {
          await applyInstructionsCommand(options);
        } else {
          await instructionsCommand(artifactId, options);
        }
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Templates command
  program
    .command('templates')
    .description('[Experimental] Show resolved template paths for all artifacts in a schema')
    .option('--schema <name>', `Schema to use (default: ${DEFAULT_SCHEMA})`)
    .option('--json', 'Output as JSON mapping artifact IDs to template paths')
    .action(async (options: TemplatesOptions) => {
      try {
        await templatesCommand(options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Schemas command
  program
    .command('schemas')
    .description('[Experimental] List available workflow schemas with descriptions')
    .option('--json', 'Output as JSON (for agent use)')
    .action(async (options: SchemasOptions) => {
      try {
        await schemasCommand(options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // New command group with change subcommand
  const newCmd = program.command('new').description('[Experimental] Create new items');

  newCmd
    .command('change <name>')
    .description('[Experimental] Create a new change directory')
    .option('--description <text>', 'Description to add to README.md')
    .option('--schema <name>', `Workflow schema to use (default: ${DEFAULT_SCHEMA})`)
    .action(async (name: string, options: NewChangeOptions) => {
      try {
        await newChangeCommand(name, options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Artifact experimental setup command
  program
    .command('artifact-experimental-setup')
    .description('[Experimental] Setup Agent Skills for the experimental artifact workflow')
    .option('--tool <tool-id>', 'Target AI tool (e.g., claude, cursor, windsurf)')
    .option('--no-interactive', 'Disable interactive prompts')
    .action(async (options: ArtifactExperimentalSetupOptions) => {
      try {
        await artifactExperimentalSetupCommand(options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
