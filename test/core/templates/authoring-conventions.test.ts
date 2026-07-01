import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { AUTHORING_CONVENTIONS_REFERENCE } from '../../../src/core/templates/workflows/authoring-conventions.js';

const here = dirname(fileURLToPath(import.meta.url));
const conceptsPath = join(here, '../../../docs/concepts.md');

// Anchors that MUST appear in both docs/concepts.md and the authoring-conventions
// reference. If either side drops one, the reference and the docs have drifted —
// which is exactly what this test exists to catch (#1289).
const SHARED_ANCHORS = [
  'Observable behavior users or downstream systems rely on',
  'Inputs, outputs, and error conditions',
  'Library or framework choices',
  'ADDED',
  'MODIFIED',
  'REMOVED',
  'SHOULD',
  'MAY',
  'Lite',
  'Full',
];

describe('authoring-conventions reference stays aligned with docs/concepts.md', () => {
  const concepts = readFileSync(conceptsPath, 'utf8');

  it('concepts.md still contains every shared anchor', () => {
    for (const anchor of SHARED_ANCHORS) {
      expect(concepts.includes(anchor), `concepts.md missing "${anchor}"`).toBe(true);
    }
  });

  it('the reference restates every shared anchor', () => {
    for (const anchor of SHARED_ANCHORS) {
      expect(
        AUTHORING_CONVENTIONS_REFERENCE.includes(anchor),
        `authoring-conventions reference missing "${anchor}"`
      ).toBe(true);
    }
  });
});
