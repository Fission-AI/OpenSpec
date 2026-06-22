import { describe, it, expect } from 'vitest';
import { satisfies } from '../../../src/core/plugins/semver.js';

describe('plugins/semver satisfies', () => {
  it('matches wildcard ranges', () => {
    expect(satisfies('1.4.1', '*')).toBe(true);
    expect(satisfies('0.0.1', '')).toBe(true);
  });

  it('handles >= lower bounds', () => {
    expect(satisfies('1.4.1', '>=1.0.0')).toBe(true);
    expect(satisfies('1.4.1', '>=1.5.0')).toBe(false);
    expect(satisfies('1.0.0', '>=1.0.0')).toBe(true);
  });

  it('handles upper bounds and combined ranges (AND)', () => {
    expect(satisfies('1.4.1', '>=1.0.0 <2.0.0')).toBe(true);
    expect(satisfies('2.0.0', '>=1.0.0 <2.0.0')).toBe(false);
    expect(satisfies('1.4.1', '<=1.4.1')).toBe(true);
    expect(satisfies('1.4.2', '<=1.4.1')).toBe(false);
  });

  it('handles caret ranges', () => {
    expect(satisfies('1.9.9', '^1.0.0')).toBe(true);
    expect(satisfies('2.0.0', '^1.0.0')).toBe(false);
    // 0.x caret pins the minor
    expect(satisfies('0.4.9', '^0.4.0')).toBe(true);
    expect(satisfies('0.5.0', '^0.4.0')).toBe(false);
  });

  it('handles tilde ranges', () => {
    expect(satisfies('1.2.9', '~1.2.0')).toBe(true);
    expect(satisfies('1.3.0', '~1.2.0')).toBe(false);
  });

  it('handles wildcard segment ranges', () => {
    expect(satisfies('1.7.0', '1.x')).toBe(true);
    expect(satisfies('2.0.0', '1.x')).toBe(false);
    expect(satisfies('1.2.9', '1.2.x')).toBe(true);
    expect(satisfies('1.3.0', '1.2.x')).toBe(false);
  });

  it('exact match', () => {
    expect(satisfies('1.4.1', '1.4.1')).toBe(true);
    expect(satisfies('1.4.2', '1.4.1')).toBe(false);
  });

  it('ignores prerelease and v-prefix', () => {
    expect(satisfies('1.4.1-beta.2', '>=1.4.0')).toBe(true);
    expect(satisfies('v1.4.1', '>=1.4.0')).toBe(true);
  });

  it('returns false on unparseable version', () => {
    expect(satisfies('not-a-version', '>=1.0.0')).toBe(false);
  });
});
