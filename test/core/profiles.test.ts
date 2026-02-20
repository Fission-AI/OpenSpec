import { describe, it, expect } from 'vitest';

import {
  CORE_WORKFLOWS,
  ALL_WORKFLOWS,
  getProfileWorkflows,
} from '../../src/core/profiles.js';

describe('profiles', () => {
  describe('CORE_WORKFLOWS', () => {
    it('should contain the four core workflows', () => {
      expect(CORE_WORKFLOWS).toEqual(['propose', 'explore', 'apply', 'archive']);
    });

    it('should be a subset of ALL_WORKFLOWS', () => {
      for (const workflow of CORE_WORKFLOWS) {
        expect(ALL_WORKFLOWS).toContain(workflow);
      }
    });
  });

  describe('ALL_WORKFLOWS', () => {
    it('should contain all 11 workflows', () => {
      expect(ALL_WORKFLOWS).toHaveLength(11);
    });

    it('should contain expected workflow IDs', () => {
      const expected = [
        'propose', 'explore', 'new', 'continue', 'apply',
        'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
      ];
      expect([...ALL_WORKFLOWS]).toEqual(expected);
    });
  });

  describe('getProfileWorkflows', () => {
    it('should return core workflows for core profile', () => {
      const result = getProfileWorkflows('core');
      expect(result).toEqual(CORE_WORKFLOWS);
    });

    it('should return core workflows for core profile even if customWorkflows provided', () => {
      const result = getProfileWorkflows('core', ['new', 'apply']);
      expect(result).toEqual(CORE_WORKFLOWS);
    });

    it('should return custom workflows for custom profile', () => {
      const customWorkflows = ['explore', 'new', 'apply', 'ff'];
      const result = getProfileWorkflows('custom', customWorkflows);
      expect(result).toEqual(customWorkflows);
    });

    it('should return empty array for custom profile with no customWorkflows', () => {
      const result = getProfileWorkflows('custom');
      expect(result).toEqual([]);
    });

    it('should return empty array for custom profile with empty customWorkflows', () => {
      const result = getProfileWorkflows('custom', []);
      expect(result).toEqual([]);
    });
  });
});
