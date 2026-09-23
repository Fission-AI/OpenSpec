import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUpdatedSpec,
  findSpecUpdates,
  writeUpdatedSpec,
} from '../../src/core/specs-apply.js';

/**
 * A spec written by a Windows editor, or checked out with core.autocrlf=true,
 * arrives with CRLF endings. Applying a delta must not silently convert the
 * whole file to LF: that turns a one-requirement change into a diff touching
 * every line, which is unreviewable.
 */

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
  '#### Scenario: Existing path',
  '- **WHEN** the behavior is exercised',
  '- **THEN** it SHALL remain available',
].join('\n');

const BASE_SPEC = [
  '# demo Specification',
  '',
  '## Purpose',
  'Demonstrates line-ending preservation.',
  '',
  '## Requirements',
  ORIGINAL_REQUIREMENT,
  '',
].join('\n');

const DELTA_SPEC = ['## MODIFIED Requirements', '', UPDATED_REQUIREMENT, ''].join('\n');

function countEndings(content: string): { crlf: number; loneLf: number } {
  const crlf = content.match(/\r\n/g)?.length ?? 0;
  const loneLf = content.match(/(?<!\r)\n/g)?.length ?? 0;
  return { crlf, loneLf };
}

describe('spec line-ending preservation', () => {
  let tempDir: string;
  let changeDir: string;
  let mainSpecsDir: string;
  let source: string;
  let target: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-eol-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'eol-test');
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

  async function applyTo(targetContent: string): Promise<string> {
    await fs.writeFile(target, targetContent);
    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const built = await buildUpdatedSpec(update, 'eol-test', { silent: true });
    await writeUpdatedSpec(update, built.rebuilt, built.counts, { silent: true });
    return fs.readFile(target, 'utf-8');
  }

  it('keeps a CRLF spec on CRLF', async () => {
    const written = await applyTo(BASE_SPEC.replaceAll('\n', '\r\n'));

    expect(written).toContain('updated behavior.');
    const { crlf, loneLf } = countEndings(written);
    expect(loneLf).toBe(0);
    expect(crlf).toBeGreaterThan(0);
  });

  it('keeps an LF spec on LF', async () => {
    const written = await applyTo(BASE_SPEC);

    expect(written).toContain('updated behavior.');
    const { crlf } = countEndings(written);
    expect(crlf).toBe(0);
  });

  it('writes a brand-new spec with LF', async () => {
    // No existing target to take a convention from; LF is the portable default.
    // A new spec only accepts ADDED requirements.
    await fs.writeFile(
      source,
      ['## ADDED Requirements', '', ORIGINAL_REQUIREMENT, ''].join('\n')
    );
    await fs.rm(target, { force: true });

    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const built = await buildUpdatedSpec(update, 'eol-test', { silent: true });
    await writeUpdatedSpec(update, built.rebuilt, built.counts, { silent: true });

    const written = await fs.readFile(target, 'utf-8');
    expect(countEndings(written).crlf).toBe(0);
  });

  it('normalizes a mixed-ending spec to its dominant ending', async () => {
    const mixed = BASE_SPEC.replaceAll('\n', '\r\n').replace('## Purpose\r\n', '## Purpose\n');
    const written = await applyTo(mixed);

    // CRLF dominates the input, so the output should settle on CRLF throughout
    // rather than preserving the stray LF.
    const { crlf, loneLf } = countEndings(written);
    expect(crlf).toBeGreaterThan(0);
    expect(loneLf).toBe(0);
  });
});
