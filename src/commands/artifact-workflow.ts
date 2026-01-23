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
  listSchemasWithInfo,
  getSchemaDir,
  resolveSchema,
  ArtifactGraph,
  type ChangeStatus,
  type ArtifactInstructions,
  type SchemaInfo,
} from '../core/artifact-graph/index.js';
import { createChange, validateChangeName } from '../utils/change-utils.js';
import { getExploreSkillTemplate, getNewChangeSkillTemplate, getContinueChangeSkillTemplate, getApplyChangeSkillTemplate, getFfChangeSkillTemplate, getSyncSpecsSkillTemplate, getArchiveChangeSkillTemplate, getBulkArchiveChangeSkillTemplate, getVerifyChangeSkillTemplate, getOpsxExploreCommandTemplate, getOpsxNewCommandTemplate, getOpsxContinueCommandTemplate, getOpsxApplyCommandTemplate, getOpsxFfCommandTemplate, getOpsxSyncCommandTemplate, getOpsxArchiveCommandTemplate, getOpsxBulkArchiveCommandTemplate, getOpsxVerifyCommandTemplate } from '../core/templates/skill-templates.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { isInteractive } from '../utils/interactive.js';
import { serializeConfig } from '../core/config-prompts.js';
import { readProjectConfig } from '../core/project-config.js';
import { AI_TOOLS } from '../core/config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
  type CommandContent,
} from '../core/command-generation/index.js';

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
  schemaName: string;
  contextFiles: Record<string, string>;
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
 *
 * @param schemaName - The schema name to validate
 * @param projectRoot - Optional project root for project-local schema resolution
 */
function validateSchemaExists(schemaName: string, projectRoot?: string): string {
  const schemaDir = getSchemaDir(schemaName, projectRoot);
  if (!schemaDir) {
    const availableSchemas = listSchemas(projectRoot);
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
      validateSchemaExists(options.schema, projectRoot);
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
      validateSchemaExists(options.schema, projectRoot);
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

    const instructions = generateInstructions(context, artifactId, projectRoot);
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
    context,
    rules,
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

  // Project context (AI constraint - do not include in output)
  if (context) {
    console.log('<project_context>');
    console.log('<!-- This is background information for you. Do NOT include this in your output. -->');
    console.log(context);
    console.log('</project_context>');
    console.log();
  }

  // Rules (AI constraint - do not include in output)
  if (rules && rules.length > 0) {
    console.log('<rules>');
    console.log('<!-- These are constraints for you to follow. Do NOT include this in your output. -->');
    for (const rule of rules) {
      console.log(`- ${rule}`);
    }
    console.log('</rules>');
    console.log();
  }

  // Dependencies (files to read for context)
  if (dependencies.length > 0) {
    console.log('<dependencies>');
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
    console.log('</dependencies>');
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
  console.log('<!-- Use this as the structure for your output file. Fill in the sections. -->');
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
 * Checks if an artifact output exists in the change directory.
 * Supports glob patterns (e.g., "specs/*.md") by verifying at least one matching file exists.
 */
function artifactOutputExists(changeDir: string, generates: string): boolean {
  // Normalize the generates path to use platform-specific separators
  const normalizedGenerates = generates.split('/').join(path.sep);
  const fullPath = path.join(changeDir, normalizedGenerates);

  // If it's a glob pattern (contains ** or *), check for matching files
  if (generates.includes('*')) {
    // Extract the directory part before the glob pattern
    const parts = normalizedGenerates.split(path.sep);
    const dirParts: string[] = [];
    let patternPart = '';
    for (const part of parts) {
      if (part.includes('*')) {
        patternPart = part;
        break;
      }
      dirParts.push(part);
    }
    const dirPath = path.join(changeDir, ...dirParts);

    // Check if directory exists
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return false;
    }

    // Extract expected extension from pattern (e.g., "*.md" -> ".md")
    const extMatch = patternPart.match(/\*(\.[a-zA-Z0-9]+)$/);
    const expectedExt = extMatch ? extMatch[1] : null;

    // Recursively check for matching files
    const hasMatchingFiles = (dir: string): boolean => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // For ** patterns, recurse into subdirectories
            if (generates.includes('**') && hasMatchingFiles(path.join(dir, entry.name))) {
              return true;
            }
          } else if (entry.isFile()) {
            // Check if file matches expected extension (or any file if no extension specified)
            if (!expectedExt || entry.name.endsWith(expectedExt)) {
              return true;
            }
          }
        }
      } catch {
        return false;
      }
      return false;
    };

    return hasMatchingFiles(dirPath);
  }

  return fs.existsSync(fullPath);
}

