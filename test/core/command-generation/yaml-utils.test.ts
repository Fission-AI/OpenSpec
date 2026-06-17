import { describe, expect, it } from 'vitest';
import { escapeYamlValue } from '../../../src/core/command-generation/utils/yaml.js';

describe('command-generation/yaml utils', () => {
  it('leaves plain scalar values unquoted', () => {
    expect(escapeYamlValue('OpenSpec Explore')).toBe('OpenSpec Explore');
  });

  it('escapes YAML double-quoted scalars', () => {
    expect(escapeYamlValue('Fix: "auth"\\path')).toBe('"Fix: \\"auth\\"\\\\path"');
  });

  it('escapes line feed and carriage return characters', () => {
    expect(escapeYamlValue('Line 1\nLine 2\rLine 3')).toBe('"Line 1\\nLine 2\\rLine 3"');
  });
});
