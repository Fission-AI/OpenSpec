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
import {
  validateChangeExists,
  validateSchemaExists,
  type TaskItem,
  type ApplyInstructions,
} from './shared.js';
import { buildTaskGroups, enrichGroupsWithDomains, resolveOrchestration } from '../../core/orchestration/index.js';
import type { OrchestrationHints } from '../../core/orchestration/types.js';
import { loadPlugins } from '../../core/plugin/loader.js';
import { readProjectConfig } from '../../core/project-config.js';
import { extractCapabilities, extractRequirements } from '../../core/covers/extractor.js';
import { injectDesignCovers, injectTasksCovers } from '../../core/covers/injector.js';

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
  orchestrationMode?: 'subagents' | 'teams' | 'sequential';
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
    const projectRoot = process.cwd();
    const changeName = await validateChangeExists(options.change, projectRoot);

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema);

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

    // Covers auto-injection: enrich template with traceability annotations
    const changeDir = context.changeDir;
    if (artifactId === 'design') {
      const proposalPath = path.join(changeDir, 'proposal.md');
      if (fs.existsSync(proposalPath)) {
        const proposalContent = fs.readFileSync(proposalPath, 'utf-8');
        const capabilities = extractCapabilities(proposalContent);
        if (capabilities.length > 0) {
          instructions.template = injectDesignCovers(instructions.template, capabilities);
        }
      }
    } else if (artifactId === 'tasks') {
      const specsDir = path.join(changeDir, 'specs');
      if (fs.existsSync(specsDir)) {
        const requirements = extractRequirements(specsDir);
        if (requirements.length > 0) {
          instructions.template = injectTasksCovers(instructions.template, requirements);
        }
      }
    }

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

/**
 * Parses tasks.md content and extracts task items with their completion status.
 */
function parseTasksFile(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n');
  let taskIndex = 0;

  for (const line of lines) {
    // Match checkbox patterns: - [ ] or - [x] or - [X]
    const checkboxMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)\s*$/);
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
 * Schema-aware: reads apply phase configuration from schema to determine
 * required artifacts, tracking file, and instruction.
 */
export async function generateApplyInstructions(
  projectRoot: string,
  changeName: string,
  schemaName?: string,
  orchestrationMode?: 'subagents' | 'teams' | 'sequential'
): Promise<ApplyInstructions> {
  // loadChangeContext will auto-detect schema from metadata if not provided
  const context = loadChangeContext(projectRoot, changeName, schemaName);
  const changeDir = context.changeDir;

  // Get the full schema to access the apply phase configuration
  const schema = resolveSchema(context.schemaName, projectRoot);
  const applyConfig = schema.apply;

  // Extract gates and steps from schema apply config
  const gates = applyConfig?.gates ?? undefined;
  const steps = applyConfig?.steps ?? undefined;

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

  // Build orchestration hints
  let orchestration: OrchestrationHints | undefined;
  if (tracksFile && tracksFileExists) {
    const tasksContent = await fs.promises.readFile(path.join(changeDir, tracksFile), 'utf-8');
    const taskGroups = buildTaskGroups(tasksContent);
    enrichGroupsWithDomains(taskGroups, tasksContent);

    // Load plugins for gate/hook orchestration resolution
    let plugins: import('../../core/plugin/types.js').LoadedPlugin[] = [];
    try {
      const config = readProjectConfig(projectRoot);
      if (config?.plugins && config.plugins.length > 0) {
        plugins = loadPlugins(projectRoot, config.plugins);
      }
    } catch {
      // Continue without plugins
    }

    // Resolve gate orchestration from plugins + schema
    const schemaOrch = applyConfig?.orchestration;
    const resolvedGates = resolveOrchestration(
      plugins,
      schemaOrch?.parallel_groups,
      'gates'
    );
    const resolvedHooks = resolveOrchestration(
      plugins,
      undefined,
      'hooks'
    );

    const allWarnings = [...resolvedGates.warnings, ...resolvedHooks.warnings];

    // Read schema default_mode
    const schemaDefaultMode = applyConfig?.orchestration?.default_mode ?? null;

    // Priority: user flag > schema default > null
    const mode = orchestrationMode ?? schemaDefaultMode;
    const modeFrom = orchestrationMode
      ? 'user_flag' as const
      : schemaDefaultMode
        ? 'schema' as const
        : 'default' as const;
    const groupsFrom = schemaOrch?.parallel_groups
      ? 'schema' as const
      : resolvedGates.groups.length > 0
        ? 'plugin' as const
        : 'default' as const;

    orchestration = {
      mode,
      source: { mode_from: modeFrom, groups_from: groupsFrom },
      task_groups: taskGroups,
      gate_groups: resolvedGates.groups.length > 0
        ? [{ phase: 'post' as const, groups: resolvedGates.groups }]
        : [],
      hook_groups: resolvedHooks.groups.length > 0
        ? [{ hook_point: 'apply.post', groups: resolvedHooks.groups }]
        : [],
      warnings: allWarnings,
    };
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
    gates,
    steps,
    orchestration,
  };
}

export async function applyInstructionsCommand(options: ApplyInstructionsOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Generating apply instructions...').start();

  try {
    const projectRoot = process.cwd();
    const changeName = await validateChangeExists(options.change, projectRoot);

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // generateApplyInstructions uses loadChangeContext which auto-detects schema
    const instructions = await generateApplyInstructions(
      projectRoot,
      changeName,
      options.schema,
      options.orchestrationMode
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

  // Gates
  if (instructions.gates) {
    if (instructions.gates.pre?.length) {
      console.log('### Pre Gates (before coding)');
      for (const gate of instructions.gates.pre) {
        console.log(`- [${gate.severity}] ${gate.id}: ${gate.check}`);
      }
      console.log();
    }
    if (instructions.gates.post?.length) {
      console.log('### Post Gates (after coding)');
      for (const gate of instructions.gates.post) {
        const extra = gate.retry ? ` (retry: ${gate.retry})` : '';
        console.log(`- [${gate.severity}] ${gate.id}: ${gate.check}${extra}`);
      }
      console.log();
    }
  }

  // Steps
  if (instructions.steps?.length) {
    console.log('### Steps');
    for (const step of instructions.steps) {
      const method = step.method ? ` [${step.method}]` : '';
      console.log(`- ${step.id}${method}`);
    }
    console.log();
  }

  // Instruction
  console.log('### Instruction');
  console.log(instruction);
}
