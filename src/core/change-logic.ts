import { promises as fs } from 'fs';
import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { writeChangeMetadata, validateSchemaName } from '../utils/change-metadata.js';
import { validateChangeName } from '../utils/change-utils.js';
import { resolveOpenSpecDir } from './path-resolver.js';
import { JsonConverter } from './converters/json-converter.js';
import { Validator } from './validation/validator.js';
import { ChangeParser } from './parsers/change-parser.js';
import { Change } from './schemas/index.js';

const DEFAULT_SCHEMA = 'spec-driven';
const ARCHIVE_DIR = 'archive';
const TASK_PATTERN = /^[-*]\s+\[[\sx]\]/i;
const COMPLETED_TASK_PATTERN = /^[-*]\s+\[x\]/i;

export interface CreateChangeResult {
  name: string;
  changeDir: string;
  schema: string;
}

export interface ChangeJsonOutput {
  id: string;
  title: string;
  deltaCount: number;
  deltas: any[];
}

export interface ChangeListItem {
    id: string;
    title: string;
    deltaCount: number;
    taskStatus: { total: number; completed: number };
}

export async function runCreateChange(
  projectRoot: string,
  name: string,
  options: { schema?: string } = {}
): Promise<CreateChangeResult> {
  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const schemaName = options.schema ?? DEFAULT_SCHEMA;
  validateSchemaName(schemaName);

  const openspecPath = await resolveOpenSpecDir(projectRoot);
  const changeDir = path.join(openspecPath, 'changes', name);

  if (await FileSystemUtils.directoryExists(changeDir)) {
    throw new Error(`Change '${name}' already exists at ${changeDir}`);
  }

  await FileSystemUtils.createDirectory(changeDir);

  const today = new Date().toISOString().split('T')[0];
  writeChangeMetadata(changeDir, {
    schema: schemaName,
    created: today,
  });

  return {
    name,
    changeDir,
    schema: schemaName
  };
}

export async function getActiveChanges(projectRoot: string): Promise<string[]> {
    const openspecPath = await resolveOpenSpecDir(projectRoot);
    const changesPath = path.join(openspecPath, 'changes');
    try {
      const entries = await fs.readdir(changesPath, { withFileTypes: true });
      const result: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === ARCHIVE_DIR) continue;
        const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
        try {
          await fs.access(proposalPath);
          result.push(entry.name);
        } catch {
          // skip directories without proposal.md
        }
      }
      return result.sort();
    } catch {
      return [];
    }
}

export async function getChangeMarkdown(projectRoot: string, changeName: string): Promise<string> {
    const changesPath = path.join(await resolveOpenSpecDir(projectRoot), 'changes');
    const proposalPath = path.join(changesPath, changeName, 'proposal.md');
    try {
        return await fs.readFile(proposalPath, 'utf-8');
    } catch {
        throw new Error(`Change "${changeName}" not found at ${proposalPath}`);
    }
}

export async function getChangeJson(projectRoot: string, changeName: string): Promise<ChangeJsonOutput> {
    const changesPath = path.join(await resolveOpenSpecDir(projectRoot), 'changes');
    const proposalPath = path.join(changesPath, changeName, 'proposal.md');

    try {
      await fs.access(proposalPath);
    } catch {
      throw new Error(`Change "${changeName}" not found at ${proposalPath}`);
    }

    const converter = new JsonConverter();
    const jsonOutput = await converter.convertChangeToJson(proposalPath);
    const parsed: Change = JSON.parse(jsonOutput);
    const contentForTitle = await fs.readFile(proposalPath, 'utf-8');
    const title = extractTitle(contentForTitle, changeName);
    const id = parsed.name;
    const deltas = parsed.deltas || [];

    return {
        id,
        title,
        deltaCount: deltas.length,
        deltas,
    };
}

export async function getChangeDetails(projectRoot: string, changeName: string): Promise<ChangeListItem> {
    const changesPath = path.join(await resolveOpenSpecDir(projectRoot), 'changes');
    const proposalPath = path.join(changesPath, changeName, 'proposal.md');
    const tasksPath = path.join(changesPath, changeName, 'tasks.md');
    
    try {
        const content = await fs.readFile(proposalPath, 'utf-8');
        const changeDir = path.join(changesPath, changeName);
        const parser = new ChangeParser(content, changeDir);
        const change = await parser.parseChangeWithDeltas(changeName);
        
        let taskStatus = { total: 0, completed: 0 };
        try {
            const tasksContent = await fs.readFile(tasksPath, 'utf-8');
            taskStatus = countTasks(tasksContent);
        } catch {
            // Tasks file may not exist, which is okay
        }
        
        return {
            id: changeName,
            title: extractTitle(content, changeName),
            deltaCount: change.deltas.length,
            taskStatus,
        };
    } catch {
        return {
            id: changeName,
            title: 'Unknown',
            deltaCount: 0,
            taskStatus: { total: 0, completed: 0 },
        };
    }
}

export async function validateChange(projectRoot: string, changeName: string, strict: boolean = false) {
    const changesPath = path.join(await resolveOpenSpecDir(projectRoot), 'changes');
    const changeDir = path.join(changesPath, changeName);
    
    try {
      await fs.access(changeDir);
    } catch {
      throw new Error(`Change "${changeName}" not found at ${changeDir}`);
    }
    
    const validator = new Validator(strict);
    return await validator.validateChangeDeltaSpecs(changeDir);
}

export function extractTitle(content: string, changeName: string): string {
    const match = content.match(/^#\s+(?:Change:\s+)?(.+)$/im);
    return match ? match[1].trim() : changeName;
}

export function countTasks(content: string): { total: number; completed: number } {
    const lines = content.split('\n');
    let total = 0;
    let completed = 0;
    
    for (const line of lines) {
      if (line.match(TASK_PATTERN)) {
        total++;
        if (line.match(COMPLETED_TASK_PATTERN)) {
          completed++;
        }
      }
    }
    
    return { total, completed };
}