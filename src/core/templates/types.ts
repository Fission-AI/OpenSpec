/**
 * Core template types for skills and slash commands.
 */

/**
 * A file shipped beside SKILL.md, per the Agent Skills `references/` folder.
 * The agent reads it only when SKILL.md points it there, so detail that most
 * runs never need stays out of the always-read body.
 */
export interface SkillReference {
  /** Path relative to the skill directory, always `references/<name>.md`. */
  path: string;
  content: string;
}

export interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;
  references?: SkillReference[];
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

export interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}
