import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  getSkillTemplates,
  getCommandTemplates,
} from '../../../src/core/shared/skill-generation.js';
import {
  getExploreSkillTemplate,
  getOpsxExploreCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { loadSchema } from '../../../src/core/artifact-graph/schema.js';

// #1689: 1.9.0 removed openspec/AGENTS.md, which carried the spec index, and
// nothing that replaced it ever named the verb that lists specs. Measured
// across one repo's generated surfaces: `openspec list --json` (the CHANGE
// list) appeared 10 times, `openspec list --specs` zero times. An agent told
// to "read the existing specs first" reaches for the one enumeration verb it
// was taught, gets the in-flight change list, and reports the step complete
// against the wrong object.
const SPEC_INVENTORY = 'openspec list --specs';

// Assertions about the guidance attached to the command are scoped to a window
// after it rather than to the whole body, so an unrelated occurrence elsewhere
// in a long template cannot stand in for the passage under test.
const PASSAGE_WINDOW = 700;

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const defaultSchema = loadSchema(path.join(repoRoot, 'schemas', 'spec-driven', 'schema.yaml'));

function instructionFor(artifactId: string): string {
  const artifact = defaultSchema.artifacts.find(entry => entry.id === artifactId);
  expect(artifact, `spec-driven has no "${artifactId}" artifact`).toBeDefined();
  const instruction = artifact?.instruction;
  expect(instruction, `spec-driven "${artifactId}" has no instruction`).toBeDefined();
  return instruction as string;
}

const exploreBodies: Array<[string, string]> = [
  ['explore skill', getExploreSkillTemplate().instructions],
  ['explore command', getOpsxExploreCommandTemplate().content],
];

describe('spec inventory vocabulary (#1689)', () => {
  it('teaches the spec-inventory verb somewhere in the generated surfaces', () => {
    const bodies = [
      ...getSkillTemplates().map(entry => entry.template.instructions),
      ...getCommandTemplates().map(entry => entry.template.content),
    ];

    const carriers = bodies.filter(body => body.includes(SPEC_INVENTORY));
    expect(
      carriers.length,
      `no generated skill or command names "${SPEC_INVENTORY}", so the spec inventory is unreachable by any path the tool teaches`
    ).toBeGreaterThan(0);
  });

  it('names the spec inventory in explore, where the agent orients', () => {
    for (const [label, body] of exploreBodies) {
      expect(body, label).toContain(SPEC_INVENTORY);
    }
  });

  it('distinguishes the change list from the spec inventory in explore', () => {
    // Naming the command is not enough on its own: `openspec list` defaults to
    // changes, so the two enumerations have to be told apart explicitly.
    for (const [label, body] of exploreBodies) {
      expect(body, label).toContain('openspec list --json');
      expect(body, label).toContain('`openspec list` on its own never shows it');
    }
  });

  it('names the spec inventory where the proposal picks capabilities', () => {
    // "Research existing specs before filling this in" named no command, which
    // is how the Capabilities section ends up inventing a near-duplicate
    // capability instead of reusing the existing one.
    expect(instructionFor('proposal')).toContain(SPEC_INVENTORY);
  });

  it('names the spec inventory where a delta must match an existing path', () => {
    expect(instructionFor('specs')).toContain(SPEC_INVENTORY);
  });

  // A bare `openspec list --specs` reads the local inventory, so under a
  // selected store it confirms a capability path against the wrong root.
  // Every site that names the command must carry the store qualifier with it.
  it('carries the store qualifier everywhere it names the command', () => {
    const sites: Array<[string, string]> = [
      ...exploreBodies,
      ['proposal instruction', instructionFor('proposal')],
      ['specs instruction', instructionFor('specs')],
    ];

    for (const [label, body] of sites) {
      const start = body.indexOf(SPEC_INVENTORY);
      expect(start, label).toBeGreaterThanOrEqual(0);

      // Scoped to the passage that names the command: every explore body
      // already carries the store qualifier in its unrelated capture steps,
      // so a whole-body match would pass even with the qualifier dropped here.
      const passage = body.slice(start, start + PASSAGE_WINDOW);
      expect(passage, `${label} names the command without its store qualifier`).toContain(
        'registered standalone store'
      );
      expect(passage, label).toContain('--store "<id>"');
    }
  });

  // Reading the inventory back by raw path defeats the fix under a store: the
  // ids `list --specs --store <id>` returns are not present under the local
  // `openspec/specs/`, so the read either fails or silently lands on a
  // same-named local capability - the wrong-object failure #1689 is about.
  // `openspec show` resolves against the same root the listing came from.
  it('reads a listed capability with the store-aware command', () => {
    const sites: Array<[string, string]> = [
      ...exploreBodies,
      ['proposal instruction', instructionFor('proposal')],
    ];

    for (const [label, body] of sites) {
      const start = body.indexOf(SPEC_INVENTORY);
      const passage = body.slice(start, start + PASSAGE_WINDOW);
      expect(passage, `${label} does not name a store-aware read`).toContain('openspec show');
      // A change and a spec may share a name; without --type that is an
      // ambiguous-item error rather than the spec the agent asked for.
      expect(passage, `${label} omits the --type spec disambiguator`).toContain('--type spec');
    }
  });
});
