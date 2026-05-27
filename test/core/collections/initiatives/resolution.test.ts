import { describe, expect, it } from 'vitest';

import { initiativeDiagnosticFromError } from '../../../../src/core/collections/initiatives/index.js';

describe('initiative resolution diagnostics', () => {
  it('classifies already-exists errors without regex backtracking', () => {
    expect(
      initiativeDiagnosticFromError(
        new Error("Initiative 'billing-launch' already exists at /tmp/store/initiatives/billing-launch")
      )
    ).toEqual(
      expect.objectContaining({
        code: 'initiative_already_exists',
        target: 'initiative.id',
      })
    );

    const diagnostic = initiativeDiagnosticFromError(new Error("Initiative '".repeat(32000)));
    expect(diagnostic.code).toBe('initiative_error');
  });
});
