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
  resolveArtifactOutputPath,
  resolveArtifactOutputs,
  type ArtifactInstructions,
} from '../../core/artifact-graph/index.js';
import { isSpecsArtifactPath } from '../../core/artifact-graph/outputs.js';
import {
  getChangeDir,
  resolveCurrentPlanningHomeSync,
  type PlanningHome,
} from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  withStoreFlag,
  toPlanningHome,
  toRootOutput,
  type ResolvedOpenSpecRoot,
} from '../../core/root-selection.js';
import {
  assembleReferenceIndex,
  renderReferencedStoresBlock,
  renderReferencedStoresSection,
  type ReferenceIndexEntry,
} from '../../core/references.js';
import { readRegistrySnapshot } from '../../core/store/registry.js';
import {
  loadOperationInputs,
  readProjectConfig,
  type ProjectConfig,
} from '../../core/project-config.js';
import {
  validateChangeExists,
  validateSchemaExists,
  type TaskItem,
  type ApplyInstructions,
  type ArchiveInstructions,
} from './shared.js';
import { parseTaskLines, type ParsedTask } from '../../utils/task-progress.js';
import { METADATA_FILENAME } from '../../utils/change-metadata.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InstructionsOptions {
  change?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

export interface ApplyInstructionsOptions {
  change?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

export type ArchiveInstructionsOptions = ApplyInstructionsOptions;

// -----------------------------------------------------------------------------
// Artifact Instructions Command
// -----------------------------------------------------------------------------

/**
 * Reads the resolved root's config once, assembles the referenced-store
 * index when references are declared, and resolves the config path for
 * fix text. Shared by both instruction surfaces.
 */
async function loadRootConfigContext(root: ResolvedOpenSpecRoot): Promise<{
  projectConfig: ProjectConfig | null;
  references: ReferenceIndexEntry[] | undefined;
}> {
  // readProjectConfig never throws: missing/unparseable configs are null.
  const projectConfig = readProjectConfig(root.path);

  // One registry read serves every relationship consumer in this
  // output so it never carries a torn snapshot.
  const snapshot = await readRegistrySnapshot();
  const registryEntries = snapshot.entries;

  const declared = projectConfig?.references ?? [];
  const index =
    declared.length > 0
      ? await assembleReferenceIndex({ references: declared, resolvedRoot: root, registryEntries })
      : [];

  // Omitted, not empty: an index emptied by self-reference omission must
  // look identical to an undeclared one in JSON.
  return {
    projectConfig,
    references: index.length > 0 ? index : undefined,
  };
}

export async function instructionsCommand(
  artifactId: string | undefined,
  options: InstructionsOptions
): Promise<void> {
  // Resolve (and banner) before the spinner starts so stderr stays readable.
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('Generating instructions...').start();

  try {
    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      root.changesDir,
      { newChangeHint: withStoreFlag(root, 'openspec new change <name>') }
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const { projectConfig, references } = await loadRootConfigContext(root);

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema, {
      changeDir: getChangeDir(planningHome, changeName),
      planningHome,
      projectConfig,
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

    const instructions = generateInstructions(context, artifactId, projectRoot, {
      projectConfig,
      references,
    });
    const isBlocked = instructions.dependencies.some((d) => !d.done);

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...instructions, root: toRootOutput(root) }, null, 2));
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

