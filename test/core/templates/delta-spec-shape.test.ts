import { describe, expect, it } from 'vitest';

import {
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxSyncCommandTemplate,
  getSyncSpecsSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';

// Regression for #2173: `artifactPaths.specs.existingOutputPaths` resolves the
// schema glob `specs/**/*.md`, so it also lists files such as
// `specs/user-auth/notes.md`. `openspec validate` and `openspec archive` read
// only `specs/<capability-path>/spec.md` (#1869), but the archive and sync
// workflows merged every listed file into the main specs. Each workflow must
// apply the CLI's rule before it writes a main spec or moves the change.

// The CLI already finds misplaced delta sections anywhere under specs/
// (findUnreadDeltaFiles), so the workflows only name the delta-spec shape and
// defer the check to `openspec validate` instead of restating it.
const SHAPE_RULE = 'Only `specs/<capability-path>/spec.md` entries (treat `\\` and `/` alike) are delta specs';
const LOOKUP_RULE = 'get a rules lookup';

function between(body: string, startMarker: string, endMarker: string, label: string): string {
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker, start);

  expect(start, label).toBeGreaterThanOrEqual(0);
  expect(end, label).toBeGreaterThan(start);

  return body.slice(start, end);
}

const workflows = [
  {
    name: 'sync',
    bodies: [
      ['skill', getSyncSpecsSkillTemplate().instructions],
      ['command', getOpsxSyncCommandTemplate().content],
    ],
    step: ['3. **Find delta specs**', '4. **'],
    stop: 'stop before writing any main spec and show its errors',
  },
  {
    name: 'archive',
    bodies: [
      ['skill', getArchiveChangeSkillTemplate().instructions],
      ['command', getOpsxArchiveCommandTemplate().content],
    ],
    step: ['4. **Assess delta spec sync state**', '**If delta specs exist:**'],
    stop: 'stop without syncing or archiving and show its errors',
  },
  {
    name: 'bulk archive',
    bodies: [
      ['skill', getBulkArchiveChangeSkillTemplate().instructions],
      ['command', getOpsxBulkArchiveCommandTemplate().content],
    ],
    step: ['c. **Delta specs**', 'd. **Archive target**'],
    stop: "mark it `Blocked` with validate's first error",
  },
] as const;

describe('delta spec shape in archive and sync workflows (#2173)', () => {
  for (const workflow of workflows) {
    it(`${workflow.name} syncs only capability spec.md files and defers the check to validate`, () => {
      for (const [surface, body] of workflow.bodies) {
        const label = `${workflow.name} ${surface}`;
        const step = between(body, workflow.step[0], workflow.step[1], label).replace(/\s+/g, ' ');

        expect(step, label).toContain(SHAPE_RULE);
        expect(step, label).toContain(LOOKUP_RULE);
        expect(step, label).toContain('openspec validate "<name>"');
        expect(step, label).toContain(workflow.stop);
      }
    });
  }

  it('sync narrows existingOutputPaths before it syncs any path', () => {
    for (const [surface, body] of workflows[0].bodies) {
      const step = between(body, '3. **Find delta specs**', '4. **', surface);
      const narrowed = step.indexOf('`existingOutputPaths` means only those');
      const syncEvery = step.indexOf('Sync every path in `existingOutputPaths`');
      expect(narrowed, surface).toBeGreaterThanOrEqual(0);
      expect(narrowed, surface).toBeLessThan(syncEvery);
    }
  });
});
