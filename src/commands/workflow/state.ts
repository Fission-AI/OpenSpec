/**
 * Workflow Engine PoC - State Management
 *
 * File-backed state loading and saving for the workflow engine.
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  SCHEMA_VERSION,
  MetaFile,
  TasksFile,
  Task,
  WorkflowState,
  WorkflowChange,
  PhaseId,
} from './types.js';

const STATE_DIR = '.openspec';
const CURRENT_FILE = 'current';
const CHANGES_DIR = 'changes';
const META_FILE = 'meta.yaml';
const TASKS_FILE = 'tasks.yaml';

export function getStatePath(root: string = '.'): string {
  return path.join(root, STATE_DIR);
}

export function getChangePath(root: string, changeId: string): string {
  return path.join(getStatePath(root), CHANGES_DIR, changeId);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadActiveChangeId(root: string = '.'): Promise<string | null> {
  const currentPath = path.join(getStatePath(root), CURRENT_FILE);
  if (!(await fileExists(currentPath))) {
    return null;
  }
  const content = await fs.readFile(currentPath, 'utf-8');
  return content.trim() || null;
}

export async function saveActiveChangeId(root: string, changeId: string): Promise<void> {
  const statePath = getStatePath(root);
  await fs.mkdir(statePath, { recursive: true });
  const currentPath = path.join(statePath, CURRENT_FILE);
  await fs.writeFile(currentPath, changeId + '\n', 'utf-8');
}

export async function loadMeta(root: string, changeId: string): Promise<MetaFile | null> {
  const metaPath = path.join(getChangePath(root, changeId), META_FILE);
  if (!(await fileExists(metaPath))) {
    return null;
  }
  const content = await fs.readFile(metaPath, 'utf-8');
  return yaml.load(content) as MetaFile;
}

export async function saveMeta(root: string, changeId: string, meta: MetaFile): Promise<void> {
  const changePath = getChangePath(root, changeId);
  await fs.mkdir(changePath, { recursive: true });
  const metaPath = path.join(changePath, META_FILE);
  await fs.writeFile(metaPath, yaml.dump(meta), 'utf-8');
}

export async function loadTasks(root: string, changeId: string): Promise<Task[]> {
  const tasksPath = path.join(getChangePath(root, changeId), TASKS_FILE);
  if (!(await fileExists(tasksPath))) {
    return [];
  }
  const content = await fs.readFile(tasksPath, 'utf-8');
  const tasksFile = yaml.load(content) as TasksFile;
  return tasksFile?.tasks || [];
}

export async function saveTasks(root: string, changeId: string, tasks: Task[]): Promise<void> {
  const changePath = getChangePath(root, changeId);
  await fs.mkdir(changePath, { recursive: true });
  const tasksPath = path.join(changePath, TASKS_FILE);
  const tasksFile: TasksFile = {
    schemaVersion: SCHEMA_VERSION,
    tasks,
  };
  await fs.writeFile(tasksPath, yaml.dump(tasksFile), 'utf-8');
}

export async function loadWorkflowState(root: string = '.'): Promise<WorkflowState> {
  const activeChangeId = await loadActiveChangeId(root);

  if (!activeChangeId) {
    return {
      activeChangeId: null,
      activeChange: null,
    };
  }

  const meta = await loadMeta(root, activeChangeId);
  if (!meta) {
    // Active change id exists but meta file is missing
    return {
      activeChangeId,
      activeChange: null,
    };
  }

  const tasks = await loadTasks(root, activeChangeId);

  return {
    activeChangeId,
    activeChange: {
      meta,
      tasks,
    },
  };
}

export async function updatePhase(root: string, changeId: string, phase: PhaseId): Promise<void> {
  const meta = await loadMeta(root, changeId);
  if (!meta) {
    throw new Error(`Change "${changeId}" not found`);
  }
  meta.currentPhaseId = phase;
  meta.updatedAt = new Date().toISOString();
  await saveMeta(root, changeId, meta);
}

export async function updateTaskStatus(
  root: string,
  changeId: string,
  taskId: string,
  status: Task['status'],
  notes?: string
): Promise<void> {
  const tasks = await loadTasks(root, changeId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task "${taskId}" not found in change "${changeId}"`);
  }
  task.status = status;
  await saveTasks(root, changeId, tasks);

  // Update meta timestamp
  const meta = await loadMeta(root, changeId);
  if (meta) {
    meta.updatedAt = new Date().toISOString();
    await saveMeta(root, changeId, meta);
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export async function createChange(root: string, title: string): Promise<string> {
  const id = slugify(title);
  const now = new Date().toISOString();

  const meta: MetaFile = {
    schemaVersion: SCHEMA_VERSION,
    id,
    title,
    currentPhaseId: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  await saveMeta(root, id, meta);
  await saveTasks(root, id, []);
  await saveActiveChangeId(root, id);

  return id;
}

export async function listChanges(root: string = '.'): Promise<string[]> {
  const changesPath = path.join(getStatePath(root), CHANGES_DIR);
  if (!(await fileExists(changesPath))) {
    return [];
  }
  const entries = await fs.readdir(changesPath, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}
