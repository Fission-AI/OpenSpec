/**
 * Instructions Command
 *
 * Generates enriched instructions for creating artifacts or applying tasks.
 * Includes both artifact instructions and apply instructions.
 */

import ora from 'ora';
import path from 'path';
import * as fs from 'fs';
import {
  loadChangeContext,
  generateInstructions,
  resolveSchema,
  resolveArtifactOutputs,
  type ArtifactInstructions,
} from '../../core/artifact-graph/index.js';
import { getChangeDir, resolveCurrentPlanningHomeSync } from '../../core/planning-home.js';
import { buildActionContext } from '../../core/change-status-policy.js';
import {
  validateChangeExists,
  validateSchemaExists,
  type TaskItem,
  type ApplyInstructions,
} from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InstructionsOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

export interface ApplyInstructionsOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

// -----------------------------------------------------------------------------
// Artifact Instructions Command
// -----------------------------------------------------------------------------

export async function instructionsCommand(
  artifactId: string | undefined,
  options: InstructionsOptions
): Promise<void> {
  const spinner = options.json ? undefined : ora('Generating instructions...').start();

  try {
    const planningHome = resolveCurrentPlanningHomeSync();
    const projectRoot = planningHome.root;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      planningHome.changesDir
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema, {
      changeDir: getChangeDir(planningHome, changeName),
      planningHome,
    });

    if (!artifactId) {
      spinner?.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Missing required argument <artifact>. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const artifact = context.graph.getArtifact(artifactId);

    if (!artifact) {
      spinner?.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Artifact '${artifactId}' not found in schema '${context.schemaName}'. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const instructions = generateInstructions(context, artifactId, projectRoot);
    const isBlocked = instructions.dependencies.some((d) => !d.done);

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify(instructions, null, 2));
      return;
    }

    printInstructionsText(instructions, isBlocked);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printInstructionsText(instructions: ArtifactInstructions, isBlocked: boolean): void {
  const {
    artifactId,
    changeName,
    schemaName,
    changeDir,
    initiative,
    resolvedOutputPath,
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

  if (initiative) {
    console.log(`<initiative store="${initiative.store}" id="${initiative.id}" />`);
    console.log();
  }

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
  console.log(`Write to: ${resolvedOutputPath}`);
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

/**
 * Parses tasks.md content and extracts task items with their completion status.
 *
 * When a line begins with a `N` or `N.N(.N)*` token (e.g. `1`, `2.3`, `1.10.4`),
 * that token is captured as `numericId` and the leading whitespace/punctuation
 * after it is stripped from `description`. Lines without such a token still
 * parse, and only get a positional `id`. The positional `id` is always set so
 * existing callers keep working.
 */
function parseTasksFile(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n');
  let taskIndex = 0;

  // Capture leading task numbers like `1`, `1.1`, `1.10.4`. Followed by a
  // separator (space, dot, colon, paren, dash) to anchor against descriptions
  // that just happen to start with a digit.
  const numericIdRe = /^(\d+(?:\.\d+)*)(?:[.:)\]-]?\s+|\s+)(.*)$/;

  for (const line of lines) {
    // Match checkbox patterns: - [ ] or - [x] or - [X]
    const checkboxMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)\s*$/);
    if (checkboxMatch) {
      taskIndex++;
      const done = checkboxMatch[1].toLowerCase() === 'x';
      const rawDescription = checkboxMatch[2].trim();
      const numericMatch = rawDescription.match(numericIdRe);
      const task: TaskItem = {
        id: `${taskIndex}`,
        description: numericMatch ? numericMatch[2].trim() : rawDescription,
        done,
      };
      if (numericMatch) {
        task.numericId = numericMatch[1];
      }
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Picks the first unchecked task with a `numericId` (document order). Returns
 * `null` if no task qualifies. Mirrors what agent skills need to drive
 * `openspec agent mark-task-done` without re-parsing the list.
 */
function pickNextPendingId(tasks: TaskItem[]): string | null {
  for (const t of tasks) {
    if (!t.done && t.numericId) return t.numericId;
  }
  return null;
}

/**
 * Generates apply instructions for implementing tasks from a change.
 * Schema-aware: reads apply phase configuration from schema to determine
 * required artifacts, tracking file, and instruction.
 */
export async function generateApplyInstructions(
  projectRoot: string,
  changeName: string,
  schemaName?: string,
  planningHome = resolveCurrentPlanningHomeSync({ startPath: projectRoot })
): Promise<ApplyInstructions> {
  // loadChangeContext will auto-detect schema from metadata if not provided
  const context = loadChangeContext(projectRoot, changeName, schemaName, {
    changeDir: getChangeDir(planningHome, changeName),
    planningHome,
  });
  const changeDir = context.changeDir;

  // Get the full schema to access the apply phase configuration
  const schema = resolveSchema(context.schemaName, projectRoot);
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
    if (artifact && resolveArtifactOutputs(changeDir, artifact.generates).length === 0) {
      missingArtifacts.push(artifactId);
    }
  }

  // Build context files from all existing artifacts in schema
  const contextFiles: Record<string, string[]> = {};
  for (const artifact of schema.artifacts) {
    const outputs = resolveArtifactOutputs(changeDir, artifact.generates);
    if (outputs.length > 0) {
      contextFiles[artifact.id] = outputs;
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
    // No tracking file configured in schema - ready to apply
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'All required artifacts complete. Proceed with implementation.';
  } else {
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'Read context files, work through pending tasks, mark complete as you go.\nPause if you hit blockers or need clarification.';
  }

  // Surface the same action constraints `status --json` reports so the apply
  // flow can enforce the workspace-planning guard from this one payload.
  const actionContext = buildActionContext({
    planningHome: context.planningHome,
    projectRoot,
    artifactIds: context.graph.getAllArtifacts().map((a) => a.id),
  });

  return {
    changeName,
    changeDir,
    schemaName: context.schemaName,
    ...(context.initiative ? { initiative: context.initiative } : {}),
    contextFiles,
    progress: { total, complete, remaining },
    tasks,
    state,
    missingArtifacts: missingArtifacts.length > 0 ? missingArtifacts : undefined,
    instruction,
    actionContext,
    nextPendingId: pickNextPendingId(tasks),
  };
}

export async function applyInstructionsCommand(options: ApplyInstructionsOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Generating apply instructions...').start();

  try {
    const planningHome = resolveCurrentPlanningHomeSync();
    const projectRoot = planningHome.root;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      planningHome.changesDir
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // generateApplyInstructions uses loadChangeContext which auto-detects schema
    const instructions = await generateApplyInstructions(
      projectRoot,
      changeName,
      options.schema,
      planningHome
    );

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify(instructions, null, 2));
      return;
    }

    printApplyInstructionsText(instructions);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printApplyInstructionsText(instructions: ApplyInstructions): void {
  const { changeName, schemaName, initiative, contextFiles, progress, tasks, state, missingArtifacts, instruction } = instructions;

  console.log(`## Apply: ${changeName}`);
  console.log(`Schema: ${schemaName}`);
  if (initiative) {
    console.log(`Initiative: ${initiative.store}/${initiative.id}`);
  }
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
    for (const [artifactId, filePaths] of contextFileEntries) {
      for (const filePath of filePaths) {
        console.log(`- ${artifactId}: ${filePath}`);
      }
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
