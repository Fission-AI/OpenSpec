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

// Anchored to changeRoot: a custom schema can generate extras/specs/**/*.md,
// which a plain suffix match would accept but the CLI never reads.
const SHAPE_RULE = 'Only an entry whose path relative to `changeRoot` (from the status JSON)';
const ANCHORED_SHAPE = 'is `specs/<capability-path>/spec.md` is a delta spec';
const DELTA_SECTIONS =
  '`## ADDED`, `## MODIFIED`, `## REMOVED` or `## RENAMED Requirements`';

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
    stop: 'stop before writing any main spec',
  },
  {
    name: 'archive',
    bodies: [
      ['skill', getArchiveChangeSkillTemplate().instructions],
      ['command', getOpsxArchiveCommandTemplate().content],
    ],
    step: ['4. **Assess delta spec sync state**', '**If delta specs exist:**'],
    stop: 'stop without syncing or archiving',
  },
  {
    name: 'bulk archive',
    bodies: [
      ['skill', getBulkArchiveChangeSkillTemplate().instructions],
      ['command', getOpsxBulkArchiveCommandTemplate().content],
    ],
    step: ['c. **Delta specs**', 'd. **Archive target**'],
    stop: 'mark the change `Blocked` with `Delta outside a capability spec.md: <path>`',
  },
] as const;

describe('delta spec shape in archive and sync workflows (#2173)', () => {
  for (const workflow of workflows) {
    it(`${workflow.name} treats only a capability spec.md as a delta spec`, () => {
      for (const [surface, body] of workflow.bodies) {
        const label = `${workflow.name} ${surface}`;
        const step = between(body, workflow.step[0], workflow.step[1], label);

        expect(step, label).toContain(SHAPE_RULE);
        expect(step, label).toContain(ANCHORED_SHAPE);
        // existingOutputPaths come from path.normalize, so Windows entries end
        // in specs\<capability-path>\spec.md and must still count as deltas.
        expect(step, label).toContain('treat `\\` and `/` alike');
        expect(step, label).toContain(DELTA_SECTIONS);
        expect(step, label).toContain(workflow.stop);
        // A file with no delta section is a note, not something to block on.
        expect(step, label).toMatch(/notes?, (?:not a delta|left out of the sync)|are notes/);
      }
    });
  }

  it('sync checks the shape before it syncs any path', () => {
    for (const [surface, body] of workflows[0].bodies) {
      const step = between(body, '3. **Find delta specs**', '4. **', surface);
      const rule = step.indexOf(SHAPE_RULE);
      // Later steps sync "every path in existingOutputPaths", so the note
      // exclusion must narrow that list, not just one sentence of step 3.
      const narrowed = step.indexOf('`existingOutputPaths` means the list without those notes');
      const syncEvery = step.indexOf('Sync every path in `existingOutputPaths`');
      expect(rule, surface).toBeGreaterThanOrEqual(0);
      expect(narrowed, surface).toBeGreaterThan(rule);
      expect(narrowed, surface).toBeLessThan(syncEvery);
    }
  });
});
