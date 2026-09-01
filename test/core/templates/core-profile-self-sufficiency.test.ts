import { describe, expect, it } from 'vitest';
import { CORE_WORKFLOWS } from '../../../src/core/profiles.js';
import { getSkillTemplates } from '../../../src/core/shared/index.js';
import { transformToSkillReferences } from '../../../src/utils/command-references.js';

describe('core profile skill self-sufficiency', () => {
  it('does not advertise new or continue skills that the core profile does not install', () => {
    const rendered = getSkillTemplates(CORE_WORKFLOWS)
      .map(({ template }) => transformToSkillReferences(template.instructions))
      .join('\n');

    expect(rendered).not.toContain('/openspec-new-change');
    expect(rendered).not.toContain('/openspec-continue-change');
  });
});
