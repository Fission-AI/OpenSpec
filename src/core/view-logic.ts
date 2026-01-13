import * as fs from 'fs';
import * as path from 'path';
import { getTaskProgressForChange } from '../utils/task-progress.js';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { resolveOpenSpecDir } from './path-resolver.js';

export interface DashboardData {
  changes: {
    draft: Array<{ name: string }>;
    active: Array<{ name: string; progress: { total: number; completed: number } }>;
    completed: Array<{ name: string }>;
  };
  specs: Array<{ name: string; requirementCount: number }>;
}

export async function getViewData(targetPath: string = '.'): Promise<DashboardData> {
  const openspecDir = await resolveOpenSpecDir(targetPath);
  
  if (!fs.existsSync(openspecDir)) {
    throw new Error('No OpenSpec directory found');
  }

  const changesData = await getChangesData(openspecDir);
  const specsData = await getSpecsData(openspecDir);

  return {
    changes: changesData,
    specs: specsData
  };
}

async function getChangesData(openspecDir: string): Promise<DashboardData['changes']> {
  const changesDir = path.join(openspecDir, 'changes');

  if (!fs.existsSync(changesDir)) {
    return { draft: [], active: [], completed: [] };
  }

  const draft: Array<{ name: string }> = [];
  const active: Array<{ name: string; progress: { total: number; completed: number } }> = [];
  const completed: Array<{ name: string }> = [];

  const entries = fs.readdirSync(changesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'archive') {
      const progress = await getTaskProgressForChange(changesDir, entry.name);

      if (progress.total === 0) {
        draft.push({ name: entry.name });
      } else if (progress.completed === progress.total) {
        completed.push({ name: entry.name });
      } else {
        active.push({ name: entry.name, progress });
      }
    }
  }

  draft.sort((a, b) => a.name.localeCompare(b.name));
  active.sort((a, b) => {
    const percentageA = a.progress.total > 0 ? a.progress.completed / a.progress.total : 0;
    const percentageB = b.progress.total > 0 ? b.progress.completed / b.progress.total : 0;
    if (percentageA < percentageB) return -1;
    if (percentageA > percentageB) return 1;
    return a.name.localeCompare(b.name);
  });
  completed.sort((a, b) => a.name.localeCompare(b.name));

  return { draft, active, completed };
}

async function getSpecsData(openspecDir: string): Promise<DashboardData['specs']> {
  const specsDir = path.join(openspecDir, 'specs');
  
  if (!fs.existsSync(specsDir)) {
    return [];
  }

  const specs: Array<{ name: string; requirementCount: number }> = [];
  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const specFile = path.join(specsDir, entry.name, 'spec.md');
      
      if (fs.existsSync(specFile)) {
        try {
          const content = fs.readFileSync(specFile, 'utf-8');
          const parser = new MarkdownParser(content);
          const spec = parser.parseSpec(entry.name);
          const requirementCount = spec.requirements.length;
          specs.push({ name: entry.name, requirementCount });
        } catch (error) {
          specs.push({ name: entry.name, requirementCount: 0 });
        }
      }
    }
  }

  return specs;
}
