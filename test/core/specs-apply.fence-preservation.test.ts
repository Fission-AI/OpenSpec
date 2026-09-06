import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

/**
 * The blank-line normalisation that tidies the seams between the rebuilt
 * slices used to run over the whole document, so it also rewrote the inside of
 * fenced code blocks. A requirement documenting a sample with two consecutive
 * blank lines had that sample silently edited on every archive, which matters
 * for whitespace-significant content (YAML block scalars, Python, expected
 * output). Every other structural pass in this module is fence-aware; this one
 * now is too.
 */
describe('buildUpdatedSpec (code fence preservation)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-fence-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const MAIN_SPEC = [
    '# billing Specification',
    '',
    '## Purpose',
    'Defines how billing behaves for customers and operators.',
    '',
    '## Requirements',
    '### Requirement: Invoice Generation',
    'The system SHALL generate an invoice for every completed billing period.',
    '',
    '#### Scenario: Period closes',
    '- **WHEN** a billing period closes',
    '- **THEN** an invoice is generated',
    '',
  ].join('\n');

  async function build(deltaBody: string, mainSpec = MAIN_SPEC) {
    const specsRoot = path.join(tempDir, 'openspec', 'specs');
    const specsDir = path.join(specsRoot, 'billing');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'spec.md'), mainSpec);
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    return buildUpdatedSpec(update, 'c', { silent: true });
  }

  const withFence = (...fenceLines: string[]) =>
    [
      '## ADDED Requirements',
      '### Requirement: Config Example',
      'The system SHALL document the config file.',
      '',
      '#### Scenario: Sample config',
      '- **WHEN** an operator reads the spec',
      '- **THEN** they see:',
      '',
      ...fenceLines,
    ].join('\n');

  it('preserves two blank lines inside a backtick fence', async () => {
    const built = await build(withFence('```yaml', 'a: 1', '', '', 'b: 2', '```'));
    expect(built.rebuilt).toContain('a: 1\n\n\nb: 2');
  });

  it('preserves a longer blank run inside a fence', async () => {
    const built = await build(withFence('```yaml', 'a: 1', '', '', '', '', 'b: 2', '```'));
    expect(built.rebuilt).toContain('a: 1\n\n\n\n\nb: 2');
  });

  it('preserves blank lines inside a tilde fence', async () => {
    const built = await build(withFence('~~~yaml', 'a: 1', '', '', 'b: 2', '~~~'));
    expect(built.rebuilt).toContain('a: 1\n\n\nb: 2');
  });

  it('preserves indentation-sensitive content inside a fence', async () => {
    const built = await build(
      withFence('```python', 'def a():', '    pass', '', '', 'def b():', '    pass', '```')
    );
    expect(built.rebuilt).toContain('def a():\n    pass\n\n\ndef b():');
  });

  it('still collapses blank runs outside fences', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Spaced Out',
        'The system SHALL still be normalised outside fences.',
        '',
        '',
        '',
        '#### Scenario: Normalised',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n')
    );
    expect(built.rebuilt).not.toMatch(/\n{3,}/);
  });

  it('leaves a spec with no fences byte-identical to the previous behaviour', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Plain',
        'The system SHALL be plain.',
        '',
        '#### Scenario: Plain',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n')
    );
    expect(built.rebuilt).toBe(
      [
        '# billing Specification',
        '',
        '## Purpose',
        'Defines how billing behaves for customers and operators.',
        '',
        '## Requirements',
        '',
        '### Requirement: Invoice Generation',
        'The system SHALL generate an invoice for every completed billing period.',
        '',
        '#### Scenario: Period closes',
        '- **WHEN** a billing period closes',
        '- **THEN** an invoice is generated',
        '',
        '### Requirement: Plain',
        'The system SHALL be plain.',
        '',
        '#### Scenario: Plain',
        '- **WHEN** a',
        '- **THEN** b',
        '',
      ].join('\n')
    );
  });

  it('does not collapse a run of whitespace-only lines, matching the old regex', async () => {
    // The replaced `/\n{3,}/` only matched truly empty lines, so a line of
    // spaces was never a collapse boundary. Keep that exact behaviour.
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Spacey',
        'The system SHALL keep whitespace-only lines as before.',
        '',
        '   ',
        '',
        '#### Scenario: Spacey',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n')
    );
    expect(built.rebuilt).toContain('   ');
  });

  it('preserves fenced blank lines carried in from the existing main spec', async () => {
    const mainWithFence = [
      '# billing Specification',
      '',
      '## Purpose',
      'Defines how billing behaves for customers and operators.',
      '',
      '## Requirements',
      '### Requirement: Existing Sample',
      'The system SHALL document the sample.',
      '',
      '#### Scenario: Sample',
      '- **THEN** they see:',
      '',
      '```yaml',
      'x: 1',
      '',
      '',
      'y: 2',
      '```',
      '',
    ].join('\n');

    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Unrelated',
        'The system SHALL add something unrelated.',
        '',
        '#### Scenario: Unrelated',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n'),
      mainWithFence
    );

    expect(built.rebuilt).toContain('x: 1\n\n\ny: 2');
  });
});
