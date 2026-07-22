import { describe, it, expect } from 'vitest';

import {
  CORE_WORKFLOWS,
  ALL_WORKFLOWS,
  getProfileWorkflows,
} from '../../src/core/profiles.js';

describe('profiles', () => {
  describe('CORE_WORKFLOWS', () => {
    it('should contain the five-façade ATD journey plus explore and update', () => {
      expect(CORE_WORKFLOWS).toEqual(['atd-triage', 'atd-continue', 'atd-apply', 'atd-verify', 'atd-close', 'explore', 'update']);
    });

    it('should not contain the generic workflows replaced by their façades', () => {
      for (const generic of ['propose', 'sync', 'archive', 'continue', 'apply', 'verify']) {
        expect(CORE_WORKFLOWS).not.toContain(generic);
      }
    });

    it('should include update in the core profile (default install, not expanded-only)', () => {
      expect(CORE_WORKFLOWS).toContain('update');
    });

    it('should be a subset of ALL_WORKFLOWS', () => {
      for (const workflow of CORE_WORKFLOWS) {
        expect(ALL_WORKFLOWS).toContain(workflow);
      }
    });
  });

  describe('ALL_WORKFLOWS', () => {
    it('should contain all 17 workflows', () => {
      expect(ALL_WORKFLOWS).toHaveLength(17);
    });

    it('should contain expected workflow IDs', () => {
      const expected = [
        'propose', 'explore', 'new', 'continue', 'apply', 'update',
        'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
        'atd-triage', 'atd-continue', 'atd-apply', 'atd-verify', 'atd-close',
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
