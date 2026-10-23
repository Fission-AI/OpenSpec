import { describe, expect, it } from 'vitest';

import { BEFORE_YOU_START } from '../../../src/core/templates/workflows/references.js';
import { getFeedbackSkillTemplate } from '../../../src/core/templates/skill-templates.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';

/**
 * Regression coverage for #1645.
 *
 * Skills are offered in every repository the agent opens, including ones that
 * never ran `openspec init`. Nothing in the CLI stops the workflow there -
 * `openspec new change` falls back to an implicit root and creates `openspec/`
 * wherever the agent is standing - so the check lives in every workflow's
 * "Before you start" block.
 */
describe('project root guard', () => {
  /** One bullet of the block, from its bold label to the next bullet. */
  function bullet(label: string): string {
    const start = BEFORE_YOU_START.indexOf(`- **${label}**`);
    expect(start, `${label} bullet is missing`).toBeGreaterThanOrEqual(0);
    const next = BEFORE_YOU_START.indexOf('\n- ', start + 1);
    return BEFORE_YOU_START.slice(start, next === -1 ? undefined : next);
  }

  function renderedBodies(): Array<[string, string]> {
    return [
      ...getSkillTemplates().map(
        ({ template, dirName }): [string, string] => [
          `skill ${dirName}`,
          generateSkillContent(template, 'PARITY-BASELINE'),
        ]
      ),
      ...getCommandContents().map((entry): [string, string] => [`command ${entry.id}`, entry.body]),
    ];
  }

  it('carries the check in every deployed skill and command', () => {
    for (const [label, body] of renderedBodies()) {
      expect(body, label).toContain(BEFORE_YOU_START);
    }
  });

  // Feedback files a GitHub issue; it never reads or writes a root.
  it('leaves the rootless feedback skill alone', () => {
    expect(getFeedbackSkillTemplate().instructions).not.toContain('**Before you start**');
  });

  // The CLI contract behind this check - `list` reporting `root: null` instead
  // of fabricating an implicit root - is pinned in
  // test/commands/store-root-selection.test.ts.
  it('names the machine-readable signal rather than a guess', () => {
    const check = bullet('No OpenSpec here:');
    expect(check).toContain('run `openspec list --json`');
    expect(check).toContain('`"root": null`');
    // Reading the non-zero exit as a broken CLI is one step from hand-creating
    // `openspec/`, which is the failure being guarded.
    expect(check).toContain('that is the answer, not a broken CLI');
  });

  // A selected store is the root, so the check runs against it.
  it('keeps a selected store on the check', () => {
    expect(bullet('Store:')).toContain('add `--store <id>` to every');
    expect(bullet('Store:')).toContain('`list`');
  });

  // #1645: a workflow the agent picked for itself gets out of the way; one the
  // user asked for asks. Both answers are pinned, or the guard drifts to one.
  it('gets out of the way when it selected itself, and asks when the user named OpenSpec', () => {
    const check = bullet('No OpenSpec here:');
    expect(check).toContain('If you picked this workflow yourself, set OpenSpec aside and answer the request normally');
    expect(check).toContain('If the user asked for OpenSpec, ask whether to set this project up (`openspec init`)');
    expect(check).toContain('use a store they have (`--store <id>`)');
    expect(check).toContain('continue without OpenSpec');
    expect(check).toContain('wait for the answer');
  });

  it('never lets any branch create the root as a side effect', () => {
    const check = bullet('No OpenSpec here:');
    expect(check).toContain('Create nothing');
    expect(check).toContain('no `openspec init`');
    expect(check).toContain('no hand-made `openspec/` files');
    expect(check).toContain('no command that would make them');
  });

  // A project that declares a store this machine cannot resolve also reports
  // `root: null`. Treating it as uninitialized would offer `openspec init` in a
  // project that is already set up; the message prefixes tell them apart.
  it('does not mistake an unresolvable declared store for an uninitialized project', () => {
    const unresolved = bullet('Unresolved store:');
    expect(unresolved).toContain('starts with `Declared in` or `Invalid store declaration in`');
    expect(unresolved).toContain("Show that error's `message` and `fix`, and stop");
  });

  // A check printed after the workflow has already scaffolded a change is no
  // check, so nothing that runs a command or writes an artifact may come first.
  it('precedes every command block and write instruction it guards', () => {
    const writeMarkers = ['```', 'openspec new change', 'openspec archive', 'openspec instructions', 'openspec validate'];
    for (const [label, body] of renderedBodies()) {
      const guardStart = body.indexOf(BEFORE_YOU_START);
      expect(guardStart, label).toBeGreaterThanOrEqual(0);
      const frontmatter = /^---\n[\s\S]*?\n---\n/.exec(body)?.[0] ?? '';
      const beforeGuard = body.slice(frontmatter.length, guardStart);
      for (const marker of writeMarkers) {
        expect(beforeGuard, `${label} runs "${marker}" before the project check`).not.toContain(marker);
      }
    }
  });

  // A host picks skills by description; one that never says "OpenSpec" wins in
  // repositories that have no OpenSpec at all.
  it('scopes every deployed skill description to OpenSpec', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      expect(template.description, dirName).toContain('OpenSpec');
    }
  });
});
