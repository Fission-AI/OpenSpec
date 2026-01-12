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
} from './artifact-graph/index.js';
import { validateChangeName } from '../utils/change-utils.js';

const DEFAULT_SCHEMA = 'spec-driven';

// -----------------------------------------------------------------------------
// Validation Logic
// -----------------------------------------------------------------------------

export async function validateChangeExists(
  changeName: string | undefined,
  projectRoot: string
): Promise<string> {
  const changesPath = path.join(projectRoot, 'openspec', 'changes');

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
      throw new Error('No changes found. Create one with: openspec_create_change');
    }
    throw new Error(
      `Missing required option changeName. Available changes: ${available.join(', ')}`
    );
  }

  const nameValidation = validateChangeName(changeName);
  if (!nameValidation.valid) {
    throw new Error(`Invalid change name '${changeName}': ${nameValidation.error}`);
  }

  const changePath = path.join(changesPath, changeName);
  const exists = fs.existsSync(changePath) && fs.statSync(changePath).isDirectory();

  if (!exists) {
    const available = await getAvailableChanges();
    if (available.length === 0) {
      throw new Error(
        `Change '${changeName}' not found. No changes exist.`
      );
    }
    throw new Error(
      `Change '${changeName}' not found. Available changes: ${available.join(', ')}`
    );
  }

  return changeName;
}

export function validateSchemaExists(schemaName: string): string {
  const schemaDir = getSchemaDir(schemaName);
  if (!schemaDir) {
    const availableSchemas = listSchemas();
    throw new Error(
      `Schema '${schemaName}' not found. Available schemas: ${availableSchemas.join(', ')}`
    );
  }
  return schemaName;
}

// -----------------------------------------------------------------------------
// Status Logic
// -----------------------------------------------------------------------------

export async function getArtifactStatus(
  projectRoot: string,
  changeName?: string,
  schemaName?: string
): Promise<ChangeStatus> {
  const name = await validateChangeExists(changeName, projectRoot);

  if (schemaName) {
    validateSchemaExists(schemaName);
  }

  const context = loadChangeContext(projectRoot, name, schemaName);
  return formatChangeStatus(context);
}

// -----------------------------------------------------------------------------
// Instructions Logic
// -----------------------------------------------------------------------------

export async function getArtifactInstructions(
  projectRoot: string,
  artifactId: string,
  changeName?: string,
  schemaName?: string
): Promise<ArtifactInstructions> {
  const name = await validateChangeExists(changeName, projectRoot);

  if (schemaName) {
    validateSchemaExists(schemaName);
  }

  const context = loadChangeContext(projectRoot, name, schemaName);

  if (!artifactId) {
    const validIds = context.graph.getAllArtifacts().map((a) => a.id);
    throw new Error(
      `Missing required argument artifactId. Valid artifacts: ${validIds.join(', ')}`
    );
  }

  const artifact = context.graph.getArtifact(artifactId);

  if (!artifact) {
    const validIds = context.graph.getAllArtifacts().map((a) => a.id);
    throw new Error(
      `Artifact '${artifactId}' not found in schema '${context.schemaName}'. Valid artifacts: ${validIds.join(', ')}`
    );
  }

  return generateInstructions(context, artifactId);
}

// -----------------------------------------------------------------------------
// Apply Logic
// -----------------------------------------------------------------------------

export interface TaskItem {
  id: string;
  description: string;
  done: boolean;
}

