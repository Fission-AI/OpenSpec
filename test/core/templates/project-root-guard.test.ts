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
  /** One bullet of the no-root branch table, from its anchor to the next. */
  function branch(anchor: string): string {
    const start = PROJECT_ROOT_GUARD.indexOf(anchor);
    expect(start, `${anchor} is missing`).toBeGreaterThanOrEqual(0);
    const next = PROJECT_ROOT_GUARD.indexOf('\n- ', start);
    return PROJECT_ROOT_GUARD.slice(start, next === -1 ? undefined : next);
  }

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

  // #1645 asks for the workflow to get out of the way, not to interrogate the
  // user: "if not exist it can go through the normal general propose not the
  // openspec". So the two ways of arriving here get opposite answers, and both
  // have to be pinned or the guard drifts back to one of them.
  it('gets out of the way when it selected itself', () => {
    const autoSelected = branch('**Auto-selected**');

    expect(autoSelected).toContain('without the user naming OpenSpec');
    expect(autoSelected).toContain('answer the request normally');
    // The reported bug is being asked to choose a setup path for a project the
    // user never said was an OpenSpec project.
    expect(autoSelected).toContain('Do not ask them to set anything up');
    expect(autoSelected).not.toContain('openspec init');
    expect(autoSelected).not.toContain('--store <id>');
  });

  it('asks when the user named OpenSpec, this skill, or its command', () => {
    const explicit = branch('**Explicit OpenSpec request**');

    expect(explicit).toContain('named OpenSpec, named this skill, or ran its slash command');
    expect(explicit).toContain('Stop before writing and ask how to proceed');
    expect(explicit).toContain('`openspec init`');
    expect(explicit).toContain('`--store <id>`');
    expect(explicit).toContain('continue without OpenSpec');
    expect(explicit).toContain('Wait for their answer');
  });

  // A slash command is an explicit invocation, so the ask branch is the one
  // that applies there. The guard ships whole into command files, which is what
  // keeps that branch reachable from a command surface.
  it('carries the explicit branch into every deployed opsx command', () => {
    for (const [label, body] of renderedBodies()) {
      if (!label.startsWith('command ')) continue;
      expect(body, label).toContain('**Explicit OpenSpec request**');
      expect(body, label).toContain('Stop before writing and ask how to proceed');
    }
  });

  it('never lets any branch create the root as a side effect', () => {
    expect(PROJECT_ROOT_GUARD).toContain('In both branches, never create the root as a side effect');
    expect(PROJECT_ROOT_GUARD).toContain('do not run `openspec init` until the user asks for it');
    expect(PROJECT_ROOT_GUARD).toContain('do not hand-create `openspec/` files');
    expect(PROJECT_ROOT_GUARD).toContain('do not let a command create it');
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
