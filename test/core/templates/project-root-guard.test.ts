import { describe, expect, it } from 'vitest';

import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { getFeedbackSkillTemplate } from '../../../src/core/templates/skill-templates.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';

/**
 * Regression coverage for #1645.
 *
 * Skills and commands are installed once per machine and offered in every
 * repository, including ones that never ran `openspec init`. Nothing in the
 * CLI stops the workflow there - `openspec new change` falls back to an
 * implicit root and creates `openspec/` wherever the agent is standing - so
 * the guard has to live in the instructions themselves, in every workflow.
 */
describe('project root guard', () => {
  it('warns about an uninitialized project in every deployed skill', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain(PROJECT_ROOT_GUARD);
    }
  });

  it('warns about an uninitialized project in every deployed opsx command', () => {
    for (const entry of getCommandContents()) {
      expect(entry.body, entry.id).toContain(PROJECT_ROOT_GUARD);
    }
  });

  // Feedback files a GitHub issue through `openspec feedback`; it never reads
  // or writes a root, so it ships outside both registries and carries neither
  // the store teaching nor this guard.
  it('leaves the rootless feedback skill alone', () => {
    expect(getFeedbackSkillTemplate().instructions).not.toContain('**Project check:**');
  });

  // The CLI contract behind this check - `list` reporting `root: null` instead
  // of fabricating an implicit root - is pinned in
  // test/commands/store-root-selection.test.ts.
  it('names the machine-readable signal rather than a guess', () => {
    expect(PROJECT_ROOT_GUARD).toContain('openspec list --json');
    expect(PROJECT_ROOT_GUARD).toContain('`"root": null`');
  });

  it('hands the decision to the user instead of setting the project up', () => {
    expect(PROJECT_ROOT_GUARD).toContain('stop before writing and ask the user how to proceed');
    expect(PROJECT_ROOT_GUARD).toContain('drop OpenSpec for this request and help them directly');
    expect(PROJECT_ROOT_GUARD).toContain('Do not run `openspec init` until they ask for it');
    expect(PROJECT_ROOT_GUARD).toContain('do not hand-create `openspec/` files');
    expect(PROJECT_ROOT_GUARD).toContain(
      'do not let a command create the root as a side effect'
    );
  });

  // A guard printed after the workflow has already scaffolded a change is no
  // guard at all: it has to precede the first command the workflow runs.
  it('precedes the first openspec command in every deployed skill and command', () => {
    const bodies: Array<[string, string]> = [
      ...getSkillTemplates().map(
        ({ template, dirName }): [string, string] => [
          `skill ${dirName}`,
          generateSkillContent(template, 'PARITY-BASELINE'),
        ]
      ),
      ...getCommandContents().map(
        (entry): [string, string] => [`command ${entry.id}`, entry.body]
      ),
    ];

    for (const [label, body] of bodies) {
      const guardStart = body.indexOf(PROJECT_ROOT_GUARD);
      expect(guardStart, label).toBeGreaterThanOrEqual(0);

      const guardEnd = guardStart + PROJECT_ROOT_GUARD.length;
      const firstCommand = body.indexOf('```bash');
      if (firstCommand >= 0) {
        expect(firstCommand, label).toBeGreaterThan(guardEnd);
      }
    }
  });

  // The other half of #1645: a host picks skills by description, so a
  // description that never says "OpenSpec" reads as a generic offer to
  // explore or propose and wins in repositories that have no OpenSpec at all.
  it('scopes every deployed skill description to OpenSpec', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      expect(template.description, dirName).toContain('OpenSpec');
    }
  });
});
