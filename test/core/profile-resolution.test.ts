import { describe, it, expect } from 'vitest';
import { resolveEffectiveProfileSettings } from '../../src/core/profile-resolution.js';

describe('profile-resolution', () => {
  it('uses defaults when project and global values are absent', () => {
    const resolved = resolveEffectiveProfileSettings({
      globalConfig: { featureFlags: {} },
      projectConfig: null,
    });

    expect(resolved).toEqual({
      profile: 'core',
      delivery: 'both',
      workflows: ['propose', 'explore', 'apply', 'archive'],
      sources: {
        profile: 'default',
        delivery: 'default',
        workflows: 'default',
      },
    });
  });

  it('applies project values over global values by default', () => {
    const resolved = resolveEffectiveProfileSettings({
      globalConfig: {
        featureFlags: {},
        profile: 'core',
        delivery: 'both',
      },
      projectConfig: {
        profile: 'custom',
        delivery: 'skills',
        workflows: ['explore', 'verify'],
      },
    });

    expect(resolved.profile).toBe('custom');
    expect(resolved.delivery).toBe('skills');
    expect(resolved.workflows).toEqual(['explore', 'verify']);
    expect(resolved.sources).toEqual({
      profile: 'project',
      delivery: 'project',
      workflows: 'project',
    });
  });

  it('falls back key-by-key for partial project config', () => {
    const resolved = resolveEffectiveProfileSettings({
      globalConfig: {
        featureFlags: {},
        profile: 'custom',
        delivery: 'commands',
        workflows: ['new'],
      },
      projectConfig: {
        profile: 'custom',
      },
    });

    expect(resolved).toEqual({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['new'],
      sources: {
        profile: 'project',
        delivery: 'global',
        workflows: 'global',
      },
    });
  });

  it('ignores project config when scope override is global', () => {
    const resolved = resolveEffectiveProfileSettings({
      scopeOverride: 'global',
      globalConfig: {
        featureFlags: {},
        profile: 'custom',
        delivery: 'commands',
        workflows: ['continue'],
      },
      projectConfig: {
        profile: 'core',
        delivery: 'skills',
        workflows: ['explore'],
      },
    });

    expect(resolved).toEqual({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['continue'],
      sources: {
        profile: 'global',
        delivery: 'global',
        workflows: 'global',
      },
    });
  });

  it("honors scopeOverride='project' (project wins, global fallback preserved)", () => {
    const resolved = resolveEffectiveProfileSettings({
      scopeOverride: 'project',
      globalConfig: {
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
        workflows: ['continue'],
      },
      projectConfig: {
        profile: 'custom',
      },
    });

    expect(resolved).toEqual({
      profile: 'custom',
      delivery: 'commands',
      workflows: ['continue'],
      sources: {
        profile: 'project',
        delivery: 'global',
        workflows: 'global',
      },
    });
  });

  it('applies CLI overrides before project and global values', () => {
    const resolved = resolveEffectiveProfileSettings({
      cliOverrides: {
        profile: 'custom',
        delivery: 'skills',
        workflows: ['verify'],
      },
      globalConfig: {
        featureFlags: {},
        profile: 'core',
        delivery: 'both',
      },
      projectConfig: {
        profile: 'custom',
        delivery: 'commands',
        workflows: ['explore'],
      },
    });

    expect(resolved).toEqual({
      profile: 'custom',
      delivery: 'skills',
      workflows: ['verify'],
      sources: {
        profile: 'cli',
        delivery: 'cli',
        workflows: 'cli',
      },
    });
  });

  it('derives core workflows from core profile even if workflow keys exist', () => {
    const resolved = resolveEffectiveProfileSettings({
      globalConfig: {
        featureFlags: {},
        profile: 'core',
        delivery: 'both',
        workflows: ['verify'],
      },
      projectConfig: {
        workflows: ['sync'],
      },
    });

    expect(resolved.workflows).toEqual(['propose', 'explore', 'apply', 'archive']);
    expect(resolved.sources.workflows).toBe('global');
  });
});
