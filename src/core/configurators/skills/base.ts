import os from 'os';
import path from 'path';
import { FileSystemUtils } from '../../../utils/file-system.js';
import { TemplateManager, AgentSkillId } from '../../templates/index.js';
import { LIGHTSPEC_MARKERS } from '../../config.js';

export interface AgentSkillTarget {
  id: AgentSkillId;
  path: string;
  kind: 'skill';
}

export type SkillInstallLocation = 'project' | 'home';

const ALL_SKILL_IDS: AgentSkillId[] = ['proposal', 'apply', 'archive', 'context-check'];

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

export const AGENT_SKILL_TOOL_IDS = Object.freeze(
  Object.keys(TOOL_SKILL_ROOTS)
);

const TOOL_BODY_SUFFIX: Partial<Record<string, string>> = {
  factory: '\n\n$ARGUMENTS',
};

export class AgentSkillConfigurator {
  readonly toolId: string;
  readonly isAvailable: boolean;

  private installLocation: SkillInstallLocation = 'project';

  constructor(toolId: string, isAvailable = true) {
    this.toolId = toolId;
    this.isAvailable = isAvailable;

    if (!TOOL_SKILL_ROOTS[this.toolId]) {
      throw new Error(`No skill root directory configured for tool '${this.toolId}'`);
    }
  }

  setInstallLocation(location: SkillInstallLocation): void {
    this.installLocation = location;
  }

  getTargets(): AgentSkillTarget[] {
    return ALL_SKILL_IDS.map((id) => ({
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
        const frontmatter = TemplateManager.getAgentSkillFrontmatter(target.id).trim();
        const content = this.buildSkillFile(frontmatter, body);
        await FileSystemUtils.writeFile(filePath, content);
      }

      createdOrUpdated.push(target.path);
    }

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

    return updated;
  }

  protected getBody(id: AgentSkillId): string {
    const baseBody = TemplateManager.getAgentSkillBody(id).trim();
    const suffix = TOOL_BODY_SUFFIX[this.toolId] ?? '';
    return `${baseBody}${suffix}`;
  }

  resolveAbsolutePath(projectPath: string, id: AgentSkillId): string {
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

  private getRelativeSkillPath(id: AgentSkillId): string {
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

  private getSkillName(id: AgentSkillId): string {
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

}
