import { describe, expect, it } from 'vitest';

import { SCHEMA_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/schema-selection.js';

describe('schema selection guidance', () => {
  it('defines the complete fail-closed selection and confirmation contract', () => {
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('openspec schemas --json');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('`description` as the authority');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      '`name` and `artifacts` only to identify, display, and explain candidates'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('exactly one is a clear match');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('treat that choice as confirmed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('stop and wait for confirmation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      "user's current request or the selected schema's description"
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('clearly and unambiguously');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('explicitly asks for confirmation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Never silently use the default schema');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('rejects a recommendation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('cannot be parsed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('returns no schemas');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Do not fall back to the default');
  });
});
