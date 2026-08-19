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
});
