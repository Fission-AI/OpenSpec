import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { escapeYamlValue } from '../../../src/core/command-generation/yaml.js';

/**
 * Parses a single-key YAML document and returns the round-tripped value.
 *
 * @param value - The raw string to escape and round-trip through YAML.
 * @returns The value as read back by a real YAML parser.
 */
function roundTrip(value: string): unknown {
  const doc = `key: ${escapeYamlValue(value)}\n`;
  return parseYaml(doc).key;
}

describe('command-generation/yaml escapeYamlValue', () => {
  it('returns the value unquoted when no special characters are present', () => {
    expect(escapeYamlValue('Enter explore mode for thinking')).toBe(
      'Enter explore mode for thinking'
    );
  });

  it('quotes values containing a colon', () => {
    expect(escapeYamlValue('Fix: regression')).toBe('"Fix: regression"');
  });

  it('escapes embedded double quotes', () => {
    expect(escapeYamlValue('Fix the "auth" feature')).toBe(
      '"Fix the \\"auth\\" feature"'
    );
  });

  it('escapes backslashes before other characters', () => {
    expect(escapeYamlValue('path\\to:thing')).toBe('"path\\\\to:thing"');
  });

  it('escapes line feeds', () => {
    expect(escapeYamlValue('Line 1\nLine 2')).toBe('"Line 1\\nLine 2"');
  });

  it('escapes carriage returns', () => {
    // Regression: \r is detected as needing quoting but was previously left
    // as a literal CR inside the double-quoted scalar.
    expect(escapeYamlValue('Line 1\rLine 2')).toBe('"Line 1\\rLine 2"');
  });

  it('escapes CRLF sequences', () => {
    expect(escapeYamlValue('Line 1\r\nLine 2')).toBe('"Line 1\\r\\nLine 2"');
  });

  it('quotes values with leading or trailing whitespace', () => {
    expect(escapeYamlValue(' leading')).toBe('" leading"');
    expect(escapeYamlValue('trailing ')).toBe('"trailing "');
  });

  describe('round-trips through a real YAML parser', () => {
    const cases: Array<[string, string]> = [
      ['plain', 'Enter explore mode'],
      ['colon', 'Fix: regression in parser'],
      ['double quotes', 'Fix the "auth" feature'],
      ['backslash', 'path\\to\\thing'],
      ['line feed', 'Line 1\nLine 2'],
      ['carriage return', 'Line 1\rLine 2'],
      ['crlf', 'Line 1\r\nLine 2'],
      ['mixed special', 'a: "b"\r\n#c\\d'],
    ];

    for (const [label, value] of cases) {
      it(`preserves the value: ${label}`, () => {
        expect(roundTrip(value)).toBe(value);
      });
    }
  });
});
