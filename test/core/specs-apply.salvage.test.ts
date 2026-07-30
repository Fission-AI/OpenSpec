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

  async function rebuild(foreign: string[]): Promise<string> {
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
      [
        '# demo - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Doomed',
        '**Reason**: Superseded.',
        '**Migration**: None.',
        '',
      ].join('\n')
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
});
