import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  createCollectionRegistry,
  mountCollections,
  parseCollectionPath,
  validateCollectionId,
  validateMount,
  type MountedCollectionContext,
} from '../../../src/core/collections/index.js';

describe('collection runtime', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-context-store-collections-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('collection id and mount validation', () => {
    it('accepts portable kebab-case ids and mounts', () => {
      for (const value of ['initiatives', 'decisions', 'api-catalog', 'context2']) {
        expect(validateCollectionId(value)).toBe(value);
        expect(validateMount(value)).toBe(value);
      }
    });

    it('rejects unsafe ids and mounts', () => {
      for (const invalidValue of [
        '',
        '.',
        '..',
        'bad/name',
        'bad\\name',
        'Acme',
        'acme_context',
        'acme.context',
        'acme context',
        '-acme',
        'acme-',
        'acme--context',
        'a\0b',
      ]) {
        expect(() => validateCollectionId(invalidValue)).toThrow();
        expect(() => validateMount(invalidValue)).toThrow();
      }

      expect(() => validateMount('.openspec-store')).toThrow(/reserved/u);
    });
  });

  describe('collection path parsing', () => {
    it('parses logical paths inside a collection mount', () => {
      expect(parseCollectionPath()).toBe('');
      expect(parseCollectionPath('')).toBe('');
      expect(parseCollectionPath('launch-billing-flow/initiative.yaml')).toBe(
        'launch-billing-flow/initiative.yaml'
      );
      expect(parseCollectionPath('initiatives-old/file.md')).toBe('initiatives-old/file.md');
    });

    it('rejects paths that are absolute, ambiguous, or outside the mount', () => {
      for (const invalidPath of [
        '.',
        './x',
        'x/.',
        '..',
        '../x',
        'x/..',
        'x/../y',
        'x//y',
        'x/',
        '/x',
        '//server/share/file',
        'C:/x',
        'C:\\x',
        '\\\\server\\share\\x',
        'bad\\path',
        'a\0b',
      ]) {
        expect(() => parseCollectionPath(invalidPath)).toThrow();
      }
    });
  });

  describe('collection registry', () => {
    it('lists, gets, and requires collection definitions deterministically', () => {
      const registry = createCollectionRegistry([
        { id: 'decisions', mount: 'decisions' },
        { id: 'initiatives', mount: 'initiatives' },
      ]);

      expect(registry.list().map((definition) => definition.id)).toEqual([
        'decisions',
        'initiatives',
      ]);
      expect(registry.get('initiatives')).toEqual({
        id: 'initiatives',
        mount: 'initiatives',
      });
      expect(registry.get('missing')).toBeUndefined();
      expect(registry.require('decisions').mount).toBe('decisions');
      expect(() => registry.require('missing')).toThrow(/Unknown collection/u);
    });

    it('rejects duplicate collection ids and mounts', () => {
      expect(() =>
        createCollectionRegistry([
          { id: 'initiatives', mount: 'initiatives' },
          { id: 'initiatives', mount: 'initiative-plans' },
        ])
      ).toThrow(/Duplicate collection id/u);

      expect(() =>
        createCollectionRegistry([
          { id: 'initiatives', mount: 'shared-context' },
          { id: 'decisions', mount: 'shared-context' },
        ])
      ).toThrow(/Duplicate collection mount/u);
    });
  });

  describe('mounted collections', () => {
    it('mounts initiatives as a generic collection without creating files', () => {
      const storeRoot = path.join(tempDir, 'acme-context');
      const registry = createCollectionRegistry([{ id: 'initiatives', mount: 'initiatives' }]);
      const mounted = mountCollections({ storeRoot, collections: registry });
      const initiatives = mounted.require('initiatives');

      expect(initiatives.collectionId).toBe('initiatives');
      expect(initiatives.mount).toBe('initiatives');
      expect(initiatives.mountRoot).toBe(path.join(storeRoot, 'initiatives'));
      expect(initiatives.resolvePath('launch-billing-flow/initiative.yaml')).toBe(
        path.join(storeRoot, 'initiatives', 'launch-billing-flow', 'initiative.yaml')
      );
      expect(initiatives.resolvePath('..draft/notes.md')).toBe(
        path.join(storeRoot, 'initiatives', '..draft', 'notes.md')
      );
      expect(initiatives.resolvePath()).toBe(path.join(storeRoot, 'initiatives'));
      expect(initiatives.toStorePath('launch-billing-flow/initiative.yaml')).toBe(
        'initiatives/launch-billing-flow/initiative.yaml'
      );
      expect(initiatives.toStorePath()).toBe('initiatives');
      expect(fs.existsSync(path.join(storeRoot, 'initiatives'))).toBe(false);
    });

    it('preserves Windows-style store roots when resolving filesystem paths', () => {
      const registry = createCollectionRegistry([{ id: 'initiatives', mount: 'initiatives' }]);
      const mounted = mountCollections({
        storeRoot: 'D:\\stores\\acme-context',
        collections: registry,
      });
      const initiatives = mounted.require('initiatives');

      expect(initiatives.mountRoot).toBe('D:\\stores\\acme-context\\initiatives');
      expect(initiatives.resolvePath('launch/initiative.yaml')).toBe(
        'D:\\stores\\acme-context\\initiatives\\launch\\initiative.yaml'
      );
      expect(initiatives.toStorePath('launch/initiative.yaml')).toBe(
        'initiatives/launch/initiative.yaml'
      );
    });

    it('passes mounted context into collection handles', () => {
      const seenContexts: MountedCollectionContext[] = [];
      const registry = createCollectionRegistry([
        {
          id: 'initiatives',
          mount: 'initiatives',
          createHandle(context) {
            seenContexts.push(context);
            return {
              rootPath: context.resolvePath(),
              storePath: context.toStorePath('launch/initiative.yaml'),
            };
          },
        },
        { id: 'decisions', mount: 'decisions' },
      ]);

      const storeRoot = path.join(tempDir, 'acme-context');
      const mounted = mountCollections({ storeRoot, collections: registry });
      const initiatives = mounted.require<{
        rootPath: string;
        storePath: string;
      }>('initiatives');
      const decisions = mounted.require('decisions');

      expect(seenContexts).toHaveLength(1);
      expect(seenContexts[0].collectionId).toBe('initiatives');
      expect(initiatives.handle).toEqual({
        rootPath: path.join(storeRoot, 'initiatives'),
        storePath: 'initiatives/launch/initiative.yaml',
      });
      expect(decisions.handle).toBeUndefined();
      expect(mounted.get('missing')).toBeUndefined();
      expect(() => mounted.require('missing')).toThrow(/Unknown mounted collection/u);
    });

    it('rejects empty store roots', () => {
      const registry = createCollectionRegistry([{ id: 'initiatives', mount: 'initiatives' }]);

      expect(() => mountCollections({ storeRoot: '', collections: registry })).toThrow(
        /must not be empty/u
      );
    });
  });
});
