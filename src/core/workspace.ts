import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'yaml';
import { WorkspaceConfigSchema, type WorkspaceConfig, type WorkspaceRepo } from './schemas/index.js';
import { OPENSPEC_DIR_NAME } from './config.js';

export const WORKSPACE_FILE_NAME = 'workspace.yaml';

export interface ResolvedWorkspaceRepo extends WorkspaceRepo {
  absolutePath: string;
  openspecDir: string | null;
  hasOpenspec: boolean;
}

export interface Workspace {
  name: string;
  root: string;
  repos: ResolvedWorkspaceRepo[];
  conventions: WorkspaceConfig['conventions'];
  raw: WorkspaceConfig;
}

export interface WorkspaceValidationIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  repo?: string;
}

export interface WorkspaceValidationResult {
  valid: boolean;
  issues: WorkspaceValidationIssue[];
}

export class WorkspaceManager {
  /**
   * Load workspace configuration from a directory
   */
  static async load(root: string): Promise<Workspace | null> {
    const workspacePath = path.join(root, OPENSPEC_DIR_NAME, WORKSPACE_FILE_NAME);

    try {
      const content = await fs.readFile(workspacePath, 'utf-8');
      const parsed = yaml.parse(content);
      const config = WorkspaceConfigSchema.parse(parsed);

      const resolvedRepos = await Promise.all(
        config.repos.map(repo => this.resolveRepo(root, repo))
      );

      return {
        name: config.name,
        root,
        repos: resolvedRepos,
        conventions: config.conventions,
        raw: config,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if a workspace.yaml exists in the given directory
   */
  static async exists(root: string): Promise<boolean> {
    const workspacePath = path.join(root, OPENSPEC_DIR_NAME, WORKSPACE_FILE_NAME);
    try {
      await fs.access(workspacePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Discover potential child repositories in a directory
   */
  static async discoverRepos(root: string): Promise<string[]> {
    const excludeDirs = new Set([
      'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
      'coverage', '__pycache__', '.venv', 'venv', '.cache',
      OPENSPEC_DIR_NAME, '.idea', '.vscode'
    ]);

    const entries = await fs.readdir(root, { withFileTypes: true });
    const potentialRepos: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || excludeDirs.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }

      const dirPath = path.join(root, entry.name);
      const hasGit = await this.fileExists(path.join(dirPath, '.git'));
      const hasPackageJson = await this.fileExists(path.join(dirPath, 'package.json'));
      const hasPyproject = await this.fileExists(path.join(dirPath, 'pyproject.toml'));
      const hasCargoToml = await this.fileExists(path.join(dirPath, 'Cargo.toml'));
      const hasGoMod = await this.fileExists(path.join(dirPath, 'go.mod'));

      if (hasGit || hasPackageJson || hasPyproject || hasCargoToml || hasGoMod) {
        potentialRepos.push(entry.name);
      }
    }

    return potentialRepos.sort();
  }

  /**
   * Validate workspace configuration and structure
   */
  static async validateWorkspace(workspace: Workspace): Promise<WorkspaceValidationResult> {
    const issues: WorkspaceValidationIssue[] = [];

    // Check each repo exists and has openspec
    for (const repo of workspace.repos) {
      if (!await this.fileExists(repo.absolutePath)) {
        issues.push({
          level: 'error',
          message: `Repo path does not exist: ${repo.path}`,
          repo: repo.name,
        });
        continue;
      }

      if (!repo.hasOpenspec) {
        issues.push({
          level: 'warning',
          message: `Repo '${repo.name}' does not have openspec/ directory`,
          repo: repo.name,
        });
      }
    }

    // Check for duplicate repo names
    const names = workspace.repos.map(r => r.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    if (duplicates.length > 0) {
      issues.push({
        level: 'error',
        message: `Duplicate repo names: ${[...new Set(duplicates)].join(', ')}`,
      });
    }

    return {
      valid: !issues.some(i => i.level === 'error'),
      issues,
    };
  }

  /**
   * Generate default workspace.yaml content
   */
  static generateWorkspaceYaml(name: string, repos: Array<{ name: string; path: string; role?: string }>): string {
    const config: WorkspaceConfig = {
      name,
      repos: repos.map(r => ({
        name: r.name,
        path: r.path,
        ...(r.role && { role: r.role }),
      })),
      conventions: {
        crossRepoChanges: {
          requireImpactSection: true,
          requireImplementationOrder: false,
        },
      },
    };

    return yaml.stringify(config, { indent: 2 });
  }

  /**
   * Get the workspace AGENTS.md section content
   */
  static getWorkspaceAgentsSection(workspace: Workspace): string {
    const repoList = workspace.repos
      .map(r => `  - \`${r.name}\`: ${r.path}${r.role ? ` (${r.role})` : ''}`)
      .join('\n');

    return `
## Multi-Repository Workspace

This workspace coordinates specifications across multiple repositories:

${repoList}

### Cross-Repo Change Workflow

When creating changes that affect multiple repos:

1. **Add Impact Section**: Include \`## Impact\` in proposal.md listing affected repos
2. **Specify Implementation Order**: Document which repo should be implemented first
3. **Validate**: Run \`openspec validate --workspace\` to check cross-repo conventions

**Example Impact Section:**
\`\`\`markdown
## Impact
- Affected repos:
  - backend: api/endpoints/, models/
  - mobile: services/api.ts, screens/
- Implementation order: backend first, then mobile
\`\`\`

### Commands
- \`openspec validate --workspace\`: Validate all repos and cross-repo conventions
- \`openspec list --workspace\`: List changes across all repos (future)
`;
  }

  // Private helpers

  private static async resolveRepo(root: string, repo: WorkspaceRepo): Promise<ResolvedWorkspaceRepo> {
    const absolutePath = path.resolve(root, repo.path);
    const openspecDir = path.join(absolutePath, OPENSPEC_DIR_NAME);
    const hasOpenspec = await this.fileExists(openspecDir);

    return {
      ...repo,
      absolutePath,
      openspecDir: hasOpenspec ? openspecDir : null,
      hasOpenspec,
    };
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
