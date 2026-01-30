import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, type TaskProgress } from '../../utils/task-progress.js';
import { MarkdownParser } from '../parsers/markdown-parser.js';
import { renderMarkdown } from './markdown.js';

export interface ChangeArtifacts {
  proposal: boolean;
  specs: boolean;
  design: boolean;
  tasks: boolean;
}

export interface ChangeEntry {
  name: string;
  status: 'draft' | 'active' | 'completed';
  artifacts: ChangeArtifacts;
  progress: TaskProgress;
}

export interface SpecEntry {
  name: string;
  requirementCount: number;
}

export interface SpecGroup {
  domain: string;
  specs: SpecEntry[];
}

export interface ArchiveEntry {
  name: string;
  date: string;
  changeName: string;
}

export interface DashboardSummary {
  changes: { draft: number; active: number; completed: number; total: number };
  specs: { total: number; totalRequirements: number };
  archive: { total: number };
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getArtifacts(changeDir: string): Promise<ChangeArtifacts> {
  const [proposal, specs, design, tasks] = await Promise.all([
    fileExists(path.join(changeDir, 'proposal.md')),
    dirExists(path.join(changeDir, 'specs')),
    fileExists(path.join(changeDir, 'design.md')),
    fileExists(path.join(changeDir, 'tasks.md')),
  ]);
  return { proposal, specs, design, tasks };
}

export async function getChangesData(openspecDir: string): Promise<ChangeEntry[]> {
  const changesDir = path.join(openspecDir, 'changes');
  if (!(await dirExists(changesDir))) {
    return [];
  }

  const entries = await fs.readdir(changesDir, { withFileTypes: true });
  const changes: ChangeEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive' || entry.name.startsWith('.')) continue;

    const changeDir = path.join(changesDir, entry.name);
    const [progress, artifacts] = await Promise.all([
      getTaskProgressForChange(changesDir, entry.name),
      getArtifacts(changeDir),
    ]);

    let status: ChangeEntry['status'];
    if (progress.total === 0) {
      status = 'draft';
    } else if (progress.completed === progress.total) {
      status = 'completed';
    } else {
      status = 'active';
    }

    changes.push({ name: entry.name, status, artifacts, progress });
  }

  changes.sort((a, b) => a.name.localeCompare(b.name));
  return changes;
}

export async function getSpecsData(openspecDir: string): Promise<SpecGroup[]> {
  const specsDir = path.join(openspecDir, 'specs');
  if (!(await dirExists(specsDir))) {
    return [];
  }

  const entries = await fs.readdir(specsDir, { withFileTypes: true });
  const specs: SpecEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const specFile = path.join(specsDir, entry.name, 'spec.md');
    if (!(await fileExists(specFile))) continue;

    let requirementCount = 0;
    try {
      const content = await fs.readFile(specFile, 'utf-8');
      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec(entry.name);
      requirementCount = spec.requirements.length;
    } catch {
      // If spec can't be parsed, include with 0 count
    }

    specs.push({ name: entry.name, requirementCount });
  }

  specs.sort((a, b) => a.name.localeCompare(b.name));

  // Group by domain prefix (text before first hyphen)
  const groupMap = new Map<string, SpecEntry[]>();
  for (const spec of specs) {
    const hyphenIdx = spec.name.indexOf('-');
    const domain = hyphenIdx > 0 ? spec.name.substring(0, hyphenIdx) : spec.name;
    const group = groupMap.get(domain);
    if (group) {
      group.push(spec);
    } else {
      groupMap.set(domain, [spec]);
    }
  }

  const groups: SpecGroup[] = [];
  for (const [domain, domainSpecs] of groupMap) {
    groups.push({ domain, specs: domainSpecs });
  }
  groups.sort((a, b) => a.domain.localeCompare(b.domain));

  return groups;
}

export async function getArchiveData(
  openspecDir: string,
  limit = 50,
  offset = 0
): Promise<{ entries: ArchiveEntry[]; total: number }> {
  const archiveDir = path.join(openspecDir, 'changes', 'archive');
  if (!(await dirExists(archiveDir))) {
    return { entries: [], total: 0 };
  }

  const dirEntries = await fs.readdir(archiveDir, { withFileTypes: true });
  const allEntries: ArchiveEntry[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    // Parse date from YYYY-MM-DD-<name> format
    const dateMatch = entry.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (dateMatch) {
      allEntries.push({
        name: entry.name,
        date: dateMatch[1],
        changeName: dateMatch[2],
      });
    } else {
      allEntries.push({
        name: entry.name,
        date: '',
        changeName: entry.name,
      });
    }
  }

  // Sort reverse chronologically (most recent first)
  allEntries.sort((a, b) => b.name.localeCompare(a.name));

  const total = allEntries.length;
  const entries = allEntries.slice(offset, offset + limit);

  return { entries, total };
}

export async function getSummary(openspecDir: string): Promise<DashboardSummary> {
  const changes = await getChangesData(openspecDir);
  const specGroups = await getSpecsData(openspecDir);
  const archive = await getArchiveData(openspecDir, 1, 0);

  const draft = changes.filter((c) => c.status === 'draft').length;
  const active = changes.filter((c) => c.status === 'active').length;
  const completed = changes.filter((c) => c.status === 'completed').length;

  let totalSpecs = 0;
  let totalRequirements = 0;
  for (const group of specGroups) {
    totalSpecs += group.specs.length;
    totalRequirements += group.specs.reduce((sum, s) => sum + s.requirementCount, 0);
  }

  return {
    changes: { draft, active, completed, total: draft + active + completed },
    specs: { total: totalSpecs, totalRequirements },
    archive: { total: archive.total },
  };
}

export async function getArtifactContent(
  openspecDir: string,
  relativePath: string
): Promise<{ html: string } | { error: string; status: number }> {
  // Resolve and verify path stays within openspec directory
  const resolvedOpenspec = path.resolve(openspecDir);
  const resolvedPath = path.resolve(openspecDir, relativePath);

  if (!resolvedPath.startsWith(resolvedOpenspec + path.sep) && resolvedPath !== resolvedOpenspec) {
    return { error: 'Forbidden: path outside openspec directory', status: 403 };
  }

  // Only allow .md and .yaml files
  const ext = path.extname(resolvedPath).toLowerCase();
  if (ext !== '.md' && ext !== '.yaml' && ext !== '.yml') {
    return { error: 'Forbidden: only .md and .yaml files are allowed', status: 403 };
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    if (ext === '.md') {
      return { html: renderMarkdown(content) };
    }
    // YAML files: render as code block
    return { html: `<pre><code>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>` };
  } catch {
    return { error: 'File not found', status: 404 };
  }
}
