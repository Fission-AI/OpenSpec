import { describe, expect, it } from 'vitest';
import {
  fingerprintGeneratedContent,
  isReleasedGeneratedContent,
} from '../../../src/core/shared/generated-fingerprint.js';
import { RELEASED_GENERATED_FINGERPRINTS } from '../../../src/core/shared/released-generated-fingerprints.js';
import { isRedundantLegacyCopy } from '../../../src/core/shared/skill-content-equivalence.js';

const skill = (version: string, body: string, eol = '\n') =>
  ['---', 'name: openspec-propose', 'metadata:', `  generatedBy: "${version}"`, '---', body, ''].join(eol);

describe('generated file fingerprints', () => {
  it('ignores the release version, line endings, and a BOM', () => {
    const base = fingerprintGeneratedContent(skill('1.0.0', 'Propose a change.'));
    expect(fingerprintGeneratedContent(skill('1.16.0', 'Propose a change.'))).toBe(base);
    expect(fingerprintGeneratedContent(skill('1.0.0', 'Propose a change.', '\r\n'))).toBe(base);
    expect(fingerprintGeneratedContent('﻿' + skill('1.0.0', 'Propose a change.'))).toBe(base);
  });

  it('treats any change to the body or a custom generatedBy as material', () => {
    const base = fingerprintGeneratedContent(skill('1.0.0', 'Propose a change.'));
    expect(fingerprintGeneratedContent(skill('1.0.0', 'Propose a change!'))).not.toBe(base);
    expect(fingerprintGeneratedContent(skill('my-fork', 'Propose a change.'))).not.toBe(base);
  });

  it('records released output as sorted, unique 16-hex fingerprints', () => {
    expect(RELEASED_GENERATED_FINGERPRINTS.length).toBeGreaterThan(0);
    expect(RELEASED_GENERATED_FINGERPRINTS.every((f) => /^[0-9a-f]{16}$/.test(f))).toBe(true);
    expect([...RELEASED_GENERATED_FINGERPRINTS].sort()).toEqual(RELEASED_GENERATED_FINGERPRINTS);
    expect(new Set(RELEASED_GENERATED_FINGERPRINTS).size).toBe(RELEASED_GENERATED_FINGERPRINTS.length);
  });

  it('does not recognize empty or user-written content', () => {
    expect(isReleasedGeneratedContent('')).toBe(false);
    expect(isReleasedGeneratedContent('# My own notes\n')).toBe(false);
  });
});

describe('redundant legacy copies', () => {
  const current = skill('9.9.9', 'Current release text.');

  it('drops a copy that matches the current file', () => {
    expect(isRedundantLegacyCopy(current, current, true)).toBe(true);
  });

  it('keeps a copy that is neither current nor released output', () => {
    expect(isRedundantLegacyCopy(skill('1.0.0', 'Text the user rewrote.'), current, true)).toBe(false);
  });
});
