import { describe, it, expect } from 'vitest';
import {
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxBulkArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

// The keystone: every archive surface must drive archiving through the
// `openspec archive` CLI (which validates + syncs + moves deterministically),
// never by moving files or merging specs in the agent.
const surfaces: Array<[string, string]> = [
  ['openspec-archive-change skill', getArchiveChangeSkillTemplate().instructions],
  ['/opsx:archive command', getOpsxArchiveCommandTemplate().content],
  ['openspec-bulk-archive-change skill', getBulkArchiveChangeSkillTemplate().instructions],
  ['/opsx:bulk-archive command', getOpsxBulkArchiveCommandTemplate().content],
];

describe('archive templates call the CLI (keystone)', () => {
  for (const [name, body] of surfaces) {
    it(`${name} invokes \`openspec archive\``, () => {
      expect(body).toContain('openspec archive');
    });

    it(`${name} does not move the change with a raw mv`, () => {
      expect(body).not.toMatch(/\bmv "/);
      expect(body).not.toMatch(/mkdir -p "<planningHome\.changesDir>\/archive"/);
    });

    it(`${name} does not delegate sync to the openspec-sync-specs skill`, () => {
      // The only permitted mention is the explicit "do NOT run openspec-sync-specs" guidance.
      const offending = body
        .split('\n')
        .filter((l) => l.includes('openspec-sync-specs') && !/do not|don'?t|never/i.test(l));
      expect(offending).toEqual([]);
    });
  }
});
