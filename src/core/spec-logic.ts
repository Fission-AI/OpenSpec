import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownParser } from './parsers/markdown-parser.js';
import { Spec } from './schemas/index.js';
import { resolveOpenSpecDir } from './path-resolver.js';
import { FileSystemUtils } from '../utils/file-system.js';

export interface ShowOptions {
  json?: boolean;
  // JSON-only filters (raw-first text has no filters)
  requirements?: boolean;
  scenarios?: boolean; // --no-scenarios sets this to false (JSON only)
  requirement?: string; // JSON only
  noInteractive?: boolean;
}

export interface SpecListItem {
    id: string;
    title: string;
    requirementCount: number;
}

export async function getSpecMarkdown(projectRoot: string, specId: string): Promise<string> {
    const openspecPath = await resolveOpenSpecDir(projectRoot);
    const specPath = path.join(openspecPath, 'specs', specId, 'spec.md');
    if (!(await FileSystemUtils.fileExists(specPath))) {
        throw new Error(`Spec '${specId}' not found at ${specPath}`);
    }
    return FileSystemUtils.readFile(specPath);
}

export async function getSpecJson(projectRoot: string, specId: string, options: ShowOptions = {}): Promise<any> {
    const openspecPath = await resolveOpenSpecDir(projectRoot);
    const specPath = path.join(openspecPath, 'specs', specId, 'spec.md');
    if (!(await FileSystemUtils.fileExists(specPath))) {
        throw new Error(`Spec '${specId}' not found at ${specPath}`);
    }

    const content = await FileSystemUtils.readFile(specPath);
    const parser = new MarkdownParser(content);
    const parsed = parser.parseSpec(specId);
    
    const filtered = filterSpec(parsed, options);
    return {
      id: specId,
      title: parsed.name,
      overview: parsed.overview,
      requirementCount: filtered.requirements.length,
      requirements: filtered.requirements,
      metadata: parsed.metadata ?? { version: '1.0.0', format: 'openspec' as const },
    };
}

export async function getSpecIds(projectRoot: string): Promise<string[]> {
    const openspecPath = await resolveOpenSpecDir(projectRoot);
    const specsPath = path.join(openspecPath, 'specs');
    try {
        const entries = await fs.readdir(specsPath, { withFileTypes: true });
        const ids: string[] = [];
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                 const specPath = path.join(specsPath, entry.name, 'spec.md');
                 if (await FileSystemUtils.fileExists(specPath)) {
                     ids.push(entry.name);
                 }
            }
        }
        return ids.sort();
    } catch {
        return [];
    }
}

export async function getSpecDetails(projectRoot: string, specId: string): Promise<SpecListItem> {
    const openspecPath = await resolveOpenSpecDir(projectRoot);
    const specPath = path.join(openspecPath, 'specs', specId, 'spec.md');
    
    try {
        const content = await FileSystemUtils.readFile(specPath);
        const parser = new MarkdownParser(content);
        const spec = parser.parseSpec(specId);
        
        return {
            id: specId,
            title: spec.name,
            requirementCount: spec.requirements.length
        };
    } catch {
        return {
            id: specId,
            title: specId,
            requirementCount: 0
        };
    }
}

function validateRequirementIndex(spec: Spec, requirementOpt?: string): number | undefined {
  if (!requirementOpt) return undefined;
  const index = Number.parseInt(requirementOpt, 10);
  if (!Number.isInteger(index) || index < 1 || index > spec.requirements.length) {
    throw new Error(`Requirement ${requirementOpt} not found`);
  }
  return index - 1; // convert to 0-based
}

function filterSpec(spec: Spec, options: ShowOptions): Spec {
  const requirementIndex = validateRequirementIndex(spec, options.requirement);
  const includeScenarios = options.scenarios !== false && !options.requirements;

  const filteredRequirements = (requirementIndex !== undefined
    ? [spec.requirements[requirementIndex]]
    : spec.requirements
  ).map(req => ({
    text: req.text,
    scenarios: includeScenarios ? req.scenarios : [],
  }));

  const metadata = spec.metadata ?? { version: '1.0.0', format: 'openspec' as const };

  return {
    name: spec.name,
    overview: spec.overview,
    requirements: filteredRequirements,
    metadata,
  };
}