/**
 * Generates apply instructions for implementing tasks from a change.
 * Schema-aware: reads apply phase configuration from schema to determine
 * required artifacts, tracking file, and instruction.
 */
async function generateApplyInstructions(
  projectRoot: string,
  changeName: string,
  schemaName?: string
): Promise<ApplyInstructions> {
  // loadChangeContext will auto-detect schema from metadata if not provided
  const context = loadChangeContext(projectRoot, changeName, schemaName);
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);

  // Get the full schema to access the apply phase configuration
  const schema = resolveSchema(context.schemaName);
  const applyConfig = schema.apply;

  // Determine required artifacts and tracking file from schema
  // Fallback: if no apply block, require all artifacts
  const requiredArtifactIds = applyConfig?.requires ?? schema.artifacts.map((a) => a.id);
  const tracksFile = applyConfig?.tracks ?? null;
  const schemaInstruction = applyConfig?.instruction ?? null;

  // Check which required artifacts are missing
  const missingArtifacts: string[] = [];
  for (const artifactId of requiredArtifactIds) {
    const artifact = schema.artifacts.find((a) => a.id === artifactId);
    if (artifact && !artifactOutputExists(changeDir, artifact.generates)) {
      missingArtifacts.push(artifactId);
    }
  }

  // Build context files from all existing artifacts in schema
  const contextFiles: Record<string, string> = {};
  for (const artifact of schema.artifacts) {
    if (artifactOutputExists(changeDir, artifact.generates)) {
      contextFiles[artifact.id] = path.join(changeDir, artifact.generates);
    }
  }

  // Parse tasks if tracking file exists
  let tasks: TaskItem[] = [];
  let tracksFileExists = false;
  if (tracksFile) {
    const tracksPath = path.join(changeDir, tracksFile);
    tracksFileExists = fs.existsSync(tracksPath);
    if (tracksFileExists) {
      const tasksContent = await fs.promises.readFile(tracksPath, 'utf-8');
      tasks = parseTasksFile(tasksContent);
    }
  }

  // Calculate progress
  const total = tasks.length;
  const complete = tasks.filter((t) => t.done).length;
  const remaining = total - complete;

  // Determine state and instruction
  let state: ApplyInstructions['state'];
  let instruction: string;

  if (missingArtifacts.length > 0) {
    state = 'blocked';
    instruction = `Cannot apply this change yet. Missing artifacts: ${missingArtifacts.join(', ')}.\nUse the openspec-continue-change skill to create the missing artifacts first.`;
  } else if (tracksFile && !tracksFileExists) {
    // Tracking file configured but doesn't exist yet
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction = `The ${tracksFilename} file is missing and must be created.\nUse openspec-continue-change to generate the tracking file.`;
  } else if (tracksFile && tracksFileExists && total === 0) {
    // Tracking file exists but contains no tasks
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction = `The ${tracksFilename} file exists but contains no tasks.\nAdd tasks to ${tracksFilename} or regenerate it with openspec-continue-change.`;
  } else if (tracksFile && remaining === 0 && total > 0) {
    state = 'all_done';
    instruction = 'All tasks are complete! This change is ready to be archived.\nConsider running tests and reviewing the changes before archiving.';
  } else if (!tracksFile) {
    // No tracking file (e.g., TDD schema) - ready to apply
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'All required artifacts complete. Proceed with implementation.';
  } else {
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'Read context files, work through pending tasks, mark complete as you go.\nPause if you hit blockers or need clarification.';
  }

  return {
    changeName,
    changeDir,
    schemaName: context.schemaName,
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
      validateSchemaExists(options.schema, projectRoot);
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
  const { changeName, schemaName, contextFiles, progress, tasks, state, missingArtifacts, instruction } = instructions;

  console.log(`## Apply: ${changeName}`);
  console.log(`Schema: ${schemaName}`);
  console.log();

  // Warning for blocked state
  if (state === 'blocked' && missingArtifacts) {
    console.log('### ⚠️ Blocked');
    console.log();
    console.log(`Missing artifacts: ${missingArtifacts.join(', ')}`);
    console.log('Use the openspec-continue-change skill to create these first.');
    console.log();
  }

  // Context files (dynamically from schema)
  const contextFileEntries = Object.entries(contextFiles);
  if (contextFileEntries.length > 0) {
    console.log('### Context Files');
    for (const [artifactId, filePath] of contextFileEntries) {
      console.log(`- ${artifactId}: ${filePath}`);
    }
    console.log();
  }

  // Progress (only show if we have tracking)
  if (progress.total > 0 || tasks.length > 0) {
    console.log('### Progress');
    if (state === 'all_done') {
      console.log(`${progress.complete}/${progress.total} complete ✓`);
    } else {
      console.log(`${progress.complete}/${progress.total} complete`);
    }
    console.log();
  }

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
  source: 'project' | 'user' | 'package';
}

