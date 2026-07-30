import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

// A requirement block runs to the next header the parser RECOGNISES, so a
// heading it does not - one indented by the 0-3 spaces CommonMark allows, or a
// plain `### Notes` - is absorbed into the requirement above it. Removing that
// requirement deleted the absorbed content too. Silently: nothing counted it, so
// nothing warned, and the spec that remained still validated.
describe('buildUpdatedSpec (content absorbed into a removed requirement)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-salvage-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function rebuild(foreign: string[], delta?: string[]): Promise<string> {
    const specsDir = path.join(tempDir, 'openspec', 'specs', 'demo');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'drop');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'demo'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, 'spec.md'),
      [
        '# demo Specification',
        '',
        '## Purpose',
        'Why this exists.',
        '',
        '## Requirements',
        '',
        '### Requirement: Doomed',
        'The system SHALL do the doomed thing.',
        '',
        '#### Scenario: One',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        ...foreign,
        '',
        '### Requirement: Survivor',
        'The system SHALL survive.',
        '',
        '#### Scenario: Two',
        '- **WHEN** c',
        '- **THEN** d',
        '',
      ].join('\n')
    );
    await fs.writeFile(
      path.join(changeDir, 'specs', 'demo', 'spec.md'),
      (
        delta ?? [
          '# demo - Changes',
          '',
          '## REMOVED Requirements',
          '',
          '### Requirement: Doomed',
          '**Reason**: Superseded.',
          '**Migration**: None.',
          '',
        ]
      ).join('\n')
    );
    const [update] = await findSpecUpdates(changeDir, path.join(tempDir, 'openspec', 'specs'));
    const built = await buildUpdatedSpec(update, 'drop', { silent: true });
    return built.rebuilt;
  }

  it.each([
    { what: 'an indented requirement header', foreign: ['   ### Requirement: Audit trail', '   The system SHALL retain it.'] },
    { what: 'a heading that is not a requirement', foreign: ['### Notes', 'Kept by hand, never delete.'] },
    { what: 'an indented non-requirement heading', foreign: ['  ### Notes', 'Indented, kept by hand.'] },
  ])('keeps $what when the requirement above it is removed', async ({ foreign }) => {
    const rebuilt = await rebuild(foreign);
    for (const line of foreign) {
      expect(rebuilt).toContain(line.trim());
    }
    // The removal itself still happened, and the neighbour is untouched.
    expect(rebuilt).not.toContain('The system SHALL do the doomed thing.');
    expect(rebuilt).toContain('### Requirement: Survivor');
  });

  it("keeps a requirement's own scenarios with it when it is removed", async () => {
    // `####` must NOT count as a boundary, or every requirement would be severed
    // from its scenarios and they would survive as orphans.
    const rebuilt = await rebuild([]);
    expect(rebuilt).not.toContain('#### Scenario: One');
    expect(rebuilt).toContain('#### Scenario: Two');
  });

  // A RENAMED block is the original with its header swapped, so it still holds
  // the absorbed content. A MODIFIED one is rebuilt from the delta and does not
  // - dropping it there loses the content exactly as removing the requirement
  // would, which the first version of this fix missed.
  it('keeps absorbed content when the requirement above it is MODIFIED', async () => {
    const rebuilt = await rebuild(
      ['   ### Notes', '   Kept by hand, never delete.'],
      [
        '# demo - Changes',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Doomed',
        'The system SHALL do the doomed thing, now better.',
        '',
        '#### Scenario: One',
        '- **WHEN** a',
        '- **THEN** b',
        '',
      ]
    );
    expect(rebuilt).toContain('Kept by hand, never delete.');
    // Exactly once - a rename path that already carries the tail must not
    // duplicate it.
    expect(rebuilt.match(/Kept by hand/g)).toHaveLength(1);
    expect(rebuilt).toContain('now better');
    // And it stays where the author put it, not appended at the end.
    expect(rebuilt.indexOf('Kept by hand')).toBeLessThan(rebuilt.indexOf('Requirement: Survivor'));
  });

  it('does not duplicate absorbed content when the requirement is RENAMED', async () => {
    const rebuilt = await rebuild(
      ['   ### Notes', '   Kept by hand, never delete.'],
      [
        '# demo - Changes',
        '',
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: Doomed`',
        '- TO: `### Requirement: Renamed`',
        '',
      ]
    );
    expect(rebuilt.match(/Kept by hand/g)).toHaveLength(1);
    expect(rebuilt).toContain('### Requirement: Renamed');
  });

  // Whether a note survived cannot be decided by looking for its text in the
  // result: two requirements may carry the same note, and a containment check
  // drops the second copy. Survival is decided by whether the block came
  // through untouched, which is a question about identity, not text.
  it('keeps both copies when two removed requirements carry the same note', async () => {
    const specsDir = path.join(tempDir, 'openspec', 'specs', 'demo');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'drop');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'demo'), { recursive: true });
    const note = ['   ### Notes', '   Owned by payments.'];
    await fs.writeFile(
      path.join(specsDir, 'spec.md'),
      [
        '# demo Specification',
        '',
        '## Purpose',
        'Why this exists.',
        '',
        '## Requirements',
        '',
        '### Requirement: Alpha',
        'The system SHALL alpha.',
        '',
        '#### Scenario: A',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        ...note,
        '',
        '### Requirement: Beta',
        'The system SHALL beta.',
        '',
        '#### Scenario: B',
        '- **WHEN** c',
        '- **THEN** d',
        '',
        ...note,
        '',
        '### Requirement: Gamma',
        'The system SHALL gamma.',
        '',
        '#### Scenario: G',
        '- **WHEN** e',
        '- **THEN** f',
        '',
      ].join('\n')
    );
    await fs.writeFile(
      path.join(changeDir, 'specs', 'demo', 'spec.md'),
      [
        '# demo - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Alpha',
        '**Reason**: x.',
        '**Migration**: None.',
        '',
        '### Requirement: Beta',
        '**Reason**: y.',
        '**Migration**: None.',
        '',
      ].join('\n')
    );
    const [update] = await findSpecUpdates(changeDir, path.join(tempDir, 'openspec', 'specs'));
    const { rebuilt } = await buildUpdatedSpec(update, 'drop', { silent: true });

    // Two notes were written; two must survive.
    expect(rebuilt.match(/### Notes/g)).toHaveLength(2);
    expect(rebuilt).toContain('### Requirement: Gamma');
  });

  it('does not duplicate a note when its requirement is untouched', async () => {
    // An untouched block is the original object and still carries its note, so
    // re-inserting would double it.
    const rebuilt = await rebuild(
      ['   ### Notes', '   Kept by hand, never delete.'],
      [
        '# demo - Changes',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Fresh',
        'The system SHALL be fresh.',
        '',
        '#### Scenario: F',
        '- **WHEN** a',
        '- **THEN** b',
        '',
      ]
    );
    expect(rebuilt.match(/Kept by hand/g)).toHaveLength(1);
  });
});
