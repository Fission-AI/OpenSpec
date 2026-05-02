import { describe, it, expect, vi } from 'vitest';
import {
  buildKeywordRegex,
  formatKeywordMessage,
  resolveKeywords,
  NORMATIVE_KEYWORDS,
  DEFAULT_LANGUAGE,
} from '../../src/core/i18n/keywords.js';

describe('i18n keywords', () => {
  describe('buildKeywordRegex', () => {
    it('should match English keywords', () => {
      const regex = buildKeywordRegex(['MUST', 'SHALL']);
      expect(regex.test('The system MUST do something')).toBe(true);
      expect(regex.test('The system SHALL do something')).toBe(true);
    });

    it('should match Spanish keywords with accents', () => {
      const regex = buildKeywordRegex(['DEBE', 'DEBERA', 'DEBERÁ']);
      expect(regex.test('El sistema DEBERÁ emitir un token')).toBe(true);
      expect(regex.test('El sistema DEBE emitir un token')).toBe(true);
      expect(regex.test('El sistema DEBERA emitir un token')).toBe(true);
    });

    it('should not match DEBE as substring of DEBERÁ', () => {
      const regex = buildKeywordRegex(['DEBE']);
      expect(regex.test('El sistema DEBERÁ emitir')).toBe(false);
    });

    it('should not match DEBE as substring of DEBERA', () => {
      const regex = buildKeywordRegex(['DEBE']);
      expect(regex.test('El sistema DEBERA emitir')).toBe(false);
    });

    it('should match keyword at start of string', () => {
      const regex = buildKeywordRegex(['MUST']);
      expect(regex.test('MUST do something')).toBe(true);
    });

    it('should match keyword at end of string', () => {
      const regex = buildKeywordRegex(['MUST']);
      expect(regex.test('The system MUST')).toBe(true);
    });

    it('should match keyword followed by punctuation', () => {
      const regex = buildKeywordRegex(['DEBERÁ']);
      expect(regex.test('El sistema DEBERÁ.')).toBe(true);
      expect(regex.test('El sistema DEBERÁ,')).toBe(true);
      expect(regex.test('El sistema DEBERÁ:')).toBe(true);
    });

    it('should be case-sensitive', () => {
      const regex = buildKeywordRegex(['MUST', 'SHALL']);
      expect(regex.test('The system must do something')).toBe(false);
      expect(regex.test('The system shall do something')).toBe(false);
    });

    it('should not match keyword embedded in a word', () => {
      const regex = buildKeywordRegex(['MUST']);
      expect(regex.test('MUSTARD is a condiment')).toBe(false);
    });

    it('should not match keyword inside hyphenated tokens', () => {
      const regex = buildKeywordRegex(['MUST', 'SHALL']);
      expect(regex.test('MUST-API requires auth')).toBe(false);
      expect(regex.test('SHALL-NOT is a pattern')).toBe(false);
    });

    it('should not match keyword inside underscored tokens', () => {
      const regex = buildKeywordRegex(['SHALL']);
      expect(regex.test('SHALL_v2 is deprecated')).toBe(false);
    });

    it('should not match keyword adjacent to digits', () => {
      const regex = buildKeywordRegex(['MUST']);
      expect(regex.test('MUST2 is a variant')).toBe(false);
      expect(regex.test('2MUST is invalid')).toBe(false);
    });

    it('should match when multiple keywords exist in text', () => {
      const regex = buildKeywordRegex(['DEBE', 'DEBERÁ']);
      expect(regex.test('DEBE y DEBERÁ funcionar')).toBe(true);
    });
  });

  describe('formatKeywordMessage', () => {
    it('should format single keyword', () => {
      expect(formatKeywordMessage(['MUST'])).toBe(
        'Requirement must contain "MUST" keyword'
      );
    });

    it('should format two keywords', () => {
      expect(formatKeywordMessage(['MUST', 'SHALL'])).toBe(
        'Requirement must contain "MUST" or "SHALL" keyword'
      );
    });

    it('should format three keywords', () => {
      expect(formatKeywordMessage(['DEBE', 'DEBERA', 'DEBERÁ'])).toBe(
        'Requirement must contain "DEBE", "DEBERA", or "DEBERÁ" keyword'
      );
    });
  });

  describe('resolveKeywords', () => {
    it('should return English keywords by default', () => {
      expect(resolveKeywords()).toEqual(NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE]);
    });

    it('should return English keywords for "en"', () => {
      expect(resolveKeywords('en')).toEqual(['MUST', 'SHALL']);
    });

    it('should return Spanish keywords for "es"', () => {
      expect(resolveKeywords('es')).toEqual(['DEBE', 'DEBERA', 'DEBERÁ']);
    });

    it('should fall back to English for unknown language and log warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(resolveKeywords('xx')).toEqual(NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown language "xx"')
      );
      warnSpy.mockRestore();
    });

    it('should fall back to English for undefined', () => {
      expect(resolveKeywords(undefined)).toEqual(NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE]);
    });

    it('should normalize uppercase language codes', () => {
      expect(resolveKeywords('ES')).toEqual(['DEBE', 'DEBERA', 'DEBERÁ']);
      expect(resolveKeywords('EN')).toEqual(['MUST', 'SHALL']);
    });

    it('should normalize whitespace in language codes', () => {
      expect(resolveKeywords(' es ')).toEqual(['DEBE', 'DEBERA', 'DEBERÁ']);
    });

    it('should fall back to English for whitespace-only language', () => {
      expect(resolveKeywords('   ')).toEqual(NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE]);
    });
  });
});
