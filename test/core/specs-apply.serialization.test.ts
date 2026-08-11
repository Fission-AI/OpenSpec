import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

const ORIGINAL_REQUIREMENT = [
  '### Requirement: Existing behavior',
  'The project SHALL expose the original behavior.',
  '',
  '#### Scenario: Existing path',
  '- **WHEN** the behavior is exercised',
  '- **THEN** it SHALL remain available',
].join('\n');

const UPDATED_REQUIREMENT = [
  '### Requirement: Existing behavior',
  'The project SHALL expose the updated behavior.',
  '',
  'It SHALL preserve this meaningful internal paragraph break.',
  '',
  '#### Scenario: Existing path',
  '- **WHEN** the behavior is exercised',
  '- **THEN** it SHALL remain available',
].join('\n');

const BASE_SPEC = [
  '# demo Specification',
  '',
  '## Purpose',
  'Demonstrates deterministic serializer output.',
  '',
  '## Requirements',
  ORIGINAL_REQUIREMENT,
].join('\n');

const DELTA_SPEC = ['## MODIFIED Requirements', '', UPDATED_REQUIREMENT, ''].join('\n');

function expectOneFinalLf(content: string): void {
  expect(content.endsWith('\n')).toBe(true);
  expect(content.endsWith('\n\n')).toBe(false);
  expect(content.match(/\n+$/)?.[0]).toBe('\n');
}

describe('spec serialization', () => {
  let tempDir: string;
  let changeDir: string;
  let mainSpecsDir: string;
  let source: string;
  let target: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-eof-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'serializer-test');
    mainSpecsDir = path.join(tempDir, 'openspec', 'specs');
    source = path.join(changeDir, 'specs', 'demo', 'spec.md');
    target = path.join(mainSpecsDir, 'demo', 'spec.md');
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(source, DELTA_SPEC);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function build(targetContent: string) {
    await fs.writeFile(target, targetContent);
    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    return buildUpdatedSpec(update, 'serializer-test', { silent: true });
  }

  it.each([
    ['no terminal newline', BASE_SPEC],
    ['one terminal LF', `${BASE_SPEC}\n`],
    ['multiple terminal LF', `${BASE_SPEC}\n\n\n`],
    ['multiple terminal CRLF', `${BASE_SPEC.replaceAll('\n', '\r\n')}\r\n\r\n`],
  ])('emits one final LF from %s', async (_name, targetContent) => {
    const result = await build(targetContent);

    expectOneFinalLf(result.rebuilt);
    expect(result.rebuilt).toContain(
      'updated behavior.\n\nIt SHALL preserve this meaningful internal paragraph break.'
    );
  });

  it('preserves content after Requirements', async () => {
    const result = await build(`${BASE_SPEC}\n\n## Notes\n\nKeep this later section.\n\n`);

    expectOneFinalLf(result.rebuilt);
    expect(result.rebuilt).toContain('## Notes\n\nKeep this later section.\n');
  });
});
