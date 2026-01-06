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
import { getNewChangeSkillTemplate, getContinueChangeSkillTemplate, getApplyChangeSkillTemplate, getOpsxNewCommandTemplate, getOpsxContinueCommandTemplate, getOpsxApplyCommandTemplate } from '../core/templates/skill-templates.js';
import { FileSystemUtils } from '../utils/file-system.js';

// -----------------------------------------------------------------------------
// Types for Apply Instructions
// -----------------------------------------------------------------------------

interface TaskItem {
  id: string;
  description: string;
  done: boolean;
}

interface ApplyInstructions {
  changeName: string;
  changeDir: string;
  contextFiles: {
    proposal?: string;
    specs: string;
    design?: string;
    tasks: string;
  };
  progress: {
    total: number;
    complete: number;
    remaining: number;
  };
  tasks: TaskItem[];
  state: 'blocked' | 'all_done' | 'ready';
  missingArtifacts?: string[];
  instruction: string;
}

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

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema);
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

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema);

    if (!artifactId) {
      spinner.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Missing required argument <artifact>. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const artifact = context.graph.getArtifact(artifactId);

    if (!artifact) {
      spinner.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Artifact '${artifactId}' not found in schema '${context.schemaName}'. Valid artifacts:\n  ${validIds.join('\n  ')}`
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
  const {
    artifactId,
    changeName,
    schemaName,
    changeDir,
    outputPath,
    description,
    instruction,
    template,
    dependencies,
    unlocks,
  } = instructions;

  // Opening tag
  console.log(`<artifact id="${artifactId}" change="${changeName}" schema="${schemaName}">`);
  console.log();

  // Warning for blocked artifacts
  if (isBlocked) {
    const missing = dependencies.filter((d) => !d.done).map((d) => d.id);
    console.log('<warning>');
    console.log('This artifact has unmet dependencies. Complete them first or proceed with caution.');
    console.log(`Missing: ${missing.join(', ')}`);
    console.log('</warning>');
    console.log();
  }

  // Task directive
  console.log('<task>');
  console.log(`Create the ${artifactId} artifact for change "${changeName}".`);
  console.log(description);
  console.log('</task>');
  console.log();

  // Context (dependencies)
  if (dependencies.length > 0) {
    console.log('<context>');
    console.log('Read these files for context before creating this artifact:');
    console.log();
    for (const dep of dependencies) {
      const status = dep.done ? 'done' : 'missing';
      const fullPath = path.join(changeDir, dep.path);
      console.log(`<dependency id="${dep.id}" status="${status}">`);
      console.log(`  <path>${fullPath}</path>`);
      console.log(`  <description>${dep.description}</description>`);
      console.log('</dependency>');
    }
    console.log('</context>');
    console.log();
  }

  // Output location
  console.log('<output>');
  console.log(`Write to: ${path.join(changeDir, outputPath)}`);
  console.log('</output>');
  console.log();

  // Instruction (guidance)
  if (instruction) {
    console.log('<instruction>');
    console.log(instruction.trim());
    console.log('</instruction>');
    console.log();
  }

  // Template
  console.log('<template>');
  console.log(template.trim());
  console.log('</template>');
  console.log();

  // Success criteria placeholder
  console.log('<success_criteria>');
  console.log('<!-- To be defined in schema validation rules -->');
  console.log('</success_criteria>');
  console.log();

  // Unlocks
  if (unlocks.length > 0) {
    console.log('<unlocks>');
    console.log(`Completing this artifact enables: ${unlocks.join(', ')}`);
    console.log('</unlocks>');
    console.log();
  }

  // Closing tag
  console.log('</artifact>');
}

// -----------------------------------------------------------------------------
// Apply Instructions Command
// -----------------------------------------------------------------------------

interface ApplyInstructionsOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

/**
 * Parses tasks.md content and extracts task items with their completion status.
 */
function parseTasksFile(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n');
  let taskIndex = 0;

  for (const line of lines) {
    // Match checkbox patterns: - [ ] or - [x] or - [X]
    const checkboxMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (checkboxMatch) {
      taskIndex++;
      const done = checkboxMatch[1].toLowerCase() === 'x';
      const description = checkboxMatch[2].trim();
      tasks.push({
        id: `${taskIndex}`,
        description,
        done,
      });
    }
  }

  return tasks;
}

/**
 * Generates apply instructions for implementing tasks from a change.
 */
async function generateApplyInstructions(
  projectRoot: string,
  changeName: string,
  schemaName?: string
): Promise<ApplyInstructions> {
  // loadChangeContext will auto-detect schema from metadata if not provided
  const context = loadChangeContext(projectRoot, changeName, schemaName);
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);

  // Check if required artifacts exist (tasks.md is the minimum requirement)
  const tasksPath = path.join(changeDir, 'tasks.md');
  const proposalPath = path.join(changeDir, 'proposal.md');
  const designPath = path.join(changeDir, 'design.md');
  const specsPath = path.join(changeDir, 'specs');

  const hasProposal = fs.existsSync(proposalPath);
  const hasDesign = fs.existsSync(designPath);
  const hasTasks = fs.existsSync(tasksPath);
  const hasSpecs = fs.existsSync(specsPath);

  // Determine state and missing artifacts
  const missingArtifacts: string[] = [];
  if (!hasTasks) {
    // Check what's missing to create tasks (design is optional)
    if (!hasProposal) missingArtifacts.push('proposal');
    if (!hasSpecs) missingArtifacts.push('specs');
    if (missingArtifacts.length === 0) missingArtifacts.push('tasks');
  }

  // Build context files object
  const contextFiles: ApplyInstructions['contextFiles'] = {
    specs: path.join(changeDir, 'specs/**/*.md'),
    tasks: tasksPath,
  };
  if (hasProposal) contextFiles.proposal = proposalPath;
  if (hasDesign) contextFiles.design = designPath;

  // Parse tasks if file exists
  let tasks: TaskItem[] = [];
  if (hasTasks) {
    const tasksContent = await fs.promises.readFile(tasksPath, 'utf-8');
    tasks = parseTasksFile(tasksContent);
  }

  // Calculate progress
  const total = tasks.length;
  const complete = tasks.filter((t) => t.done).length;
  const remaining = total - complete;

  // Determine state
  let state: ApplyInstructions['state'];
  let instruction: string;

  if (!hasTasks || missingArtifacts.length > 0) {
    state = 'blocked';
    instruction = `Cannot apply this change yet. Missing artifacts: ${missingArtifacts.join(', ')}.\nUse the openspec-continue-change skill to create the missing artifacts first.`;
  } else if (remaining === 0 && total > 0) {
    state = 'all_done';
    instruction = 'All tasks are complete! This change is ready to be archived.\nConsider running tests and reviewing the changes before archiving.';
  } else if (total === 0) {
    state = 'blocked';
    instruction = 'The tasks.md file exists but contains no tasks.\nAdd tasks to tasks.md or regenerate it with openspec-continue-change.';
  } else {
    state = 'ready';
    instruction = 'Read context files, work through pending tasks, mark complete as you go.\nPause if you hit blockers or need clarification.';
  }

  return {
    changeName,
    changeDir,
    contextFiles,
    progress: { total, complete, remaining },
    tasks,
    state,
    missingArtifacts: missingArtifacts.length > 0 ? missingArtifacts : undefined,
    instruction,
  };
}

async function applyInstructionsCommand(options: ApplyInstructionsOptions): Promise<void> {
  const spinner = ora('Generating apply instructions...').start();

  try {
    const projectRoot = process.cwd();
    const changeName = await validateChangeExists(options.change, projectRoot);

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema);
    }

    // generateApplyInstructions uses loadChangeContext which auto-detects schema
    const instructions = await generateApplyInstructions(projectRoot, changeName, options.schema);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(instructions, null, 2));
      return;
    }

    printApplyInstructionsText(instructions);
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function printApplyInstructionsText(instructions: ApplyInstructions): void {
  const { changeName, contextFiles, progress, tasks, state, missingArtifacts, instruction } = instructions;

  console.log(`## Apply: ${changeName}`);
  console.log();

  // Warning for blocked state
  if (state === 'blocked' && missingArtifacts) {
    console.log('### ⚠️ Blocked');
    console.log();
    console.log(`Missing artifacts: ${missingArtifacts.join(', ')}`);
    console.log('Use the openspec-continue-change skill to create these first.');
    console.log();
  }

  // Context files
  console.log('### Context Files');
  if (contextFiles.proposal) {
    console.log(`- proposal: ${contextFiles.proposal}`);
  }
  console.log(`- specs: ${contextFiles.specs}`);
  if (contextFiles.design) {
    console.log(`- design: ${contextFiles.design}`);
  }
  console.log(`- tasks: ${contextFiles.tasks}`);
  console.log();

  // Progress
  console.log('### Progress');
  if (state === 'all_done') {
    console.log(`${progress.complete}/${progress.total} complete ✓`);
  } else {
    console.log(`${progress.complete}/${progress.total} complete`);
  }
  console.log();

  // Tasks
  if (tasks.length > 0) {
    console.log('### Tasks');
    for (const task of tasks) {
      const checkbox = task.done ? '[x]' : '[ ]';
      console.log(`- ${checkbox} ${task.description}`);
    }
    console.log();
  }

  // Instruction
  console.log('### Instruction');
  console.log(instruction);
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
  schema?: string;
}

async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  if (!name) {
    throw new Error('Missing required argument <name>');
  }

  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Validate schema if provided
  if (options.schema) {
    validateSchemaExists(options.schema);
  }

  const schemaDisplay = options.schema ? ` with schema '${options.schema}'` : '';
  const spinner = ora(`Creating change '${name}'${schemaDisplay}...`).start();

  try {
    const projectRoot = process.cwd();
    await createChange(projectRoot, name, { schema: options.schema });

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const changeDir = path.join(projectRoot, 'openspec', 'changes', name);
      const readmePath = path.join(changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    const schemaUsed = options.schema ?? DEFAULT_SCHEMA;
    spinner.succeed(`Created change '${name}' at openspec/changes/${name}/ (schema: ${schemaUsed})`);
  } catch (error) {
    spinner.fail(`Failed to create change '${name}'`);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Artifact Experimental Setup Command
// -----------------------------------------------------------------------------

/**
 * Generates Agent Skills and slash commands for the experimental artifact workflow.
 * Creates .claude/skills/ directory with SKILL.md files following Agent Skills spec.
 * Creates .claude/commands/opsx/ directory with slash command files.
 */
async function artifactExperimentalSetupCommand(): Promise<void> {
  const spinner = ora('Setting up experimental artifact workflow...').start();

  try {
    const projectRoot = process.cwd();
    const skillsDir = path.join(projectRoot, '.claude', 'skills');
    const commandsDir = path.join(projectRoot, '.claude', 'commands', 'opsx');

    // Get skill templates
    const newChangeSkill = getNewChangeSkillTemplate();
    const continueChangeSkill = getContinueChangeSkillTemplate();
    const applyChangeSkill = getApplyChangeSkillTemplate();

    // Get command templates
    const newCommand = getOpsxNewCommandTemplate();
    const continueCommand = getOpsxContinueCommandTemplate();
    const applyCommand = getOpsxApplyCommandTemplate();

    // Create skill directories and SKILL.md files
    const skills = [
      { template: newChangeSkill, dirName: 'openspec-new-change' },
      { template: continueChangeSkill, dirName: 'openspec-continue-change' },
      { template: applyChangeSkill, dirName: 'openspec-apply-change' },
    ];

    const createdSkillFiles: string[] = [];

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
      createdSkillFiles.push(path.relative(projectRoot, skillFile));
    }

    // Create slash command files
    const commands = [
      { template: newCommand, fileName: 'new.md' },
      { template: continueCommand, fileName: 'continue.md' },
      { template: applyCommand, fileName: 'apply.md' },
    ];

    const createdCommandFiles: string[] = [];

    for (const { template, fileName } of commands) {
      const commandFile = path.join(commandsDir, fileName);

      // Generate command content with YAML frontmatter
      const commandContent = `---
name: ${template.name}
description: ${template.description}
category: ${template.category}
tags: [${template.tags.join(', ')}]
---

${template.content}
`;

      // Write the command file
      await FileSystemUtils.writeFile(commandFile, commandContent);
      createdCommandFiles.push(path.relative(projectRoot, commandFile));
    }

    spinner.succeed('Experimental artifact workflow setup complete!');

    // Print success message
    console.log();
    console.log(chalk.bold('🧪 Experimental Artifact Workflow Setup Complete'));
    console.log();
    console.log(chalk.bold('Skills Created:'));
    for (const file of createdSkillFiles) {
      console.log(chalk.green('  ✓ ' + file));
    }
    console.log();
    console.log(chalk.bold('Slash Commands Created:'));
    for (const file of createdCommandFiles) {
      console.log(chalk.green('  ✓ ' + file));
    }
    console.log();
    console.log(chalk.bold('📖 Usage:'));
    console.log();
    console.log('  ' + chalk.cyan('Skills') + ' work automatically in compatible editors:');
    console.log('  • Claude Code - Auto-detected, ready to use');
    console.log('  • Cursor - Enable in Settings → Rules → Import Settings');
    console.log('  • Windsurf - Auto-imports from .claude directory');
    console.log();
    console.log('  Ask Claude naturally:');
    console.log('  • "I want to start a new OpenSpec change to add <feature>"');
    console.log('  • "Continue working on this change"');
    console.log('  • "Implement the tasks for this change"');
    console.log();
    console.log('  ' + chalk.cyan('Slash Commands') + ' for explicit invocation:');
    console.log('  • /opsx:new - Start a new change');
    console.log('  • /opsx:continue - Create the next artifact');
    console.log('  • /opsx:apply - Implement tasks');
    console.log();
    console.log(chalk.yellow('💡 This is an experimental feature.'));
    console.log('   Feedback welcome at: https://github.com/Fission-AI/OpenSpec/issues');
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