export interface ApplyInstructions {
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

function parseTasksFile(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n');
  let taskIndex = 0;

  for (const line of lines) {
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

function artifactOutputExists(changeDir: string, generates: string): boolean {
  const normalizedGenerates = generates.split('/').join(path.sep);
  const fullPath = path.join(changeDir, normalizedGenerates);

  if (generates.includes('*')) {
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

    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return false;
    }

    const extMatch = patternPart.match(/\*(\.[a-zA-Z0-9]+)$/);
    const expectedExt = extMatch ? extMatch[1] : null;

    const hasMatchingFiles = (dir: string): boolean => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (generates.includes('**') && hasMatchingFiles(path.join(dir, entry.name))) {
              return true;
            }
          } else if (entry.isFile()) {
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

export async function getApplyInstructions(
  projectRoot: string,
  changeName?: string,
  schemaName?: string
): Promise<ApplyInstructions> {
  const name = await validateChangeExists(changeName, projectRoot);

  if (schemaName) {
    validateSchemaExists(schemaName);
  }

  const context = loadChangeContext(projectRoot, name, schemaName);
  const changeDir = path.join(projectRoot, 'openspec', 'changes', name);

  const schema = resolveSchema(context.schemaName);
  const applyConfig = schema.apply;

  const requiredArtifactIds = applyConfig?.requires ?? schema.artifacts.map((a) => a.id);
  const tracksFile = applyConfig?.tracks ?? null;
  const schemaInstruction = applyConfig?.instruction ?? null;

  const missingArtifacts: string[] = [];
  for (const artifactId of requiredArtifactIds) {
    const artifact = schema.artifacts.find((a) => a.id === artifactId);
    if (artifact && !artifactOutputExists(changeDir, artifact.generates)) {
      missingArtifacts.push(artifactId);
    }
  }

  const contextFiles: Record<string, string> = {};
  for (const artifact of schema.artifacts) {
    if (artifactOutputExists(changeDir, artifact.generates)) {
      contextFiles[artifact.id] = path.join(changeDir, artifact.generates);
    }
  }

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

  const total = tasks.length;
  const complete = tasks.filter((t) => t.done).length;
  const remaining = total - complete;

  let state: ApplyInstructions['state'];
  let instruction: string;

  if (missingArtifacts.length > 0) {
    state = 'blocked';
    instruction = `Cannot apply this change yet. Missing artifacts: ${missingArtifacts.join(', ')}.`;
  } else if (tracksFile && !tracksFileExists) {
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction = `The ${tracksFilename} file is missing and must be created.`;
  } else if (tracksFile && tracksFileExists && total === 0) {
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction = `The ${tracksFilename} file exists but contains no tasks.`;
  } else if (tracksFile && remaining === 0 && total > 0) {
    state = 'all_done';
    instruction = 'All tasks are complete! This change is ready to be archived.';
  } else if (!tracksFile) {
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'All required artifacts complete. Proceed with implementation.';
  } else {
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'Read context files, work through pending tasks, mark complete as you go.';
  }

  return {
    changeName: name,
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

// -----------------------------------------------------------------------------
// Templates Logic
// -----------------------------------------------------------------------------

export interface TemplateInfo {
  artifactId: string;
  templatePath: string;
  source: 'user' | 'package';
}

export async function getTemplatePaths(
  schemaName: string = DEFAULT_SCHEMA
): Promise<Record<string, TemplateInfo>> {
  validateSchemaExists(schemaName);
  const schema = resolveSchema(schemaName);
  const graph = ArtifactGraph.fromSchema(schema);
  const schemaDir = getSchemaDir(schemaName)!;

  const { getUserSchemasDir } = await import('./artifact-graph/resolver.js');
  const userSchemasDir = getUserSchemasDir();
  const isUserOverride = schemaDir.startsWith(userSchemasDir);

  const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => ({
    artifactId: artifact.id,
    templatePath: path.join(schemaDir, 'templates', artifact.template),
    source: isUserOverride ? 'user' : 'package',
  }));

  const output: Record<string, TemplateInfo> = {};
  for (const t of templates) {
    output[t.artifactId] = t;
  }
  return output;
}

// -----------------------------------------------------------------------------
// Schemas Logic
// -----------------------------------------------------------------------------

export function getAvailableSchemas(): SchemaInfo[] {
  return listSchemasWithInfo();
}
