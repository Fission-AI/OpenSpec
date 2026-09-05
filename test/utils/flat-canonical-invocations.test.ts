import { describe, expect, it } from 'vitest';

import { CANONICAL_INVOCATION } from '../../src/core/command-generation/invocation.js';
import { getOpsxApplyCommandTemplate } from '../../src/core/templates/skill-templates.js';
import {
  getSkillReferenceTransformer,
  transformCommandInvocations,
} from '../../src/utils/command-references.js';

describe('flat canonical workflow invocations', () => {
  it('uses flat slash syntax as the raw canonical form', () => {
    expect(CANONICAL_INVOCATION).toEqual({ style: 'flat', prefix: '/' });
    const body = getOpsxApplyCommandTemplate().content;
    expect(body).toContain('/opsx-');
    expect(body).not.toContain('/opsx:');
  });

  it('maps both legacy and canonical command references to skills', () => {
    const transform = getSkillReferenceTransformer('vibe');
    expect(transform('/opsx:apply')).toBe('/openspec-apply-change');
    expect(transform('/opsx-apply')).toBe('/openspec-apply-change');
  });

  it('maps flat canonical input to namespaced tools', () => {
    expect(
      transformCommandInvocations('/opsx-apply', { style: 'namespaced', prefix: '/' })
    ).toBe('/opsx:apply');
  });

  it('normalizes legacy colon input for flat tools', () => {
    expect(transformCommandInvocations('/opsx:apply', { style: 'flat', prefix: '/' })).toBe(
      '/opsx-apply'
    );
  });
});
