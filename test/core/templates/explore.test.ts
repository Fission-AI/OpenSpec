import { describe, expect, it } from 'vitest';

import {
  getExploreSkillTemplate,
  getOpsxExploreCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

const skill = getExploreSkillTemplate();
const command = getOpsxExploreCommandTemplate();

// Both delivery surfaces must carry the same contract; every behavioral
// assertion below runs against each body.
const bodies: Array<[string, string]> = [
  ['skill', skill.instructions],
  ['command', command.content],
];

describe('explore templates', () => {
  // Regression for #696: explore never loaded the project's declared
  // context, so it reasoned without the tech stack, conventions, and
  // rules every artifact-creating workflow already receives.
  it('loads project context from config.yaml at startup (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec/config.yaml');
      expect(body, label).toContain('`context` describes the project');
      expect(body, label).toContain('`rules` lists per-artifact constraints');
    }
  });

  it('resolves config.yaml through the reported root rather than assuming a repo-local path (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec list --json');
      expect(body, label).toContain('<root.path>/openspec/config.yaml');
      expect(body, label).toContain('root.path');
    }
  });

  it('treats project context as constraints, not content to echo back (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'They are background for you, not material to recite back to the user.'
      );
    }
  });

  it('tolerates projects with no config.yaml', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('skip this if the file does not exist');
    }
  });
});
