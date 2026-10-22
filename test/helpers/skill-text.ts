import { ALL_WORKFLOWS } from '../../src/core/profiles.js';
import { resolveOptionalWorkflows } from '../../src/core/templates/optional-workflow.js';
import type { SkillTemplate } from '../../src/core/templates/types.js';

/**
 * Everything an agent can read from a skill: SKILL.md's body followed by each
 * `references/` file, as authored. A rule that moved from SKILL.md into a
 * reference is still part of the skill.
 */
export function skillSource(template: SkillTemplate): string {
  return [
    template.instructions,
    ...(template.references ?? []).map((reference) => reference.content),
  ].join('\n\n');
}

/** A template with every optional-workflow block resolved, as a full profile deploys it. */
export function deployedTemplate(
  template: SkillTemplate,
  installed: Iterable<string> = ALL_WORKFLOWS
): SkillTemplate {
  const set = new Set<string>(installed);
  return {
    ...template,
    instructions: resolveOptionalWorkflows(template.instructions, set),
    references: template.references?.map((reference) => ({
      ...reference,
      content: resolveOptionalWorkflows(reference.content, set),
    })),
  };
}
