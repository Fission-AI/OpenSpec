/**
 * Declared per-skill toolsets, emitted as the Agent Skills standard's
 * `allowed-tools` frontmatter by `generateSkillContent`.
 *
 * One declared set per skill (keyed by the skill's `name`), generated into the
 * frontmatter rather than hand-written per artifact. `Bash` is scoped to the
 * OpenSpec CLI (`Bash(openspec:*)`) for skills that only invoke the CLI;
 * unrestricted `Bash` is declared only for the skills that run arbitrary build
 * or test commands (`apply-change` implements tasks; `onboard` runs a live
 * demo). The declared set is a superset of what each skill body uses, so agents
 * that enforce `allowed-tools` as a strict allowlist never block a needed tool,
 * and agents that ignore it are unaffected.
 */

const CLI = 'Bash(openspec:*)';
const FULL_BASH = 'Bash';

export const SKILL_TOOLS: Record<string, string[]> = {
  'openspec-explore': [CLI, 'Read', 'Grep', 'Glob', 'Write', 'Edit', 'AskUserQuestion', 'TodoWrite'],
  'openspec-new-change': [CLI, 'Read', 'AskUserQuestion', 'TodoWrite'],
  'openspec-continue-change': [CLI, 'Read', 'Write', 'Edit', 'AskUserQuestion', 'TodoWrite'],
  'openspec-apply-change': [FULL_BASH, 'Read', 'Write', 'Edit', 'Grep', 'Glob', 'AskUserQuestion', 'TodoWrite', 'Skill'],
  'openspec-ff-change': [CLI, 'Read', 'Write', 'Edit', 'AskUserQuestion', 'TodoWrite'],
  'openspec-sync-specs': [CLI, 'Read', 'Edit', 'AskUserQuestion', 'TodoWrite'],
  'openspec-archive-change': [CLI, 'Read', 'AskUserQuestion', 'TodoWrite', 'Skill'],
  'openspec-bulk-archive-change': [CLI, 'Read', 'Edit', 'AskUserQuestion', 'TodoWrite'],
  'openspec-verify-change': [CLI, 'Read', 'Grep', 'Glob', 'AskUserQuestion', 'TodoWrite'],
  'openspec-onboard': [FULL_BASH, 'Read', 'Grep', 'Glob', 'Write', 'Edit', 'AskUserQuestion', 'TodoWrite'],
  'openspec-propose': [CLI, 'Read', 'Write', 'Edit', 'AskUserQuestion', 'TodoWrite'],
};

/** YAML-safe `allowed-tools` value for a skill name, or undefined if none declared. */
export function getAllowedToolsFor(skillName: string): string[] | undefined {
  return SKILL_TOOLS[skillName];
}
