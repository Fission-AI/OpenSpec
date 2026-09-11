import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  describeNestedChange,
  findNestedChanges,
  findNestedChangesIn,
} from '../../src/utils/nested-change.js';

describe('nested change detection (#1846)', () => {
  let changesDir: string;

  beforeEach(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-nested-'));
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(path.dirname(path.dirname(changesDir)), { recursive: true, force: true });
  });

  async function write(relativePath: string, contents = 'x'): Promise<void> {
    const target = path.join(changesDir, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents);
  }

  describe('reports a namespace folder', () => {
    it.each([
      ['proposal.md'],
      ['tasks.md'],
      ['design.md'],
      ['.openspec.yaml'],
    ])('when the nested directory carries %s', async (marker) => {
      await write(path.join('mobile', 'refresh-token', marker));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toEqual({
        name: 'mobile',
        nested: ['mobile/refresh-token'],
      });
    });

    it('lists every nested change, sorted', async () => {
      await write(path.join('mobile', 'refresh-token', 'proposal.md'));
      await write(path.join('mobile', 'add-login', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toEqual({
        name: 'mobile',
        nested: ['mobile/add-login', 'mobile/refresh-token'],
      });
    });

    it('descends through more than one namespace level', async () => {
      await write(path.join('mobile', 'ios', 'refresh-token', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toEqual({
        name: 'mobile',
        nested: ['mobile/ios/refresh-token'],
      });
    });

    it('never looks past a nested directory that is itself a change', async () => {
      // A change carries its own tree; a `proposal.md` sitting inside it (for
      // example an example fixture) must not read as a further nesting level.
      await write(path.join('mobile', 'refresh-token', 'proposal.md'));
      await write(path.join('mobile', 'refresh-token', 'fixtures', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toEqual({
        name: 'mobile',
        nested: ['mobile/refresh-token'],
      });
    });

    it('recognises a nested change that has only delta specs', async () => {
      // A nested change is always hand-made (`new change` rejects a separator),
      // and "mkdir the tree, write the deltas first" is how someone gets here.
      await write(path.join('mobile', 'refresh-token', 'specs', 'auth', 'spec.md'));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toEqual({
        name: 'mobile',
        nested: ['mobile/refresh-token'],
      });
    });

    it('uses forward slashes on every platform', async () => {
      await write(path.join('mobile', 'refresh-token', 'proposal.md'));

      const finding = await findNestedChangesIn(changesDir, 'mobile');
      expect(finding?.nested[0]).toBe('mobile/refresh-token');
      expect(finding?.nested[0]).not.toContain('\\');
    });
  });

  describe('leaves real changes alone', () => {
    it('ignores a scaffolded change with only .openspec.yaml', async () => {
      await write(path.join('add-auth', '.openspec.yaml'), 'schema: spec-driven\n');

      expect(await findNestedChangesIn(changesDir, 'add-auth')).toBeUndefined();
    });

    it('ignores a change whose only content is a root delta spec', async () => {
      await write(path.join('add-auth', 'specs', 'spec.md'), '## ADDED Requirements\n');

      expect(await findNestedChangesIn(changesDir, 'add-auth')).toBeUndefined();
    });

    it('ignores a change whose only content is a nested delta spec', async () => {
      await write(path.join('add-auth', 'specs', 'identity', 'user-auth', 'spec.md'));

      expect(await findNestedChangesIn(changesDir, 'add-auth')).toBeUndefined();
    });

    it('ignores an empty change directory', async () => {
      await fs.mkdir(path.join(changesDir, 'add-auth'), { recursive: true });

      expect(await findNestedChangesIn(changesDir, 'add-auth')).toBeUndefined();
    });

    it('ignores a change whose root artifacts live in a subdirectory', async () => {
      // A custom schema may generate every root artifact into a subdirectory
      // (`generates: rfc/proposal.md`). Created by hand, such a change has no
      // .openspec.yaml, so without the delta-specs signal it would read as a
      // namespace folder wrapping a change called "rfc".
      await write(path.join('hand-made', 'rfc', 'proposal.md'));
      await write(path.join('hand-made', 'rfc', 'tasks.md'));
      await write(path.join('hand-made', 'specs', 'auth', 'spec.md'));

      expect(await findNestedChangesIn(changesDir, 'hand-made')).toBeUndefined();
    });

    it('ignores a change that holds any file of its own', async () => {
      // Content at the change root - an artifact under a name this module does
      // not know, a note - means it is a change, whatever sits below it.
      await write(path.join('hand-made', 'notes.md'));
      await write(path.join('hand-made', 'sub', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'hand-made')).toBeUndefined();
    });

    it('never reports the archive directory', async () => {
      // `change show archive` reaches this without the reserved-name guard the
      // other lookups apply; every dated archive entry would be offered up for
      // renaming into an active change.
      await write(path.join('archive', '2026-01-01-old', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'archive')).toBeUndefined();
    });

    it('ignores a hidden directory under changes/', async () => {
      await write(path.join('.trash', 'refresh-token', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, '.trash')).toBeUndefined();
    });

    it('ignores a directory that does not exist', async () => {
      expect(await findNestedChangesIn(changesDir, 'missing')).toBeUndefined();
    });

    it('ignores hidden directories', async () => {
      await write(path.join('mobile', '.trash', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toBeUndefined();
    });

    it('stops below the depth bound rather than walking a whole tree', async () => {
      await write(path.join('mobile', 'a', 'b', 'c', 'refresh-token', 'proposal.md'));

      expect(await findNestedChangesIn(changesDir, 'mobile')).toBeUndefined();
    });
  });

  it('findNestedChanges filters the candidates it is given', async () => {
    await write(path.join('mobile', 'refresh-token', 'proposal.md'));
    await write(path.join('platform', 'api-endpoint', 'proposal.md'));
    await write(path.join('add-auth', 'proposal.md'));

    const findings = await findNestedChanges(changesDir, ['add-auth', 'mobile', 'platform']);

    expect(findings.map((f) => f.name)).toEqual(['mobile', 'platform']);
  });

  it('describeNestedChange names the folder, the nested path and a flat alternative', async () => {
    await write(path.join('mobile', 'refresh-token', 'proposal.md'));
    const finding = (await findNestedChangesIn(changesDir, 'mobile'))!;

    const message = describeNestedChange(finding);

    expect(message).toContain('"mobile" is not a change');
    expect(message).toContain('openspec/changes/mobile/refresh-token/');
    expect(message).toContain('"mobile-refresh-token"');
  });
});