async function templatesCommand(options: TemplatesOptions): Promise<void> {
  const spinner = ora('Loading templates...').start();

  try {
    const projectRoot = process.cwd();
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA, projectRoot);
    const schema = resolveSchema(schemaName, projectRoot);
    const graph = ArtifactGraph.fromSchema(schema);
    const schemaDir = getSchemaDir(schemaName, projectRoot)!;

    // Determine the source (project, user, or package)
    const {
      getUserSchemasDir,
      getProjectSchemasDir,
    } = await import('../core/artifact-graph/resolver.js');
    const projectSchemasDir = getProjectSchemasDir(projectRoot);
    const userSchemasDir = getUserSchemasDir();

    let source: 'project' | 'user' | 'package';
    if (schemaDir.startsWith(projectSchemasDir)) {
      source = 'project';
    } else if (schemaDir.startsWith(userSchemasDir)) {
      source = 'user';
    } else {
      source = 'package';
    }

    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => ({
      artifactId: artifact.id,
      templatePath: path.join(schemaDir, 'templates', artifact.template),
      source,
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
    console.log(`Source: ${source}`);
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

  const projectRoot = process.cwd();

  // Validate schema if provided
  if (options.schema) {
    validateSchemaExists(options.schema, projectRoot);
  }

  const schemaDisplay = options.schema ? ` with schema '${options.schema}'` : '';
  const spinner = ora(`Creating change '${name}'${schemaDisplay}...`).start();

  try {
    const result = await createChange(projectRoot, name, { schema: options.schema });

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const changeDir = path.join(projectRoot, 'openspec', 'changes', name);
      const readmePath = path.join(changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    spinner.succeed(`Created change '${name}' at openspec/changes/${name}/ (schema: ${result.schema})`);
  } catch (error) {
    spinner.fail(`Failed to create change '${name}'`);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Artifact Experimental Setup Command
// -----------------------------------------------------------------------------

interface ArtifactExperimentalSetupOptions {
  tool?: string;
  interactive?: boolean;
  selectedTools?: string[];  // For multi-select from interactive prompt
}

/**
 * Names of experimental skill directories created by openspec experimental.
 */
const EXPERIMENTAL_SKILL_NAMES = [
  'openspec-explore',
  'openspec-new-change',
  'openspec-continue-change',
  'openspec-apply-change',
  'openspec-ff-change',
  'openspec-sync-specs',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-verify-change',
];

/**
 * Status of experimental skill configuration for a tool.
 */
interface ToolExperimentalStatus {
  /** Whether the tool has any experimental skills configured */
  configured: boolean;
  /** Whether all 9 experimental skills are configured */
  fullyConfigured: boolean;
  /** Number of skills currently configured (0-9) */
  skillCount: number;
}

/**
 * Checks which experimental skill files exist for a tool.
 */
function getToolExperimentalStatus(projectRoot: string, toolId: string): ToolExperimentalStatus {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) {
    return { configured: false, fullyConfigured: false, skillCount: 0 };
  }

  const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');
  let skillCount = 0;

  for (const skillName of EXPERIMENTAL_SKILL_NAMES) {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      skillCount++;
    }
  }

  return {
    configured: skillCount > 0,
    fullyConfigured: skillCount === EXPERIMENTAL_SKILL_NAMES.length,
    skillCount,
  };
}

/**
 * Gets the experimental status for all tools with skillsDir configured.
 */
function getExperimentalToolStates(projectRoot: string): Map<string, ToolExperimentalStatus> {
  const states = new Map<string, ToolExperimentalStatus>();
  const toolIds = AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);

  for (const toolId of toolIds) {
    states.set(toolId, getToolExperimentalStatus(projectRoot, toolId));
  }

  return states;
}

/**
 * Gets the list of tools with skillsDir configured.
 */
function getToolsWithSkillsDir(): string[] {
  return AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);
}

/**
 * Generates Agent Skills and slash commands for the experimental artifact workflow.
 * Creates <toolDir>/skills/ directory with SKILL.md files following Agent Skills spec.
 * Creates slash commands using tool-specific adapters.
 */
async function artifactExperimentalSetupCommand(options: ArtifactExperimentalSetupOptions): Promise<void> {
  const projectRoot = process.cwd();

  // Validate --tool flag is provided or prompt interactively
  if (!options.tool) {
    const validTools = getToolsWithSkillsDir();
    const canPrompt = isInteractive(options);

    if (canPrompt && validTools.length > 0) {
      // Show animated welcome screen before tool selection
      const { showWelcomeScreen } = await import('../ui/welcome-screen.js');
      await showWelcomeScreen();

      const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

      // Get experimental status for all tools to show configured indicators
      const toolStates = getExperimentalToolStates(projectRoot);

      // Build choices with configured status and sort configured tools first
      const sortedChoices = validTools
        .map((toolId) => {
          const tool = AI_TOOLS.find((t) => t.value === toolId);
          const status = toolStates.get(toolId);
          const configured = status?.configured ?? false;

          return {
            name: tool?.name || toolId,
            value: toolId,
            configured,
            preSelected: configured,  // Pre-select configured tools for easy refresh
          };
        })
        .sort((a, b) => {
          // Configured tools first
          if (a.configured && !b.configured) return -1;
          if (!a.configured && b.configured) return 1;
          return 0;
        });

      const selectedTools = await searchableMultiSelect({
        message: `Select tools to set up (${validTools.length} available)`,
        pageSize: 15,
        choices: sortedChoices,
        validate: (selected: string[]) => selected.length > 0 || 'Select at least one tool',
      });

      if (selectedTools.length === 0) {
        throw new Error('At least one tool must be selected');
      }

      options.tool = selectedTools[0];
      options.selectedTools = selectedTools;
    } else {
      throw new Error(
        `Missing required option --tool. Valid tools with skill generation support:\n  ${validTools.join('\n  ')}`
      );
    }
  }

  // Determine tools to set up
  const toolsToSetup = options.selectedTools || [options.tool!];

  // Get tool states before processing to track created vs refreshed
  const preSetupStates = getExperimentalToolStates(projectRoot);

  // Validate all tools before starting
  const validatedTools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> = [];
  for (const toolId of toolsToSetup) {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool) {
      const validToolIds = AI_TOOLS.map((t) => t.value);
      throw new Error(
        `Unknown tool '${toolId}'. Valid tools:\n  ${validToolIds.join('\n  ')}`
      );
    }

    if (!tool.skillsDir) {
      const validToolsWithSkills = getToolsWithSkillsDir();
      throw new Error(
        `Tool '${toolId}' does not support skill generation (no skillsDir configured).\nTools with skill generation support:\n  ${validToolsWithSkills.join('\n  ')}`
      );
    }

    const preState = preSetupStates.get(tool.value);
    validatedTools.push({
      value: tool.value,
      name: tool.name,
      skillsDir: tool.skillsDir,
      wasConfigured: preState?.configured ?? false,
    });
  }

  // Track all created files across all tools
  const allCreatedSkillFiles: string[] = [];
  const allCreatedCommandFiles: string[] = [];
  let anyCommandsSkipped = false;
  const toolsWithSkippedCommands: string[] = [];
  const failedTools: Array<{ name: string; error: Error }> = [];

  // Get skill and command templates once (shared across all tools)
  const exploreSkill = getExploreSkillTemplate();
  const newChangeSkill = getNewChangeSkillTemplate();
  const continueChangeSkill = getContinueChangeSkillTemplate();
  const applyChangeSkill = getApplyChangeSkillTemplate();
  const ffChangeSkill = getFfChangeSkillTemplate();
  const syncSpecsSkill = getSyncSpecsSkillTemplate();
  const archiveChangeSkill = getArchiveChangeSkillTemplate();
  const bulkArchiveChangeSkill = getBulkArchiveChangeSkillTemplate();
  const verifyChangeSkill = getVerifyChangeSkillTemplate();

  const skillTemplates = [
    { template: exploreSkill, dirName: 'openspec-explore' },
    { template: newChangeSkill, dirName: 'openspec-new-change' },
    { template: continueChangeSkill, dirName: 'openspec-continue-change' },
    { template: applyChangeSkill, dirName: 'openspec-apply-change' },
    { template: ffChangeSkill, dirName: 'openspec-ff-change' },
    { template: syncSpecsSkill, dirName: 'openspec-sync-specs' },
    { template: archiveChangeSkill, dirName: 'openspec-archive-change' },
    { template: bulkArchiveChangeSkill, dirName: 'openspec-bulk-archive-change' },
    { template: verifyChangeSkill, dirName: 'openspec-verify-change' },
  ];

  const commandTemplates = [
    { template: getOpsxExploreCommandTemplate(), id: 'explore' },
    { template: getOpsxNewCommandTemplate(), id: 'new' },
    { template: getOpsxContinueCommandTemplate(), id: 'continue' },
    { template: getOpsxApplyCommandTemplate(), id: 'apply' },
    { template: getOpsxFfCommandTemplate(), id: 'ff' },
    { template: getOpsxSyncCommandTemplate(), id: 'sync' },
    { template: getOpsxArchiveCommandTemplate(), id: 'archive' },
    { template: getOpsxBulkArchiveCommandTemplate(), id: 'bulk-archive' },
    { template: getOpsxVerifyCommandTemplate(), id: 'verify' },
  ];

  const commandContents: CommandContent[] = commandTemplates.map(({ template, id }) => ({
    id,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: template.tags,
    body: template.content,
  }));

  // Process each tool
  for (const tool of validatedTools) {
    const spinner = ora(`Setting up experimental artifact workflow for ${tool.name}...`).start();

    try {
      // Use tool-specific skillsDir
      const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');

      // Create skill directories and SKILL.md files
      for (const { template, dirName } of skillTemplates) {
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
        allCreatedSkillFiles.push(path.relative(projectRoot, skillFile));
      }

      // Generate commands using the adapter system
      const adapter = CommandAdapterRegistry.get(tool.value);
      if (adapter) {
        const generatedCommands = generateCommands(commandContents, adapter);

        for (const cmd of generatedCommands) {
          const commandFile = path.join(projectRoot, cmd.path);
          await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
          allCreatedCommandFiles.push(cmd.path);
        }
      } else {
        anyCommandsSkipped = true;
        toolsWithSkippedCommands.push(tool.value);
      }

      spinner.succeed(`Setup complete for ${tool.name}!`);
    } catch (error) {
      spinner.fail(`Failed for ${tool.name}`);
      failedTools.push({ name: tool.name, error: error as Error });
    }
  }

  // If all tools failed, throw an error
  if (failedTools.length === validatedTools.length) {
    const errorMessages = failedTools.map(f => `  ${f.name}: ${f.error.message}`).join('\n');
    throw new Error(`All tools failed to set up:\n${errorMessages}`);
  }

  // Filter to only successfully configured tools
  const successfulTools = validatedTools.filter(t => !failedTools.some(f => f.name === t.name));

  // Print success summary
  console.log();
  console.log(chalk.bold('Experimental Artifact Workflow Setup Complete'));
  console.log();

  // Tools and counts (show unique counts, not total files across all tools)
  if (successfulTools.length > 0) {
    // Separate newly created tools from refreshed (previously configured) tools
    const createdTools = successfulTools.filter(t => !t.wasConfigured);
    const refreshedTools = successfulTools.filter(t => t.wasConfigured);

    if (createdTools.length > 0) {
      console.log(`Created: ${createdTools.map(t => t.name).join(', ')}`);
    }
    if (refreshedTools.length > 0) {
      console.log(`Refreshed: ${refreshedTools.map(t => t.name).join(', ')}`);
    }

    const uniqueSkillCount = skillTemplates.length;
    const uniqueCommandCount = commandContents.length;
    const toolDirs = [...new Set(successfulTools.map(t => t.skillsDir))].join(', ');
    // Only count commands if any were actually created (some tools may not have adapters)
    const hasCommands = allCreatedCommandFiles.length > 0;
    if (hasCommands) {
      console.log(`${uniqueSkillCount} skills and ${uniqueCommandCount} commands in ${toolDirs}/`);
    } else {
      console.log(`${uniqueSkillCount} skills in ${toolDirs}/`);
    }
  }

  if (failedTools.length > 0) {
    console.log(chalk.red(`Failed: ${failedTools.map(f => `${f.name} (${f.error.message})`).join(', ')}`));
  }

  if (anyCommandsSkipped) {
    console.log(chalk.dim(`Commands skipped for: ${toolsWithSkippedCommands.join(', ')} (no adapter)`));
  }

  // Config creation (simplified)
  const configPath = path.join(projectRoot, 'openspec', 'config.yaml');
  const configYmlPath = path.join(projectRoot, 'openspec', 'config.yml');
  const configExists = fs.existsSync(configPath) || fs.existsSync(configYmlPath);

  if (configExists) {
    console.log(`Config: openspec/config.yaml (exists)`);
  } else if (!isInteractive(options)) {
    console.log(chalk.dim(`Config: skipped (non-interactive mode)`));
  } else {
    const yamlContent = serializeConfig({ schema: DEFAULT_SCHEMA });
    try {
      await FileSystemUtils.writeFile(configPath, yamlContent);
      console.log(`Config: openspec/config.yaml (schema: ${DEFAULT_SCHEMA})`);
    } catch (writeError) {
      console.log(chalk.red(`Config: failed to create (${(writeError as Error).message})`));
    }
  }

  // Getting started
  console.log();
  console.log(chalk.bold('Getting started:'));
  console.log('  /opsx:new       Start a new change');
  console.log('  /opsx:continue  Create the next artifact');
  console.log('  /opsx:apply     Implement tasks');

  // Links
  console.log();
  console.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/blob/main/docs/experimental-workflow.md')}`);
  console.log(`Feedback:   ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/issues')}`);
  console.log();
}

// -----------------------------------------------------------------------------
// Schemas Command
// -----------------------------------------------------------------------------

interface SchemasOptions {
  json?: boolean;
}

async function schemasCommand(options: SchemasOptions): Promise<void> {
  const projectRoot = process.cwd();
  const schemas = listSchemasWithInfo(projectRoot);

  if (options.json) {
    console.log(JSON.stringify(schemas, null, 2));
    return;
  }

  console.log('Available schemas:');
  console.log();

  for (const schema of schemas) {
    let sourceLabel = '';
    if (schema.source === 'project') {
      sourceLabel = chalk.cyan(' (project)');
    } else if (schema.source === 'user') {
      sourceLabel = chalk.dim(' (user override)');
    }
    console.log(`  ${chalk.bold(schema.name)}${sourceLabel}`);
    console.log(`    ${schema.description}`);
    console.log(`    Artifacts: ${schema.artifacts.join(' → ')}`);
    console.log();
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
    .command('experimental')
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
