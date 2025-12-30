/**
 * Artifact Workflow CLI Commands (Experimental)
 *
 * This file contains all artifact workflow commands in isolation for easy removal.
 * Commands expose the ArtifactGraph and InstructionLoader APIs to users and agents.
 *
 * To remove this feature:
 * 1. Delete this file
 * 2. Remove the registerArtifactWorkflowCommands() call from src/cli/index.ts
 */

import type { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import * as fs from 'fs';
import {
  loadChangeContext,
  formatChangeStatus,
  generateInstructions,
  listSchemas,
  getSchemaDir,
  resolveSchema,
  ArtifactGraph,
  type ChangeStatus,
  type ArtifactInstructions,
} from '../core/artifact-graph/index.js';
import { createChange, validateChangeName } from '../utils/change-utils.js';
import { getNewChangeSkillTemplate, getContinueChangeSkillTemplate } from '../core/templates/skill-templates.js';
import { FileSystemUtils } from '../utils/file-system.js';

const DEFAULT_SCHEMA = 'spec-driven';

/**
 * Checks if color output is disabled via NO_COLOR env or --no-color flag.
 */
function isColorDisabled(): boolean {
  return process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true';
}

/**
 * Gets the color function based on status.
 */
function getStatusColor(status: 'done' | 'ready' | 'blocked'): (text: string) => string {
  if (isColorDisabled()) {
    return (text: string) => text;
  }
  switch (status) {
    case 'done':
      return chalk.green;
    case 'ready':
      return chalk.yellow;
    case 'blocked':
      return chalk.red;
  }
}

/**
 * Gets the status indicator for an artifact.
 */
function getStatusIndicator(status: 'done' | 'ready' | 'blocked'): string {
  const color = getStatusColor(status);
  switch (status) {
    case 'done':
      return color('[x]');
    case 'ready':
      return color('[ ]');
    case 'blocked':
      return color('[-]');
  }
}

/**
 * Validates that a change exists and returns available changes if not.
 * Checks directory existence directly to support scaffolded changes (without proposal.md).
 */
async function validateChangeExists(
  changeName: string | undefined,
  projectRoot: string
): Promise<string> {
  const changesPath = path.join(projectRoot, 'openspec', 'changes');

  // Get all change directories (not just those with proposal.md)
  const getAvailableChanges = async (): Promise<string[]> => {
    try {
      const entries = await fs.promises.readdir(changesPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
        .map((e) => e.name);
    } catch {
      return [];
    }
  };

  if (!changeName) {
    const available = await getAvailableChanges();
    if (available.length === 0) {
      throw new Error('No changes found. Create one with: openspec new change <name>');
    }
    throw new Error(
      `Missing required option --change. Available changes:\n  ${available.join('\n  ')}`
    );
  }

  // Validate change name format to prevent path traversal
  const nameValidation = validateChangeName(changeName);
  if (!nameValidation.valid) {
    throw new Error(`Invalid change name '${changeName}': ${nameValidation.error}`);
  }

  // Check directory existence directly
  const changePath = path.join(changesPath, changeName);
  const exists = fs.existsSync(changePath) && fs.statSync(changePath).isDirectory();

  if (!exists) {
    const available = await getAvailableChanges();
    if (available.length === 0) {
      throw new Error(
        `Change '${changeName}' not found. No changes exist. Create one with: openspec new change <name>`
      );
    }
    throw new Error(
      `Change '${changeName}' not found. Available changes:\n  ${available.join('\n  ')}`
    );
  }

  return changeName;
}

/**
 * Validates that a schema exists and returns available schemas if not.
 */
function validateSchemaExists(schemaName: string): string {
  const schemaDir = getSchemaDir(schemaName);
  if (!schemaDir) {
    const availableSchemas = listSchemas();
    throw new Error(
      `Schema '${schemaName}' not found. Available schemas:\n  ${availableSchemas.join('\n  ')}`
    );
  }
  return schemaName;
}

// -----------------------------------------------------------------------------
// Status Command
// -----------------------------------------------------------------------------

interface StatusOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

async function statusCommand(options: StatusOptions): Promise<void> {
  const spinner = ora('Loading change status...').start();

  try {
    const projectRoot = process.cwd();
    const changeName = await validateChangeExists(options.change, projectRoot);
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA);

    const context = loadChangeContext(projectRoot, changeName, schemaName);
    const status = formatChangeStatus(context);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    printStatusText(status);
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function printStatusText(status: ChangeStatus): void {
  const doneCount = status.artifacts.filter((a) => a.status === 'done').length;
  const total = status.artifacts.length;

  console.log(`Change: ${status.changeName}`);
  console.log(`Schema: ${status.schemaName}`);
  console.log(`Progress: ${doneCount}/${total} artifacts complete`);
  console.log();

  for (const artifact of status.artifacts) {
    const indicator = getStatusIndicator(artifact.status);
    const color = getStatusColor(artifact.status);
    let line = `${indicator} ${artifact.id}`;

    if (artifact.status === 'blocked' && artifact.missingDeps && artifact.missingDeps.length > 0) {
      line += color(` (blocked by: ${artifact.missingDeps.join(', ')})`);
    }

    console.log(line);
  }

  if (status.isComplete) {
    console.log();
    console.log(chalk.green('All artifacts complete!'));
  }
}

// -----------------------------------------------------------------------------
// Next Command
// -----------------------------------------------------------------------------

interface NextOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

async function nextCommand(options: NextOptions): Promise<void> {
  const spinner = ora('Finding next artifacts...').start();

  try {
    const projectRoot = process.cwd();
    const changeName = await validateChangeExists(options.change, projectRoot);
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA);

    const context = loadChangeContext(projectRoot, changeName, schemaName);
    const ready = context.graph.getNextArtifacts(context.completed);
    const isComplete = context.graph.isComplete(context.completed);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(ready, null, 2));
      return;
    }

    if (isComplete) {
      console.log(chalk.green('All artifacts are complete!'));
      return;
    }

    if (ready.length === 0) {
      console.log('No artifacts are ready. All remaining artifacts are blocked.');
      console.log('Run `openspec status --change ' + changeName + '` to see blocked dependencies.');
      return;
    }

    console.log('Artifacts ready to create:');
    for (const artifactId of ready) {
      const color = getStatusColor('ready');
      console.log(color(`  ${artifactId}`));
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Instructions Command
// -----------------------------------------------------------------------------

interface InstructionsOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

async function instructionsCommand(
  artifactId: string | undefined,
  options: InstructionsOptions
): Promise<void> {
  const spinner = ora('Generating instructions...').start();

  try {
    const projectRoot = process.cwd();
    const changeName = await validateChangeExists(options.change, projectRoot);
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA);

    if (!artifactId) {
      spinner.stop();
      const schema = resolveSchema(schemaName);
      const graph = ArtifactGraph.fromSchema(schema);
      const validIds = graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Missing required argument <artifact>. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const context = loadChangeContext(projectRoot, changeName, schemaName);
    const artifact = context.graph.getArtifact(artifactId);

    if (!artifact) {
      spinner.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Artifact '${artifactId}' not found in schema '${schemaName}'. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const instructions = generateInstructions(context, artifactId);
    const isBlocked = instructions.dependencies.some((d) => !d.done);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(instructions, null, 2));
      return;
    }

    printInstructionsText(instructions, isBlocked);
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function printInstructionsText(instructions: ArtifactInstructions, isBlocked: boolean): void {
  if (isBlocked) {
    console.log(chalk.yellow('Warning: This artifact has unmet dependencies.'));
    console.log();
  }

  console.log(`Artifact: ${instructions.artifactId}`);
  console.log(`Output: ${instructions.outputPath}`);
  console.log(`Description: ${instructions.description}`);
  console.log();

  console.log('Dependencies:');
  if (instructions.dependencies.length === 0) {
    console.log('  (none)');
  } else {
    for (const dep of instructions.dependencies) {
      const status = dep.done ? chalk.green('[done]') : chalk.red('[missing]');
      console.log(`  ${status} ${dep.id}`);
    }
  }
  console.log();

  if (instructions.unlocks.length > 0) {
    console.log('Unlocks:');
    for (const unlocked of instructions.unlocks) {
      console.log(`  ${unlocked}`);
    }
    console.log();
  }

  console.log('Template:');
  console.log('─'.repeat(40));
  console.log(instructions.template);
}

// -----------------------------------------------------------------------------
// Templates Command
// -----------------------------------------------------------------------------

interface TemplatesOptions {
  schema?: string;
  json?: boolean;
}

interface TemplateInfo {
  artifactId: string;
  templatePath: string;
  source: 'user' | 'package';
}

async function templatesCommand(options: TemplatesOptions): Promise<void> {
  const spinner = ora('Loading templates...').start();

  try {
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA);
    const schema = resolveSchema(schemaName);
    const graph = ArtifactGraph.fromSchema(schema);
    const schemaDir = getSchemaDir(schemaName)!;

    // Determine if this is a user override or package built-in
    const { getUserSchemasDir } = await import('../core/artifact-graph/resolver.js');
    const userSchemasDir = getUserSchemasDir();
    const isUserOverride = schemaDir.startsWith(userSchemasDir);

    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => ({
      artifactId: artifact.id,
      templatePath: path.join(schemaDir, 'templates', artifact.template),
      source: isUserOverride ? 'user' : 'package',
    }));

    spinner.stop();

    if (options.json) {
      const output: Record<string, { path: string; source: string }> = {};
      for (const t of templates) {
        output[t.artifactId] = { path: t.templatePath, source: t.source };
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(`Schema: ${schemaName}`);
    console.log(`Source: ${isUserOverride ? 'user override' : 'package built-in'}`);
    console.log();

    for (const t of templates) {
      console.log(`${t.artifactId}:`);
      console.log(`  ${t.templatePath}`);
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

// -----------------------------------------------------------------------------
// New Change Command
// -----------------------------------------------------------------------------

interface NewChangeOptions {
  description?: string;
}

async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  if (!name) {
    throw new Error('Missing required argument <name>');
  }

  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const spinner = ora(`Creating change '${name}'...`).start();

  try {
    const projectRoot = process.cwd();
    await createChange(projectRoot, name);

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const changeDir = path.join(projectRoot, 'openspec', 'changes', name);
      const readmePath = path.join(changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    spinner.succeed(`Created change '${name}' at openspec/changes/${name}/`);
  } catch (error) {
    spinner.fail(`Failed to create change '${name}'`);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Artifact Experimental Setup Command
// -----------------------------------------------------------------------------

/**
 * Generates Agent Skills for the experimental artifact workflow.
 * Creates .claude/skills/ directory with SKILL.md files following Agent Skills spec.
 */
async function artifactExperimentalSetupCommand(): Promise<void> {
  const spinner = ora('Setting up experimental artifact workflow skills...').start();

  try {
    const projectRoot = process.cwd();
    const skillsDir = path.join(projectRoot, '.claude', 'skills');

    // Get skill templates
    const newChangeSkill = getNewChangeSkillTemplate();
    const continueChangeSkill = getContinueChangeSkillTemplate();

    // Create skill directories and SKILL.md files
    const skills = [
      { template: newChangeSkill, dirName: 'openspec-new-change' },
      { template: continueChangeSkill, dirName: 'openspec-continue-change' },
    ];

    const createdFiles: string[] = [];

    for (const { template, dirName } of skills) {
      const skillDir = path.join(skillsDir, dirName);
      const skillFile = path.join(skillDir, 'SKILL.md');

      // Generate SKILL.md content with YAML frontmatter
      const skillContent = `---
name: ${template.name}
description: ${template.description}
---

${template.instructions}
`;

      // Write the skill file
      await FileSystemUtils.writeFile(skillFile, skillContent);
      createdFiles.push(path.relative(projectRoot, skillFile));
    }

    spinner.succeed('Experimental artifact workflow setup complete!');

    // Print success message
    console.log();
    console.log(chalk.bold('🧪 Experimental Artifact Workflow Skills Created'));
    console.log();
    for (const file of createdFiles) {
      console.log(chalk.green('  ✓ ' + file));
    }
    console.log();
    console.log(chalk.bold('📖 Usage:'));
    console.log();
    console.log('  Skills work automatically in compatible editors:');
    console.log('  • ' + chalk.cyan('Claude Code') + ' - Auto-detected, ready to use');
    console.log('  • ' + chalk.cyan('Cursor') + ' - Enable in Settings → Rules → Import Settings');
    console.log('  • ' + chalk.cyan('Windsurf') + ' - Auto-imports from .claude directory');
    console.log();
    console.log('  Ask Claude naturally:');
    console.log('  • "I want to start a new OpenSpec change to add <feature>"');
    console.log('  • "Continue working on this change"');
    console.log();
    console.log('  Claude will automatically use the appropriate skill.');
    console.log();
    console.log(chalk.yellow('💡 This is an experimental feature.'));
    console.log('   Feedback welcome at: https://github.com/anthropics/openspec/issues');
    console.log();
  } catch (error) {
    spinner.fail('Failed to setup experimental artifact workflow');
    throw error;
  }
}

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
    .option('--schema <name>', `Schema to use (default: ${DEFAULT_SCHEMA})`)
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

  // Next command
  program
    .command('next')
    .description('[Experimental] Show artifacts ready to be created')
    .option('--change <id>', 'Change name to check')
    .option('--schema <name>', `Schema to use (default: ${DEFAULT_SCHEMA})`)
    .option('--json', 'Output as JSON array of ready artifact IDs')
    .action(async (options: NextOptions) => {
      try {
        await nextCommand(options);
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Instructions command
  program
    .command('instructions [artifact]')
    .description('[Experimental] Output enriched instructions for creating an artifact')
    .option('--change <id>', 'Change name')
    .option('--schema <name>', `Schema to use (default: ${DEFAULT_SCHEMA})`)
    .option('--json', 'Output as JSON')
    .action(async (artifactId: string | undefined, options: InstructionsOptions) => {
      try {
        await instructionsCommand(artifactId, options);
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

  // New command group with change subcommand
  const newCmd = program.command('new').description('[Experimental] Create new items');

  newCmd
    .command('change <name>')
    .description('[Experimental] Create a new change directory')
    .option('--description <text>', 'Description to add to README.md')
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
    .action(async () => {
      try {
        await artifactExperimentalSetupCommand();
      } catch (error) {
        console.log();
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
