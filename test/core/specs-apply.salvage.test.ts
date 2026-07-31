import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

// A requirement block runs to the next header the parser RECOGNISES, so a note
// written below it - indented by the 0-3 spaces CommonMark allows, say - is
// absorbed into that requirement and goes when the requirement is rewritten or
// removed. The loss was silent: nothing counted the note, so nothing said a
// word, and the spec left behind still validated.
//
// It is reported, not moved. A heading-shaped line inside a scenario (a
// `# comment`, a markdown example) is indistinguishable from a real note by any
// line-based rule, and relocating one of those rewrites the spec wrongly -
// resurrecting superseded text on MODIFIED, and growing the file on every
// re-apply. A wrong warning costs a line of output instead.
describe('buildUpdatedSpec (content absorbed into a requirement)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-orphan-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function build(specBody: string[], deltaBody: string[]) {
    const specsDir = path.join(tempDir, 'openspec', 'specs', 'demo');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'demo'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'spec.md'), specBody.join('\n'));
    await fs.writeFile(path.join(changeDir, 'specs', 'demo', 'spec.md'), deltaBody.join('\n'));
    const [update] = await findSpecUpdates(changeDir, path.join(tempDir, 'openspec', 'specs'));
    return buildUpdatedSpec(update, 'c', { silent: true });
  }

  const REQUIREMENT = [
    '### Requirement: Target',
    'The system SHALL target.',
    '',
    '#### Scenario: S',
    '- **WHEN** a',
    '- **THEN** b',
  ];
  const SPEC = (middle: string[]) => [
    '# demo Specification',
    '',
    '## Purpose',
    'Why this exists.',
    '',
    '## Requirements',
    '',
    ...REQUIREMENT,
    '',
    ...middle,
    '',
    '### Requirement: Other',
    'The system SHALL other.',
    '',
    '#### Scenario: T',
    '- **WHEN** c',
    '- **THEN** d',
    '',
  ];
  const REMOVE = [
    '# demo - Changes',
    '',
    '## REMOVED Requirements',
    '',
    '### Requirement: Target',
    '**Reason**: x.',
    '**Migration**: None.',
    '',
  ];

  it.each([
    { what: 'an indented note', line: '   ### Notes' },
    { what: 'an unindented note', line: '### Notes' },
    { what: 'an indented requirement header', line: '   ### Requirement: Absorbed' },
  ])('warns that $what goes with the requirement it sits in', async ({ line }) => {
    const { warnings } = await build(SPEC([line, 'Kept by hand.']), REMOVE);
    expect(warnings.join('\n')).toContain(line.trim());
    expect(warnings.join('\n')).toContain('goes with it');
  });

  it('says nothing when a requirement holds only its own content', async () => {
    const { warnings } = await build(SPEC([]), REMOVE);
    expect(warnings.join('\n')).not.toContain('goes with it');
  });

  it('does not warn about a requirement left untouched', async () => {
    // The note sits in `Target`, which this delta does not mention.
    const { warnings } = await build(SPEC(['   ### Notes', 'Kept by hand.']), [
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
    ]);
    expect(warnings.join('\n')).not.toContain('goes with it');
  });

  it('ignores a heading inside a fenced example', async () => {
    const { warnings } = await build(
      SPEC(['```markdown', '### Requirement: Example', '```']),
      REMOVE
    );
    expect(warnings.join('\n')).not.toContain('goes with it');
  });

  it("leaves a requirement's own scenarios alone", async () => {
    // `####` must not count, or every requirement would look like it holds
    // foreign content.
    const { warnings } = await build(SPEC([]), REMOVE);
    expect(warnings.join('\n')).not.toContain('Scenario');
  });

  it('rewrites the spec exactly as before - nothing is moved', async () => {
    const { rebuilt } = await build(SPEC(['   ### Notes', 'Kept by hand.']), REMOVE);
    // The note is reported, not relocated: it goes with the requirement, which
    // is the pre-existing behaviour this warning exists to surface.
    expect(rebuilt).not.toContain('Kept by hand.');
    expect(rebuilt).toContain('### Requirement: Other');
  });
});
