import { describe, expect, it } from 'vitest';

import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';

/**
 * A skill says the same thing to every user, whatever workflow profile they
 * chose. That is what lets the one static copy published in `skills/` be the
 * file the CLI installs. The workflow list only decides which skills are
 * returned.
 */
const WORKFLOW_LISTS: Array<[string, readonly string[]]> = [
  ['the core set', ['propose', 'explore', 'apply', 'update', 'sync', 'archive']],
  ['all twelve', ALL_WORKFLOWS],
  ['a small custom set', ['explore', 'update']],
];

describe('one skill text for every workflow profile', () => {
  const unfiltered = new Map(getSkillTemplates().map((entry) => [entry.dirName, entry]));

  it('covers all twelve workflows without a filter', () => {
    expect([...unfiltered.values()].map((entry) => entry.workflowId).sort()).toEqual(
      [...ALL_WORKFLOWS].sort()
    );
  });

  it.each(WORKFLOW_LISTS)('returns only the listed skills for %s, each with the unfiltered text', (_label, workflows) => {
    const selected = getSkillTemplates(workflows);

    expect(selected.map((entry) => entry.workflowId).sort()).toEqual([...workflows].sort());
    for (const { dirName, template } of selected) {
      const reference = unfiltered.get(dirName)!.template;
      expect(template.instructions, dirName).toBe(reference.instructions);
      expect(generateSkillContent(template, 'TEST'), dirName).toBe(
        generateSkillContent(reference, 'TEST')
      );
    }
  });

  it('leaves no conditional marker in any generated text', () => {
    for (const [, workflows] of [...WORKFLOW_LISTS, ['unfiltered', undefined] as const]) {
      for (const { dirName, template } of getSkillTemplates(workflows)) {
        expect(generateSkillContent(template, 'TEST'), dirName).not.toContain('[[opsx:');
      }
      for (const { id, body } of getCommandContents(workflows)) {
        expect(body, id).not.toContain('[[opsx:');
      }
    }
  });
});
