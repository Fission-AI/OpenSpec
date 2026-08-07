import { describe, it, expect } from 'vitest';

import { isCiEnvironment } from '../../src/utils/ci.js';

describe('isCiEnvironment', () => {
  it('returns false when CI is unset', () => {
    expect(isCiEnvironment({})).toBe(false);
  });

  it.each(['true', '1', 'yes', 'TRUE', 'on', 'ci'])(
    'returns true for CI=%s',
    (value) => {
      expect(isCiEnvironment({ CI: value })).toBe(true);
    }
  );

  it.each(['false', '0', 'no', 'off', '', ' FALSE '])(
    'returns false for explicit off value CI=%s',
    (value) => {
      expect(isCiEnvironment({ CI: value })).toBe(false);
    }
  );
});
