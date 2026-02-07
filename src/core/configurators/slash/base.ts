import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { FileSystemUtils } from '../../../utils/file-system.js';
import { TemplateManager, SlashCommandId } from '../../templates/index.js';
import { LIGHTSPEC_MARKERS } from '../../config.js';

export interface SlashCommandTarget {
  id: SlashCommandId;
  path: string;
  kind: 'skill';
}

export type SkillInstallLocation = 'project' | 'home';

const ALL_COMMANDS: SlashCommandId[] = ['proposal', 'apply', 'archive', 'context-check'];

const TOOL_SKILL_ROOTS: Record<string, string> = {
  'amazon-q': '.amazonq',
  antigravity: '.antigravity',
  auggie: '.auggie',
  claude: '.claude',
  cline: '.cline',
  codex: '.codex',
  codebuddy: '.codebuddy',
  continue: '.continue',
  costrict: '.cospec/lightspec',
  crush: '.crush',
  cursor: '.cursor',
  factory: '.factory',
  gemini: '.gemini',
  'github-copilot': '.github/copilot',
  iflow: '.iflow',
  kilocode: '.kilocode',
  'mistral-vibe': '.vibe',
  opencode: '.opencode',
  qoder: '.qoder',
  qwen: '.qwen',
  roocode: '.roocode',
  windsurf: '.windsurf',
};

const TOOL_LEGACY_DIRS: Record<string, string[]> = {
  'amazon-q': ['.amazonq/prompts', '.aws/amazonq/commands'],
  antigravity: ['.antigravity/commands', '.agent/workflows'],
  auggie: ['.augment/commands', '.auggie/commands'],
  claude: ['.claude/commands'],
  cline: ['.cline/commands', '.clinerules/workflows'],
  codex: ['.codex/prompts'],
  codebuddy: ['.codebuddy/commands'],
  continue: ['.continue/prompts', '.continue/commands'],
  costrict: ['.cospec/lightspec/commands'],
  crush: ['.crush/commands'],
  cursor: ['.cursor/commands'],
  factory: ['.factory/commands'],
  gemini: ['.gemini/commands'],
  'github-copilot': ['.github/prompts', '.github/copilot/prompts'],
  iflow: ['.iflow/commands'],
  kilocode: ['.kilocode/commands', '.kilocode/workflows'],
  'mistral-vibe': ['.vibe/commands', '.vibe/workflows', '.vibe/prompts'],
  opencode: ['.opencode/command', '.opencode/commands'],
  qoder: ['.qoder/commands', '.qoder/prompts'],
  qwen: ['.qwen/commands', '.qwen/prompts'],
  roocode: ['.roo/commands', '.roocode/commands'],
  windsurf: ['.windsurf/workflows', '.windsurf/commands'],
};

export abstract class SlashCommandConfigurator {
  abstract readonly toolId: string;
  abstract readonly isAvailable: boolean;

  private installLocation: SkillInstallLocation = 'project';

  setInstallLocation(location: SkillInstallLocation): void {
    this.installLocation = location;
  }

  getTargets(): SlashCommandTarget[] {
    return ALL_COMMANDS.map((id) => ({
      id,
      path: this.getRelativeSkillPath(id),
      kind: 'skill',
    }));
  }

  async generateAll(projectPath: string, _lightspecDir: string): Promise<string[]> {
    const createdOrUpdated: string[] = [];

    for (const target of this.getTargets()) {
      const body = this.getBody(target.id);
      const filePath = this.resolveAbsolutePath(projectPath, target.id);

      if (await FileSystemUtils.fileExists(filePath)) {
        await this.updateBody(filePath, body);
      } else {
        const frontmatter = TemplateManager.getSlashCommandFrontmatter(target.id).trim();
        const content = this.buildSkillFile(frontmatter, body);
        await FileSystemUtils.writeFile(filePath, content);
      }

      createdOrUpdated.push(target.path);
    }

    await this.cleanupLegacyArtifacts(projectPath);

    return createdOrUpdated;
  }

  async updateExisting(projectPath: string, _lightspecDir: string): Promise<string[]> {
    const updated: string[] = [];

    for (const target of this.getTargets()) {
      const filePath = this.resolveAbsolutePath(projectPath, target.id);
      if (await FileSystemUtils.fileExists(filePath)) {
        const body = this.getBody(target.id);
        await this.updateBody(filePath, body);
        updated.push(target.path);
      }
    }

    await this.cleanupLegacyArtifacts(projectPath);

    return updated;
  }

  protected getBody(id: SlashCommandId): string {
    return TemplateManager.getSlashCommandBody(id).trim();
  }

