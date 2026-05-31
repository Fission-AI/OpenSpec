import { describe, it, expect } from 'vitest';

import {
  ALL_WORKFLOWS,
  PROFILES,
  getProfileWorkflows,
  isValidProfile,
  DEFAULT_PROFILE,
} from '../../src/core/profiles.js';

describe('profiles', () => {
  describe('ALL_WORKFLOWS', () => {
    it('should contain all 13 workflows', () => {
      expect(ALL_WORKFLOWS).toHaveLength(13);
    });

    it('should contain expected workflow IDs', () => {
      const expected = [
        'propose', 'explore', 'new', 'continue', 'apply',
        'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
        'trello-setup', 'draft',
      ];
      expect([...ALL_WORKFLOWS]).toEqual(expected);
    });
  });

  describe('PROFILES', () => {
    it('should define at least core, full, and trello profiles', () => {
      expect(PROFILES).toHaveProperty('core');
      expect(PROFILES).toHaveProperty('full');
      expect(PROFILES).toHaveProperty('trello');
    });

    it('each profile should have a description and non-empty workflows list', () => {
      for (const [name, def] of Object.entries(PROFILES)) {
        expect(def.description, `${name}.description`).toBeTruthy();
        expect(def.workflows.length, `${name}.workflows`).toBeGreaterThan(0);
      }
    });

    it('core profile should contain the standard 5 workflows', () => {
      expect([...PROFILES.core.workflows]).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    });

    it('full profile should contain all workflows', () => {
      expect(PROFILES.full.workflows).toHaveLength(ALL_WORKFLOWS.length);
    });

    it('all profile workflows should be valid workflow IDs', () => {
      for (const [name, def] of Object.entries(PROFILES)) {
        for (const workflow of def.workflows) {
          expect(ALL_WORKFLOWS, `${name} has unknown workflow "${workflow}"`).toContain(workflow);
        }
      }
    });
  });

describe('getProfileWorkflows', () => {
    it('should return the workflows for the core profile', () => {
      const result = getProfileWorkflows('core');
      expect([...result]).toEqual([...PROFILES.core.workflows]);
    });

    it('should return the workflows for the full profile', () => {
      const result = getProfileWorkflows('full');
      expect([...result]).toEqual([...PROFILES.full.workflows]);
    });

    it('should return the workflows for the trello profile', () => {
      const result = getProfileWorkflows('trello');
      expect([...result]).toEqual([...PROFILES.trello.workflows]);
    });
  });

  describe('isValidProfile', () => {
    it('returns true for defined profile names', () => {
      expect(isValidProfile('core')).toBe(true);
      expect(isValidProfile('full')).toBe(true);
      expect(isValidProfile('trello')).toBe(true);
    });

    it('returns false for unknown names', () => {
      expect(isValidProfile('custom')).toBe(false);
      expect(isValidProfile('')).toBe(false);
      expect(isValidProfile('unknown')).toBe(false);
    });
  });

  describe('DEFAULT_PROFILE', () => {
    it('should be a valid profile', () => {
      expect(isValidProfile(DEFAULT_PROFILE)).toBe(true);
    });
  });
});