  // Artifacts skipped via skip_specs get no creation directive: emitting the
  // task/template anyway would prompt an agent to write spec files that
  // validate then rejects as conflicting with the marker.
  if (instructions.skipped) {
    console.log('<warning>');
    console.log(instructions.warning ?? 'This artifact is skipped (skip_specs is set in .openspec.yaml).');
    console.log('</warning>');
    console.log();
    console.log('</artifact>');
    return;
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

  // Referenced-store index (read-only upstream context)
  if (instructions.references && instructions.references.length > 0) {
    console.log(renderReferencedStoresBlock(instructions.references));
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
    console.log('Read the current contents of these files before creating this artifact (re-read them from disk even if you saw them earlier - they may have been edited):');
    console.log();
    for (const dep of dependencies) {
      // A dependency satisfied via skip_specs has no files by design: telling
      // the agent to read them (or calling them "done") would send it hunting
      // for spec files that must not exist.
      if (dep.skipped) {
        console.log(`<dependency id="${dep.id}" status="skipped">`);
        console.log(`  <description>Skipped: the change declares skip_specs, so this artifact has no files to read.</description>`);
        console.log('</dependency>');
        continue;
      }
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
 * Turns parsed task lines into the listed task items.
 *
 * A checkbox with no text after it is left out of the list: this is work for an
 * agent to act on and tick off, and a bare `- [ ]` gives it nothing to match.
 * It still counts toward progress, which is taken from every parsed line, so
 * this list can be shorter than the totals beside it but never disagrees with
 * `openspec list` or archive about how much work is left. An empty list is also
 * what puts apply in its "nothing to work on" state, so a file of nothing but
 * text-less checkboxes asks to be rewritten instead of being called done.
 */
function toTaskItems(parsed: ParsedTask[]): TaskItem[] {
  const tasks: TaskItem[] = [];

  for (const task of parsed) {
    if (task.description.length === 0) continue;
    tasks.push({
      id: `${tasks.length + 1}`,
      description: task.description,
      done: task.done,
    });
  }

  return tasks;
}

/**
 * The command that builds one artifact.
 *
 * Every earlier remedy here named the `openspec-continue-change` skill, which
 * the `core` profile never installs - the advice was a dead end for the default
 * install. The CLI verb exists on every profile and is what the skill runs.
 */
function describeArtifactRemedy(
  changeName: string,
  artifactId?: string,
  options: { many?: boolean } = {}
): string {
  const target = artifactId ?? '<artifact>';
  const verb = options.many ? 'Create each with' : 'Create it with';
  return (
    `${verb} \`openspec instructions ${target} --change ${changeName}\`` +
    ` (\`openspec status --change ${changeName}\` shows what is left).`
  );
}

/**
 * Finds the artifact a schema path is generated by, so a remedy can name it.
 */
function findArtifactIdFor(
  schema: { artifacts: { id: string; generates: string }[] },
  generates: string
): string | undefined {
  return schema.artifacts.find((artifact) => artifact.generates === generates)?.id;
}

/**
 * Everything still to build before apply can run, in build order.
 *
 * Apply blocks on the schema's `apply.requires` alone, so its own list stops at
 * the first hop: a change with only a proposal is told "Missing artifacts:
 * tasks" while the specs `tasks` depends on are missing too. An agent that
 * takes that literally writes the tracking file straight from the proposal and
 * skips the artifacts in between - the failure reported in #834 and #869.
 * Walking `requires` names the whole chain, the same set and order
 * `openspec status` already prints, without changing what apply blocks on.
 */
function collectMissingPrerequisites(input: {
  requiredArtifactIds: string[];
  schema: { artifacts: { id: string; requires: string[] }[] };
  buildOrder: string[];
  completed: Set<string>;
}): string[] {
  const { requiredArtifactIds, schema, buildOrder, completed } = input;
  const byId = new Map(schema.artifacts.map((artifact) => [artifact.id, artifact]));
  const missing = new Set<string>();
  const queue = [...requiredArtifactIds];
  const seen = new Set<string>(queue);

  while (queue.length > 0) {
    const id = queue.shift() as string;
    const artifact = byId.get(id);
    if (!artifact) continue;
    if (!completed.has(id)) missing.add(id);
    for (const dependency of artifact.requires) {
      if (seen.has(dependency)) continue;
      seen.add(dependency);
      queue.push(dependency);
    }
  }

  const order = new Map(buildOrder.map((id, index) => [id, index]));
  return [...missing].sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)
  );
}

/**
 * Warnings apply reports alongside its instruction.
 *
 * Apply gates on the schema's `apply.requires` only, so a change whose tasks
 * file was written ahead of its specs reads as ready even though no delta spec
 * exists - the state `openspec validate` rejects. Blocking here would be a
 * policy change; naming the gap is not, and it is what keeps apply from being
 * the one surface that green-lights a change every other surface flags.
 *
 * Only reported once apply is past its own gate: for a change that has not
 * reached tasks yet, the missing specs are the next step rather than a warning.
 * Schemas that declare no spec-producing artifact carry `skip_specs` from
 * creation, so this never fires on them.
 */
function collectApplyWarnings(input: {
  state: ApplyInstructions['state'];
  schema: { artifacts: { id: string; generates: string }[] };
  changeDir: string;
  changeName: string;
  skippedArtifacts?: Set<string>;
}): string[] {
  const { state, schema, changeDir, changeName, skippedArtifacts } = input;
  if (state === 'blocked') return [];

  const specArtifacts = schema.artifacts.filter((artifact) =>
    isSpecsArtifactPath(artifact.generates)
  );
  if (specArtifacts.length === 0) return [];
  if (specArtifacts.some((artifact) => skippedArtifacts?.has(artifact.id))) return [];
  const hasDeltas = specArtifacts.some(
    (artifact) => resolveArtifactOutputs(changeDir, artifact.generates).length > 0
  );
  if (hasDeltas) return [];

  const metadataPath = path.join(changeDir, METADATA_FILENAME);
  return [
    `This change has no delta specs and does not declare \`skip_specs: true\`, so \`openspec validate ${changeName}\` fails on it. ` +
      `Write the delta specs before implementing (\`openspec instructions specs --change ${changeName}\`), ` +
      `or add \`skip_specs: true\` to ${metadataPath} if this change really changes no specified behavior.`,
  ];
}

export interface GenerateApplyInstructionsOptions {
  planningHome?: PlanningHome;
  references?: ReferenceIndexEntry[];
  projectConfig?: ProjectConfig | null;
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
  options: GenerateApplyInstructionsOptions = {}
): Promise<ApplyInstructions> {
  const planningHome =
    options.planningHome ?? resolveCurrentPlanningHomeSync({ startPath: projectRoot });
  const references = options.references;
  // loadChangeContext will auto-detect schema from metadata if not provided
  const context = loadChangeContext(projectRoot, changeName, schemaName, {
    changeDir: getChangeDir(planningHome, changeName),
    planningHome,
    projectConfig: options.projectConfig,
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
  const operationInputs = loadOperationInputs(options.projectConfig ?? null, 'apply');

  // Check which required artifacts are missing. Artifacts the change skips
  // via skip_specs count as present - their files must not exist, and
  // status already reports them complete, so apply cannot block on them.
  const missingArtifacts: string[] = [];
  for (const artifactId of requiredArtifactIds) {
    if (context.skippedArtifacts?.has(artifactId)) {
      continue;
    }
    const artifact = schema.artifacts.find((a) => a.id === artifactId);
    if (artifact && resolveArtifactOutputs(changeDir, artifact.generates).length === 0) {
      missingArtifacts.push(artifactId);
    }
  }

  // Everything still to build, not just the first hop apply blocks on.
  const missingPrerequisites = collectMissingPrerequisites({
    requiredArtifactIds: [...requiredArtifactIds],
    schema,
    buildOrder: context.graph.getBuildOrder(),
    completed: context.completed,
  });

  // Build context files from all existing artifacts in schema
  const contextFiles: Record<string, string[]> = {};
  for (const artifact of schema.artifacts) {
    const outputs = resolveArtifactOutputs(changeDir, artifact.generates);
    if (outputs.length > 0) {
      contextFiles[artifact.id] = outputs;
    }
  }

  // Parse tasks if tracking file exists
  let parsedTasks: ParsedTask[] = [];
  let tracksFileExists = false;
  if (tracksFile) {
    const tracksPath = resolveArtifactOutputPath(changeDir, tracksFile);
    tracksFileExists = fs.existsSync(tracksPath);
    if (tracksFileExists) {
      const tasksContent = await fs.promises.readFile(tracksPath, 'utf-8');
      parsedTasks = parseTaskLines(tasksContent);
    }
  }
  const tasks = toTaskItems(parsedTasks);

  // Calculate progress over every checkbox in the file, listed or not, so these
  // numbers match `openspec list` and archive's incomplete-task check.
  const total = parsedTasks.length;
  const complete = parsedTasks.filter((task) => task.done).length;
  const remaining = total - complete;

  // Determine state and instruction
  let state: ApplyInstructions['state'];
  let instruction: string;

  if (missingArtifacts.length > 0) {
    state = 'blocked';
    const chain =
      missingPrerequisites.length > missingArtifacts.length
        ? `\nNot created yet, in build order: ${missingPrerequisites.join(', ')}.` +
          ` Build the ones this change needs before applying - the schema says which are conditional.`
        : '';
    instruction =
      `Cannot apply this change yet. Missing artifacts: ${missingArtifacts.join(', ')}.${chain}` +
      `\n${describeArtifactRemedy(
        changeName,
        // Only name one when one is left: the first of several would be the
        // schema's conditional artifact as often as not.
        missingPrerequisites.length === 1 ? missingPrerequisites[0] : undefined,
        { many: missingPrerequisites.length > 1 }
      )}`;
  } else if (tracksFile && !tracksFileExists) {
    // Tracking file configured but doesn't exist yet
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction =
      `The ${tracksFilename} file is missing and must be created.` +
      `\n${describeArtifactRemedy(changeName, findArtifactIdFor(schema, tracksFile))}`;
  } else if (tracksFile && tracksFileExists && tasks.length === 0) {
    // Tracking file exists but lists nothing an agent can work on: either no
    // checkboxes at all, or only checkboxes with no text after them.
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction =
      `The ${tracksFilename} file exists but contains no tasks to work on.` +
      `\nAdd tasks to ${tracksFilename}, or rebuild it: ${describeArtifactRemedy(changeName, findArtifactIdFor(schema, tracksFile))}`;
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

  const warnings = collectApplyWarnings({
    state,
    schema,
    changeDir,
    changeName,
    skippedArtifacts: context.skippedArtifacts,
  });

  return {
    changeName,
    changeDir,
    schemaName: context.schemaName,
    contextFiles,
    progress: { total, complete, remaining },
    tasks,
    state,
    missingArtifacts: missingArtifacts.length > 0 ? missingArtifacts : undefined,
    ...(missingPrerequisites.length > 0 ? { missingPrerequisites } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    instruction,
    ...(references !== undefined ? { references } : {}),
    ...operationInputs,
  };
}

export async function applyInstructionsCommand(options: ApplyInstructionsOptions): Promise<void> {
  // Resolve (and banner) before the spinner starts so stderr stays readable.
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('Generating apply instructions...').start();

  try {
    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      root.changesDir,
      { newChangeHint: withStoreFlag(root, 'openspec new change <name>') }
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // One parsed config snapshot supplies schema fallback, references, context,
    // and operation guidance for this command.
    const { projectConfig, references } = await loadRootConfigContext(root);
    const instructions = await generateApplyInstructions(projectRoot, changeName, options.schema, {
      planningHome,
      references,
      projectConfig,
    });

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...instructions, root: toRootOutput(root) }, null, 2));
      return;
    }

    printApplyInstructionsText(instructions);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printApplyInstructionsText(instructions: ApplyInstructions): void {
  const { changeName, schemaName, contextFiles, progress, tasks, state, missingArtifacts, warnings, instruction } = instructions;

  console.log(`## Apply: ${changeName}`);
  console.log(`Schema: ${schemaName}`);
  console.log();

  if (instructions.references && instructions.references.length > 0) {
    console.log(renderReferencedStoresSection(instructions.references));
    console.log();
  }

  // Warning for blocked state
  if (state === 'blocked' && missingArtifacts) {
    console.log('### ⚠️ Blocked');
    console.log();
    console.log(`Missing artifacts: ${missingArtifacts.join(', ')}`);
    if (
      instructions.missingPrerequisites &&
      instructions.missingPrerequisites.length > missingArtifacts.length
    ) {
      console.log(
        `Not created yet, in build order: ${instructions.missingPrerequisites.join(', ')}`
      );
    }
    console.log();
  }

  if (warnings && warnings.length > 0) {
    console.log('### ⚠️ Warnings');
    console.log();
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
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
  console.log();

  printOperationInputsText(instructions);
}

export function generateArchiveInstructions(
  changeName: string,
  projectConfig: ProjectConfig | null
): ArchiveInstructions {
  return {
    changeName,
    ...loadOperationInputs(projectConfig, 'archive'),
  };
}

export async function archiveInstructionsCommand(
  options: ArchiveInstructionsOptions
): Promise<void> {
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('Loading archive inputs...').start();

  try {
    const changeName = await validateChangeExists(
      options.change,
      root.path,
      root.changesDir,
      { newChangeHint: withStoreFlag(root, 'openspec new change <name>') }
    );
    const projectConfig = readProjectConfig(root.path);
    const instructions = generateArchiveInstructions(changeName, projectConfig);

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...instructions, root: toRootOutput(root) }, null, 2));
      return;
    }

    printArchiveInstructionsText(instructions);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printArchiveInstructionsText(instructions: ArchiveInstructions): void {
  console.log(`## Archive Inputs: ${instructions.changeName}`);
  console.log();
  printOperationInputsText(instructions);
}

function printOperationInputsText(inputs: {
  context?: string;
  operationGuidance?: string[];
}): void {
  if (inputs.context) {
    console.log('### Project Context (required instruction input)');
    console.log(inputs.context);
    console.log();
  }

  if (inputs.operationGuidance && inputs.operationGuidance.length > 0) {
    console.log('### Operation Guidance (advisory)');
    for (const guidance of inputs.operationGuidance) {
      console.log(`- ${guidance}`);
    }
    console.log();
  }

  if (!inputs.context && !inputs.operationGuidance) {
    console.log('No project context or operation guidance configured.');
  }
}
