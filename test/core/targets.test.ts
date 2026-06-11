import { describe, expect, it } from 'vitest';

import {
  assembleTargets,
  renderTargetReposBlock,
  renderTargetReposSection,
} from '../../src/core/targets.js';

describe('effective targets assembly (3.4)', () => {
  const storeConfigPath = '/team/openspec/config.yaml';
  const changeMetadataPath = '/team/openspec/changes/x/.openspec.yaml';

  it('returns the store defaults when the change declares nothing', () => {
    const effective = assembleTargets({
      storeTargets: [{ id: 'api-server' }, { id: 'web-app', remote: 'https://192.0.2.1/web.git' }],
      storeConfigPath,
      changeMetadataPath,
    });

    expect(effective).toEqual({
      source: 'store',
      repos: [{ id: 'api-server' }, { id: 'web-app', remote: 'https://192.0.2.1/web.git' }],
      status: [],
    });
  });

  it('returns null when neither level declares', () => {
    expect(assembleTargets({})).toBeNull();
    expect(assembleTargets({ storeTargets: [], changeTargets: [] })).toBeNull();
  });

  it('treats an empty change array as undeclared', () => {
    const effective = assembleTargets({
      storeTargets: [{ id: 'api-server' }],
      changeTargets: [],
      storeConfigPath,
    });
    expect(effective?.source).toBe('store');
    expect(effective?.repos).toEqual([{ id: 'api-server' }]);
  });

  it('lets a change narrow the set, inheriting store remotes', () => {
    const effective = assembleTargets({
      storeTargets: [{ id: 'api-server' }, { id: 'web-app', remote: 'https://192.0.2.1/web.git' }],
      changeTargets: ['web-app'],
      storeConfigPath,
      changeMetadataPath,
    });

    expect(effective).toEqual({
      source: 'change',
      repos: [{ id: 'web-app', remote: 'https://192.0.2.1/web.git' }],
      status: [],
    });
  });

  it('keeps source change even when the narrowed set equals the store set', () => {
    const effective = assembleTargets({
      storeTargets: [{ id: 'api-server' }],
      changeTargets: ['api-server'],
    });
    expect(effective?.source).toBe('change');
  });

  it('warns on narrowing outside the vocabulary but keeps the id', () => {
    const effective = assembleTargets({
      storeTargets: [{ id: 'api-server' }],
      changeTargets: ['api-sever'],
      storeConfigPath,
      changeMetadataPath,
    });

    expect(effective?.repos).toEqual([{ id: 'api-sever' }]);
    expect(effective?.status).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'target_not_declared',
        target: 'targets',
        message: "'api-sever' is not in the store's declared targets.",
        fix: `Add it to targets in ${storeConfigPath}, or correct the change's ${changeMetadataPath}.`,
      }),
    ]);
  });

  it('degrades grammar-invalid config ids to warnings, kept out of repos', () => {
    const effective = assembleTargets({
      storeTargets: [{ id: 'API Server' }, { id: 'web-app' }],
      storeConfigPath,
    });

    expect(effective?.repos).toEqual([{ id: 'web-app' }]);
    expect(effective?.status[0]).toEqual(
      expect.objectContaining({
        code: 'target_invalid_id',
        message: "Target 'API Server' is not a valid repo id.",
      })
    );
  });

  it('supports change targets with no store declarations at all', () => {
    const effective = assembleTargets({
      changeTargets: ['api-server'],
      storeConfigPath,
      changeMetadataPath,
    });
    expect(effective?.source).toBe('change');
    expect(effective?.repos).toEqual([{ id: 'api-server' }]);
    expect(effective?.status[0]?.code).toBe('target_not_declared');
  });

  describe('renderers', () => {
    it('renders the XML block with provenance and clone notes', () => {
      const effective = assembleTargets({
        storeTargets: [
          { id: 'api-server' },
          { id: 'web-app', remote: 'git@github.com:acme/web-app.git' },
        ],
      })!;

      expect(renderTargetReposBlock(effective)).toBe(
        [
          '<target_repos>',
          '<!-- The code repos this work is about. Declarations, not machinery. -->',
          'Declared by the store config.',
          '  - api-server',
          '  - web-app (clone: git@github.com:acme/web-app.git)',
          '</target_repos>',
        ].join('\n')
      );
    });

    it('renders the markdown section with Note and Fix lines', () => {
      const effective = assembleTargets({
        storeTargets: [{ id: 'api-server' }],
        changeTargets: ['api-sever'],
        storeConfigPath,
        changeMetadataPath,
      })!;

      const section = renderTargetReposSection(effective);
      expect(section).toContain('### Target Repos');
      expect(section).toContain('Narrowed by this change.');
      expect(section).toContain("  Note: 'api-sever' is not in the store's declared targets.");
      expect(section).toContain(
        `  Fix: Add it to targets in ${storeConfigPath}, or correct the change's ${changeMetadataPath}.`
      );
    });
  });
});
