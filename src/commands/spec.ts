import { existsSync, readFileSync } from 'fs';
import path, { join } from 'path';
import { MarkdownParser } from '../core/parsers/markdown-parser.js';
import type { Spec } from '../core/schemas/index.js';
import type { RootOutput } from '../core/root-selection.js';
import { isInteractive } from '../utils/interactive.js';
import { getSpecIds } from '../utils/item-discovery.js';
import { FileSystemUtils } from '../utils/file-system.js';

function assertSpecPath(specsDir: string, specPath: string): void {
  const relativePath = path.relative(path.resolve(specsDir), path.resolve(specPath));
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Path is outside the allowed directory: ${specPath}`);
  }

  try {
    // Preserve confined spec.md links, including links to a sibling capability.
    FileSystemUtils.assertPathWithin(specsDir, specPath);
  } catch {
    // A capability directory may intentionally be a monorepo symlink. Treat it
    // as the trust root while still rejecting a link outside that capability.
    FileSystemUtils.assertPathWithin(path.dirname(specPath), specPath);
  }
}

interface ShowOptions {
  json?: boolean;
  // JSON-only filters (raw-first text has no filters)
  requirements?: boolean;
  scenarios?: boolean; // --no-scenarios sets this to false (JSON only)
  requirement?: string; // JSON only
  noInteractive?: boolean;
  rootOutput?: RootOutput;
}

function parseSpecFromFile(specsDir: string, specPath: string, specId: string): Spec {
  assertSpecPath(specsDir, specPath);
  const content = readFileSync(specPath, 'utf-8');
  const parser = new MarkdownParser(content);
  return parser.parseSpec(specId);
}

function validateRequirementIndex(spec: Spec, requirementOpt?: string): number | undefined {
  if (!requirementOpt) return undefined;
  const index = Number.parseInt(requirementOpt, 10);
  if (!Number.isInteger(index) || index < 1 || index > spec.requirements.length) {
    throw new Error(`Requirement ${requirementOpt} not found`);
  }
  return index - 1;
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

/**
 * Print the raw markdown content for a spec file without any formatting.
 * Raw-first behavior ensures text mode is a passthrough for deterministic output.
 */
function printSpecTextRaw(specsDir: string, specPath: string): void {
  assertSpecPath(specsDir, specPath);
  const content = readFileSync(specPath, 'utf-8');
  console.log(content);
}

export class SpecCommand {
  private specsDir: string;
  private rootPath: string;

  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.specsDir = join(rootPath, 'openspec', 'specs');
  }

  async show(specId?: string, options: ShowOptions = {}): Promise<void> {
    if (!specId) {
      const canPrompt = isInteractive(options);
      const specIds = await getSpecIds(this.rootPath);
      if (canPrompt && specIds.length > 0) {
        const { select } = await import('@inquirer/prompts');
        specId = await select({
          message: 'Select a spec to show',
          choices: specIds.map(id => ({ name: id, value: id })),
        });
      } else {
        throw new Error('Missing required argument <spec-id>');
      }
    }

    const specPath = join(this.specsDir, specId, 'spec.md');
    assertSpecPath(this.specsDir, specPath);
    if (!existsSync(specPath)) {
      throw new Error(`Spec '${specId}' not found at ${specPath}`);
    }

    if (options.json) {
      if (options.requirements && options.requirement) {
        throw new Error('Options --requirements and --requirement cannot be used together');
      }
      const parsed = parseSpecFromFile(this.specsDir, specPath, specId);
      const filtered = filterSpec(parsed, options);
      const output = {
        id: specId,
        title: parsed.name,
        overview: parsed.overview,
        requirementCount: filtered.requirements.length,
        requirements: filtered.requirements,
        metadata: parsed.metadata ?? { version: '1.0.0', format: 'openspec' as const },
        ...(options.rootOutput ? { root: options.rootOutput } : {}),
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }
    printSpecTextRaw(this.specsDir, specPath);
  }
}
