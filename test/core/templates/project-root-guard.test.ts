import { describe, expect, it } from 'vitest';

import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
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
  // Both surfaces, rendered exactly as they ship.
  function renderedBodies(): Array<[string, string]> {
    return [
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
  }

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
    // A selected store is a root, so the check has to carry the flag or it
    // answers a question about the wrong directory.
    expect(PROJECT_ROOT_GUARD).toContain('with `--store <id>` when a store is selected');
    expect(PROJECT_ROOT_GUARD).toContain('`"root": null`');
    // An agent that reads the non-zero exit as a broken CLI is one step from
    // hand-creating `openspec/` instead, which is the failure being guarded.
    expect(PROJECT_ROOT_GUARD).toContain('also exits non-zero, which is that answer rather than a broken CLI');
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
  // guard at all, so nothing that runs a command or writes an artifact may
  // appear before it. Asserting on the text *preceding* the guard catches a
  // stray write wherever it sits - inside a fence or in bare prose - which
  // looking only at the first fenced block would miss.
  it('precedes every command block and write instruction it guards', () => {
    const writeMarkers = [
      '```', // any command block, whatever the language tag
      'openspec new change',
      'openspec archive',
      'openspec sync',
      'openspec instructions',
      'openspec validate',
    ];

    for (const [label, body] of renderedBodies()) {
      const guardStart = body.indexOf(PROJECT_ROOT_GUARD);
      expect(guardStart, label).toBeGreaterThanOrEqual(0);

      const beforeGuard = body.slice(0, guardStart);
      for (const marker of writeMarkers) {
        expect(beforeGuard, `${label} runs "${marker}" before the project check`).not.toContain(
          marker
        );
      }
    }
  });

  // The guard is worthless if it sits at the end of a long workflow, so pin
  // where it lives: directly under the store-selection guidance, in the
  // header every workflow reads before it starts.
  it('sits directly under the store-selection guidance', () => {
    for (const [label, body] of renderedBodies()) {
      const storeStart = body.indexOf(STORE_SELECTION_GUIDANCE);
      expect(storeStart, label).toBeGreaterThanOrEqual(0);
      expect(body.indexOf(PROJECT_ROOT_GUARD), label).toBe(
        storeStart + STORE_SELECTION_GUIDANCE.length + '\n\n'.length
      );
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
