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
    it('should define standard and dixi profiles', () => {
      expect(PROFILES).toHaveProperty('standard');
      expect(PROFILES).toHaveProperty('dixi');
    });

    it('each profile should have a description and non-empty workflows list', () => {
      for (const [name, def] of Object.entries(PROFILES)) {
        expect(def.description, `${name}.description`).toBeTruthy();
        expect(def.workflows.length, `${name}.workflows`).toBeGreaterThan(0);
      }
    });

    it('standard profile should contain the 5 base workflows', () => {
      expect([...PROFILES.standard.workflows]).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
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
    it('should return the workflows for the standard profile', () => {
      const result = getProfileWorkflows('standard');
      expect([...result]).toEqual([...PROFILES.standard.workflows]);
    });

    it('should return the workflows for the dixi profile', () => {
      const result = getProfileWorkflows('dixi');
      expect([...result]).toEqual([...PROFILES.dixi.workflows]);
    });
  });

  describe('isValidProfile', () => {
    it('returns true for defined profile names', () => {
      expect(isValidProfile('standard')).toBe(true);
      expect(isValidProfile('dixi')).toBe(true);
    });

    it('returns false for unknown names', () => {
      expect(isValidProfile('core')).toBe(false);
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
