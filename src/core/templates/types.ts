/**
 * Core template types for skills and slash commands.
 */

export interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  /**
   * Detail kept out of SKILL.md: each entry is installed as
   * `references/<file>` beside it, and SKILL.md says when to read it.
   */
  references?: Record<string, string>;
}

export interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}
