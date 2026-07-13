import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  readLinkedRoots,
  readServesRef,
  recordLinkedRoot,
  resolveUpstreamLink,
  rollupDownstream,
  rollupRegisteredStores,
} from '../../src/core/upstream.js';
import {
  readStoreRegistryState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';

describe('upstream links', () => {
  let tempDir: string;
  let globalDataDir: string;
  let savedXdgDataHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-upstream-'));
    globalDataDir = path.join(tempDir, 'data', 'openspec');
    savedXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg');
  });

  afterEach(() => {
    if (savedXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = savedXdgDataHome;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function write(relativePath: string, content: string): void {
    const full = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  function change(root: string, id: string, ref: string | null, tasks: string): void {
    const metadata =
      ref === null
        ? 'schema: spec-driven\n'
        : `schema: spec-driven\nserves: ${ref}\n`;
    write(`${root}/openspec/changes/${id}/.openspec.yaml`, metadata);
    write(`${root}/openspec/changes/${id}/tasks.md`, tasks);
  }

  async function registerStore(id: string, root: string): Promise<void> {
    const existing = await readStoreRegistryState({ globalDataDir }).catch(() => null);
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          ...(existing?.stores ?? {}),
          [id]: { backend: { type: 'git', local_path: path.join(tempDir, root) } },
        },
      },
      { globalDataDir }
    );
  }

  describe('readServesRef', () => {
    it('reads the serves line and tolerates absent or unreadable metadata', async () => {
      change('app', 'add-search', 'team-hub/onboarding-revamp', '- [ ] task\n');
      change('app', 'unlinked', null, '- [ ] task\n');

      const changesDir = path.join(tempDir, 'app', 'openspec', 'changes');
      expect(await readServesRef(path.join(changesDir, 'add-search'))).toBe(
        'team-hub/onboarding-revamp'
      );
      expect(await readServesRef(path.join(changesDir, 'unlinked'))).toBeNull();
      expect(await readServesRef(path.join(changesDir, 'missing'))).toBeNull();
    });
  });

  describe('linked roots', () => {
    it('records roots idempotently and reads them back sorted', async () => {
      const options = { globalDataDir };
      await recordLinkedRoot(path.join(tempDir, 'b-repo'), options);
      await recordLinkedRoot(path.join(tempDir, 'a-repo'), options);
      await recordLinkedRoot(path.join(tempDir, 'b-repo'), options);

      expect(await readLinkedRoots(options)).toEqual([
        path.resolve(tempDir, 'a-repo'),
        path.resolve(tempDir, 'b-repo'),
      ]);
    });

    it('reads unreadable state as none', async () => {
      expect(await readLinkedRoots({ globalDataDir })).toEqual([]);
    });
  });

  describe('rollupDownstream in a plain repo', () => {
    it('groups local serving changes under the changes they serve', async () => {
      change('app', 'onboarding-revamp', null, '');
      change('app', 'add-search', 'onboarding-revamp', '- [x] one\n- [ ] two\n');
      change('app', 'add-tour', 'onboarding-revamp', '- [x] only\n');
      change('app', 'unrelated', null, '- [ ] task\n');

      const rollup = await rollupDownstream(path.join(tempDir, 'app'), { globalDataDir });

      const entry = rollup?.upstream.find((u) => u.id === 'onboarding-revamp');
      expect(entry?.exists).toBe(true);
      expect(entry?.archived).toBe(false);
      expect(entry?.changes.map((c) => c.id)).toEqual(['add-search', 'add-tour']);
      expect(entry?.changesComplete).toBe(1);
      expect(entry?.changesTotal).toBe(2);
      expect(entry?.tasksComplete).toBe(2);
      expect(entry?.tasksTotal).toBe(3);

      const unrelated = rollup?.upstream.find((u) => u.id === 'unrelated');
      expect(unrelated?.changesTotal).toBe(0);
    });

    it('hides serving-only changes from upstream rows', async () => {
      change('app', 'onboarding-revamp', null, '');
      change('app', 'add-search', 'onboarding-revamp', '- [ ] one\n');

      const rollup = await rollupDownstream(path.join(tempDir, 'app'), { globalDataDir });

      // add-search is downstream work: it serves something and nothing
      // serves it, so it appears under its upstream, not as its own row.
      expect(rollup?.upstream.map((u) => u.id)).toEqual(['onboarding-revamp']);
    });

    it('keeps refs to missing changes visible instead of dropping them', async () => {
      change('app', 'add-search', 'no-such-change', '- [ ] task\n');

      const rollup = await rollupDownstream(path.join(tempDir, 'app'), { globalDataDir });

      const entry = rollup?.upstream.find((u) => u.id === 'no-such-change');
      expect(entry?.exists).toBe(false);
      expect(entry?.changes.map((c) => c.id)).toEqual(['add-search']);
    });

    it('resolves refs to archived changes and marks them archived', async () => {
      write(
        'app/openspec/changes/archive/2026-07-01-onboarding-revamp/.openspec.yaml',
        'schema: spec-driven\n'
      );
      change('app', 'add-search', 'onboarding-revamp', '- [x] done\n');

      const rollup = await rollupDownstream(path.join(tempDir, 'app'), { globalDataDir });

      const entry = rollup?.upstream.find((u) => u.id === 'onboarding-revamp');
      expect(entry?.exists).toBe(true);
      expect(entry?.archived).toBe(true);
    });

    it('returns null when the root has no changes folder', async () => {
      fs.mkdirSync(path.join(tempDir, 'app', 'openspec'), { recursive: true });
      expect(await rollupDownstream(path.join(tempDir, 'app'), { globalDataDir })).toBeNull();
    });
  });

  describe('rollupDownstream for a registered store', () => {
    it('scans other stores and linked repos for store-qualified refs', async () => {
      await registerStore('team-hub', 'team-hub');
      await registerStore('other-store', 'other-store');
      change('team-hub', 'onboarding-revamp', null, '');
      // A change in another registered store serving team-hub's change.
      change('other-store', 'update-docs', 'team-hub/onboarding-revamp', '- [x] a\n');
      // A change in a plain linked repo.
      change('web-app', 'add-tour', 'team-hub/onboarding-revamp', '- [ ] b\n');
      await recordLinkedRoot(path.join(tempDir, 'web-app'), { globalDataDir });
      // A self-qualified ref inside the store itself.
      change('team-hub', 'refine-copy', 'team-hub/onboarding-revamp', '- [x] c\n');

      const rollup = await rollupDownstream(path.join(tempDir, 'team-hub'), {
        globalDataDir,
      });

      const entry = rollup?.upstream.find((u) => u.id === 'onboarding-revamp');
      expect(entry?.changes).toEqual([
        expect.objectContaining({ id: 'add-tour', repo: 'web-app' }),
        expect.objectContaining({ id: 'refine-copy' }),
        expect.objectContaining({ id: 'update-docs', store: 'other-store' }),
      ]);
      expect(entry?.changesComplete).toBe(2);
      expect(entry?.changesTotal).toBe(3);
    });

    it('ignores refs qualified for a different store', async () => {
      await registerStore('team-hub', 'team-hub');
      change('team-hub', 'onboarding-revamp', null, '');
      change('web-app', 'add-tour', 'elsewhere/onboarding-revamp', '- [ ] b\n');
      await recordLinkedRoot(path.join(tempDir, 'web-app'), { globalDataDir });

      const rollup = await rollupDownstream(path.join(tempDir, 'team-hub'), {
        globalDataDir,
      });

      const entry = rollup?.upstream.find((u) => u.id === 'onboarding-revamp');
      expect(entry?.changes).toEqual([]);
    });
  });

  describe('rollupRegisteredStores', () => {
    it('returns rollups for every registered store with changes', async () => {
      await registerStore('team-hub', 'team-hub');
      await registerStore('empty-store', 'empty-store');
      change('team-hub', 'onboarding-revamp', null, '');
      fs.mkdirSync(path.join(tempDir, 'empty-store', 'openspec'), { recursive: true });

      const rollups = await rollupRegisteredStores({ globalDataDir });

      expect(rollups.map((r) => r.store)).toEqual(['team-hub']);
      expect(rollups[0].rollup.upstream.map((u) => u.id)).toEqual([
        'onboarding-revamp',
      ]);
    });
  });

  describe('resolveUpstreamLink', () => {
    it('resolves a same-root ref to the upstream change directory', async () => {
      change('app', 'onboarding-revamp', null, '');
      change('app', 'add-search', 'onboarding-revamp', '- [ ] a\n');

      const link = await resolveUpstreamLink(
        path.join(tempDir, 'app', 'openspec', 'changes', 'add-search'),
        path.join(tempDir, 'app'),
        { globalDataDir }
      );

      expect(link).toEqual({
        ref: 'onboarding-revamp',
        changeId: 'onboarding-revamp',
        path: path.join(tempDir, 'app', 'openspec', 'changes', 'onboarding-revamp'),
        archived: false,
      });
    });

    it('resolves a store-qualified ref through the registry', async () => {
      await registerStore('team-hub', 'team-hub');
      change('team-hub', 'onboarding-revamp', null, '');
      change('web-app', 'add-tour', 'team-hub/onboarding-revamp', '- [ ] a\n');

      const link = await resolveUpstreamLink(
        path.join(tempDir, 'web-app', 'openspec', 'changes', 'add-tour'),
        path.join(tempDir, 'web-app'),
        { globalDataDir }
      );

      expect(link?.store).toBe('team-hub');
      expect(link?.path).toBe(
        path.join(tempDir, 'team-hub', 'openspec', 'changes', 'onboarding-revamp')
      );
    });

    it('resolves an archived upstream change and marks it archived', async () => {
      await registerStore('team-hub', 'team-hub');
      write(
        'team-hub/openspec/changes/archive/2026-07-01-onboarding-revamp/proposal.md',
        '# done\n'
      );
      change('web-app', 'add-tour', 'team-hub/onboarding-revamp', '- [ ] a\n');

      const link = await resolveUpstreamLink(
        path.join(tempDir, 'web-app', 'openspec', 'changes', 'add-tour'),
        path.join(tempDir, 'web-app'),
        { globalDataDir }
      );

      expect(link?.archived).toBe(true);
      expect(link?.path).toBe(
        path.join(
          tempDir,
          'team-hub',
          'openspec',
          'changes',
          'archive',
          '2026-07-01-onboarding-revamp'
        )
      );
    });

    it('keeps a stale link visible with path null', async () => {
      change('web-app', 'add-tour', 'unregistered/onboarding-revamp', '- [ ] a\n');

      const link = await resolveUpstreamLink(
        path.join(tempDir, 'web-app', 'openspec', 'changes', 'add-tour'),
        path.join(tempDir, 'web-app'),
        { globalDataDir }
      );

      expect(link?.path).toBeNull();
      expect(link?.ref).toBe('unregistered/onboarding-revamp');
    });

    it('returns null for a change that serves nothing', async () => {
      change('app', 'plain', null, '- [ ] a\n');

      expect(
        await resolveUpstreamLink(
          path.join(tempDir, 'app', 'openspec', 'changes', 'plain'),
          path.join(tempDir, 'app'),
          { globalDataDir }
        )
      ).toBeNull();
    });
  });
});
