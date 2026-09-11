import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  generateSkillContent,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';

/**
 * The natural-language phrase a user or agent says for each workflow, as a
 * suffix of `openspec `. Every workflow's skill description must name it so an
 * agent that hears "do an openspec propose" matches the skill instead of
 * hand-building the artifacts with the CLI (issue #1221).
 *
 * Keep in sync with getSkillTemplates(): the coverage test below fails when a
 * workflow is added without a trigger phrase.
 */
const NATURAL_VERB_BY_WORKFLOW: Record<string, string> = {
  explore: 'explore',
  new: 'new change',
  continue: 'continue',
  apply: 'apply',
  update: 'update change',
  ff: 'ff',
  sync: 'sync',
  archive: 'archive',
  'bulk-archive': 'bulk-archive',
  verify: 'verify',
  onboard: 'onboard',
  propose: 'propose',
};

/**
 * CLI commands that do something unrelated to the workflow of the same name.
 * A skill description must never claim these bare phrasings, or the skill would
 * hijack a real CLI invocation. `openspec update` refreshes generated
 * instruction files; it has nothing to do with the update-change workflow.
 */
const RESERVED_CLI_PHRASES = ['"openspec update"'];

function descriptionOf(workflowId: string): string {
  const entry = getSkillTemplates().find(e => e.workflowId === workflowId);
  if (!entry) throw new Error(`no skill template for workflow ${workflowId}`);
  return entry.template.description;
}

describe('workflow verb triggers', () => {
  it('covers every workflow that ships a skill', () => {
    const shipped = getSkillTemplates().map(e => e.workflowId).sort();
    expect(shipped).toEqual(Object.keys(NATURAL_VERB_BY_WORKFLOW).sort());
  });

  it.each(Object.entries(NATURAL_VERB_BY_WORKFLOW))(
    '%s names its natural "openspec" and "opsx" phrasings',
    (workflowId, verb) => {
      const description = descriptionOf(workflowId);
      expect(description).toContain(`"openspec ${verb}"`);
      expect(description).toContain(`"opsx ${workflowId}"`);
    }
  );

  it('never claims a bare CLI phrase that means something else', () => {
    for (const entry of getSkillTemplates()) {
      for (const reserved of RESERVED_CLI_PHRASES) {
        expect(
          entry.template.description,
          `${entry.dirName} claims the reserved CLI phrase ${reserved}`
        ).not.toContain(reserved);
      }
    }
  });

  it('routes each phrase to exactly one skill', () => {
    const seen = new Map<string, string>();
    for (const entry of getSkillTemplates()) {
      for (const phrase of entry.template.description.match(/"(?:openspec|opsx) [a-z- ]+"/g) ?? []) {
        const owner = seen.get(phrase);
        expect(owner, `${phrase} is claimed by both ${owner} and ${entry.dirName}`).toBeUndefined();
        seen.set(phrase, entry.dirName);
      }
    }
  });

  // The description is written into YAML frontmatter as an unquoted plain
  // scalar (see generateSkillContent), so a trigger phrase must not introduce
  // characters that change how the scalar parses.
  it('keeps generated frontmatter parseable with the description intact', () => {
    for (const entry of getSkillTemplates()) {
      const content = generateSkillContent(entry.template, '1.0.0-test');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
      expect(frontmatter, `${entry.dirName} has no frontmatter`).not.toBeNull();

      const parsed = parseYaml(frontmatter![1]) as Record<string, unknown>;
      expect(parsed.name).toBe(entry.template.name);
      expect(parsed.description).toBe(entry.template.description);
    }
  });
});
