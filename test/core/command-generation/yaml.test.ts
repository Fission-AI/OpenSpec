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
  it('quotes plain values for safe string serialization', () => {
    expect(escapeYamlValue('Enter explore mode for thinking')).toBe(
      '"Enter explore mode for thinking"'
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
      ['tab', 'column\tseparated'],
      ['escape', 'ansi\x1b[0m reset'],
      ['vertical tab', 'a\x0bb'],
      ['form feed', 'a\x0cb'],
      ['nul', 'a\x00b'],
      ['delete', 'a\x7fb'],
      ['next line', 'a\x85b'],
    ];

    for (const [label, value] of cases) {
      it(`preserves the value: ${label}`, () => {
        expect(roundTrip(value)).toBe(value);
      });
    }
  });

  // YAML's c-printable production excludes the C0 controls, DEL and the C1
  // range. A raw control byte inside a double-quoted scalar is accepted by
  // lenient parsers (including the one this suite uses) but rejected outright
  // by stricter ones, so the generated file has to carry them as \xHH escapes
  // to load in every tool.
  describe('escapes non-printable characters rather than emitting them raw', () => {
    const cases: Array<[string, string, string]> = [
      ['nul', '\x00', '"\\x00"'],
      ['backspace', '\x08', '"\\x08"'],
      ['vertical tab', '\x0b', '"\\x0b"'],
      ['form feed', '\x0c', '"\\x0c"'],
      ['escape', '\x1b', '"\\x1b"'],
      ['delete', '\x7f', '"\\x7f"'],
      ['next line', '\x85', '"\\x85"'],
    ];

    for (const [label, value, expected] of cases) {
      it(`escapes ${label}`, () => {
        expect(escapeYamlValue(value)).toBe(expected);
      });
    }

    it('leaves tab, line feed and carriage return on their own escapes', () => {
      expect(escapeYamlValue('\t')).toBe('"\t"');
      expect(escapeYamlValue('\n')).toBe('"\\n"');
      expect(escapeYamlValue('\r')).toBe('"\\r"');
    });

    it('emits no raw control byte for any code point below U+00A0', () => {
      for (let code = 0; code < 0xa0; code += 1) {
        const emitted = escapeYamlValue(String.fromCharCode(code));
        // Tab is the one non-printable YAML allows verbatim.
        if (code === 0x09) continue;
        expect(
          /[\x00-\x08\x0a-\x1f\x7f-\x9f]/.test(emitted),
          `code point ${code} emitted raw`
        ).toBe(false);
      }
    });
  });
});