  resolveAbsolutePath(projectPath: string, id: SlashCommandId): string {
    const relativePath = this.getRelativeSkillPath(id);
    if (this.installLocation === 'project') {
      return FileSystemUtils.joinPath(projectPath, relativePath);
    }

    const homeRoot = this.getHomeRootPath();
    const rootPrefix = this.getToolRoot();
    const normalizedRelativePath = FileSystemUtils.toPosixPath(relativePath);

    if (!normalizedRelativePath.startsWith(`${rootPrefix}/`)) {
      throw new Error(
        `Skill path '${relativePath}' does not match expected root '${rootPrefix}' for ${this.toolId}`
      );
    }

    const relativeUnderRoot = normalizedRelativePath.slice(rootPrefix.length + 1);
    return FileSystemUtils.joinPath(homeRoot, relativeUnderRoot);
  }

  private getRelativeSkillPath(id: SlashCommandId): string {
    const root = this.getToolRoot();
    const skillName = this.getSkillName(id);
    return `${root}/skills/${skillName}/SKILL.md`;
  }

  private getToolRoot(): string {
    const root = TOOL_SKILL_ROOTS[this.toolId];
    if (!root) {
      throw new Error(`No skill root directory configured for tool '${this.toolId}'`);
    }
    return root;
  }

  private getHomeRootPath(): string {
    if (this.toolId === 'codex') {
      const codexHome = process.env.CODEX_HOME?.trim();
      return codexHome && codexHome.length > 0
        ? codexHome
        : FileSystemUtils.joinPath(os.homedir(), '.codex');
    }

    const toolRoot = this.getToolRoot();
    const trimmed = toolRoot.startsWith('./') ? toolRoot.slice(2) : toolRoot;
    return path.join(os.homedir(), trimmed);
  }

  private getSkillName(id: SlashCommandId): string {
    return `lightspec-${id}`;
  }

  private buildSkillFile(frontmatter: string | undefined, body: string): string {
    const sections: string[] = [];
    if (frontmatter) {
      sections.push(frontmatter);
    }
    sections.push(`${LIGHTSPEC_MARKERS.start}\n${body}\n${LIGHTSPEC_MARKERS.end}`);
    return `${sections.join('\n\n')}\n`;
  }

  protected async updateBody(filePath: string, body: string): Promise<void> {
    const content = await FileSystemUtils.readFile(filePath);
    const startIndex = content.indexOf(LIGHTSPEC_MARKERS.start);
    const endIndex = content.indexOf(LIGHTSPEC_MARKERS.end);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error(`Missing LightSpec markers in ${filePath}`);
    }

    const before = content.slice(0, startIndex + LIGHTSPEC_MARKERS.start.length);
    const after = content.slice(endIndex);
    const updatedContent = `${before}\n${body}\n${after}`;

    await FileSystemUtils.writeFile(filePath, updatedContent);
  }

  private async cleanupLegacyArtifacts(projectPath: string): Promise<void> {
    const legacyDirs = TOOL_LEGACY_DIRS[this.toolId] ?? [];
    for (const legacyDir of legacyDirs) {
      const absoluteDir =
        this.installLocation === 'project'
          ? FileSystemUtils.joinPath(projectPath, legacyDir)
          : FileSystemUtils.joinPath(this.getHomeRootPath(), this.relativeToToolRoot(legacyDir));
      await this.removeLegacyLightSpecFiles(absoluteDir);
    }
  }

  private relativeToToolRoot(relativePath: string): string {
    const rootPrefix = this.getToolRoot();
    const normalized = FileSystemUtils.toPosixPath(relativePath);
    if (normalized.startsWith(`${rootPrefix}/`)) {
      return normalized.slice(rootPrefix.length + 1);
    }
    if (normalized === rootPrefix) {
      return '';
    }
    return normalized.startsWith('./') ? normalized.slice(2) : normalized;
  }

  private async removeLegacyLightSpecFiles(dirPath: string): Promise<void> {
    if (!(await FileSystemUtils.directoryExists(dirPath))) {
      return;
    }
    await this.walkAndRemove(dirPath);
  }

  private async walkAndRemove(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await this.walkAndRemove(entryPath);
        continue;
      }
      if (this.isLegacyLightSpecFile(entryPath)) {
        await fs.unlink(entryPath);
      }
    }
  }

  private isLegacyLightSpecFile(filePath: string): boolean {
    const normalized = FileSystemUtils.toPosixPath(filePath).toLowerCase();
    return (
      normalized.includes('/lightspec-proposal') ||
      normalized.includes('/lightspec-apply') ||
      normalized.includes('/lightspec-archive') ||
      normalized.includes('/lightspec-context-check') ||
      normalized.includes('/lightspec/proposal') ||
      normalized.includes('/lightspec/apply') ||
      normalized.includes('/lightspec/archive') ||
      normalized.includes('/lightspec/context-check')
    );
  }
}
