/**
 * Template types for the `openspec-beta` skills.
 *
 * A beta skill can ship files beside SKILL.md, per the Agent Skills
 * `references/` folder. The core types stay as they are: today's per-project
 * skills never ship references.
 */
import type { CommandTemplate, SkillTemplate as CoreSkillTemplate } from '../types.js';

/**
 * A file shipped beside SKILL.md. The agent reads it only when SKILL.md points
 * it there, so detail that most runs never need stays out of the always-read body.
 */
export interface SkillReference {
  /** Path relative to the skill directory, always `references/<name>.md`. */
  path: string;
  content: string;
}

export interface SkillTemplate extends CoreSkillTemplate {
  references?: SkillReference[];
}

export type { CommandTemplate };
