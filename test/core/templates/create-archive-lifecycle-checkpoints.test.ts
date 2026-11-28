import { describe, it, expect } from 'vitest';
import {
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/workflows/propose.js';
import {
  getNewChangeSkillTemplate,
  getOpsxNewCommandTemplate,
} from '../../../src/core/templates/workflows/new-change.js';
import {
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
} from '../../../src/core/templates/workflows/archive-change.js';
import {
  getBulkArchiveChangeSkillTemplate,
  getOpsxBulkArchiveCommandTemplate,
} from '../../../src/core/templates/workflows/bulk-archive-change.js';

/** The text of one numbered step, up to the next numbered step or bold section. */
function step(body: string, n: number): string {
  const start = body.indexOf(`\n${n}. **`);
  expect(start, `step ${n} exists`).toBeGreaterThan(-1);
  const next = body.indexOf(`\n${n + 1}. **`, start);
  return body.slice(start, next === -1 ? body.indexOf('\n**', start + 1) : next);
}

const proposeBodies: Array<[string, string]> = [
  ['propose skill', getOpsxProposeSkillTemplate().instructions],
  ['propose command', getOpsxProposeCommandTemplate().content],
];
const newBodies: Array<[string, string]> = [
  ['new skill', getNewChangeSkillTemplate().instructions],
  ['new command', getOpsxNewCommandTemplate().content],
];
const archiveBodies: Array<[string, string]> = [
  ['archive skill', getArchiveChangeSkillTemplate().instructions],
  ['archive command', getOpsxArchiveCommandTemplate().content],
];
const bulkBodies: Array<[string, string]> = [
  ['bulk-archive skill', getBulkArchiveChangeSkillTemplate().instructions],
  ['bulk-archive command', getOpsxBulkArchiveCommandTemplate().content],
];

const CREATE_READ = 'openspec instructions create --json';
const NEW_CHANGE = 'openspec new change "<name>"';

describe('lifecycle checkpoints never call the lookup command', () => {
  it('takes actions from operation reads only', () => {
    for (const [label, body] of [...proposeBodies, ...newBodies, ...archiveBodies, ...bulkBodies]) {
      expect(body, label).not.toMatch(/```bash\n\s*openspec lifecycle actions/);
      expect(body, label).toContain('never from `openspec lifecycle actions`');
      expect(body, label).toContain(
        'What an action does, including pausing for input, comes from its own `instructions`'
      );
    }
  });
});

describe('change.create.before in propose', () => {
  it('reads create inputs in step 2 instead of openspec context and config.yaml', () => {
    for (const [label, body] of proposeBodies) {
      const s2 = step(body, 2);
      expect(s2, label).toContain(`\`${CREATE_READ}\``);
      expect(s2, label).toContain('`lifecycle` (`before`, `handling`) or `lifecycleError`');
      expect(s2, label).toContain('Older CLIs omit both. When both are absent, skip the lifecycle step below.');
      expect(s2, label).not.toContain('config.yaml');
    }
  });

  it('falls back to openspec context when the CLI predates instructions create', () => {
    for (const [label, body] of proposeBodies) {
      const s2 = step(body, 2);
      expect(s2, label).toContain('If the JSON has no `root` field, the CLI predates `instructions create`');
      expect(s2, label).toContain('Run `openspec context --json` the same way');
      expect(s2, label).toContain('continue without early project context or lifecycle actions');
    }
  });

  it('handles before, or stops on lifecycleError, before creating the change', () => {
    for (const [label, body] of proposeBodies) {
      const s4 = step(body, 4);
      const error = s4.indexOf(
        'If `lifecycleError` is present: report its `issues` and `fix`, and stop without creating or editing any files.'
      );
      const before = s4.indexOf('If `lifecycle.before` is present: handle it following `lifecycle.handling`.');
      expect(error, label).toBeGreaterThan(-1);
      expect(before, label).toBeGreaterThan(error);
      expect(s4.indexOf(NEW_CHANGE), label).toBeGreaterThan(before);
    }
  });
});

describe('change.create.before in new', () => {
  it('uses the create read as the project check, before openspec new change', () => {
    for (const [label, body] of newBodies) {
      const s3 = step(body, 3);
      expect(s3, label).toContain(`\`${CREATE_READ}\``);
      expect(s3, label).toContain('This is the **Project check** above: run it instead of `openspec list --json`');
      expect(s3.indexOf(CREATE_READ), label).toBeLessThan(s3.indexOf(NEW_CHANGE));
    }
  });

  it('falls back to the list-based project check when the CLI predates instructions create', () => {
    for (const [label, body] of newBodies) {
      expect(step(body, 3), label).toContain(
        'If the JSON has no `root` field, the CLI predates `instructions create`: run the **Project check** with `openspec list --json` as written and continue without lifecycle actions.'
      );
    }
  });

  it('handles before, or stops on lifecycleError, before creating any files', () => {
    for (const [label, body] of newBodies) {
      const s3 = step(body, 3);
      const error = s3.indexOf(
        'If `lifecycleError` is present: report its `issues` and `fix`, and stop without creating any files.'
      );
      const before = s3.indexOf('If `lifecycle.before` is present: handle it following `lifecycle.handling`.');
      expect(error, label).toBeGreaterThan(-1);
      expect(before, label).toBeGreaterThan(error);
      expect(s3.indexOf(NEW_CHANGE), label).toBeGreaterThan(before);
    }
  });
});

describe('change.archive.* in archive', () => {
  it('reads lifecycle from the existing archive-inputs read', () => {
    for (const [label, body] of archiveBodies) {
      const s1 = step(body, 1);
      expect(s1, label).toContain('openspec instructions archive --change "<name>" --json');
      expect(s1, label).toContain('`lifecycle` (`before`, `completed`,\n   `handling`) or `lifecycleError`');
      expect(s1, label).toContain('Older CLIs omit both. When both are absent, skip every lifecycle step below.');
      expect(s1, label).toContain('no lifecycle actions');
    }
  });

  it('handles before, or stops on lifecycleError, before syncing specs or moving the change', () => {
    for (const [label, body] of archiveBodies) {
      const s4 = step(body, 4);
      const error = s4.indexOf(
        'If `lifecycleError` is present: report its `issues` and `fix`, and stop before syncing specs or moving the change.'
      );
      const before = s4.indexOf('If `lifecycle.before` is present: handle it following `lifecycle.handling`.');
      expect(error, label).toBeGreaterThan(-1);
      expect(before, label).toBeGreaterThan(error);
      expect(s4.indexOf('openspec instructions specs'), label).toBeGreaterThan(before);
      expect(s4, label).toContain('Archiving never reaches `lifecycle.completed` on a broken config.');
    }
  });

  it('handles completed after the move, whether or not specs were synced', () => {
    for (const [label, body] of archiveBodies) {
      const s5 = step(body, 5);
      const completed = s5.indexOf(
        'After the move, if `lifecycle.completed` is present, handle it once following `lifecycle.handling`, whether or not specs were synced.'
      );
      expect(completed, label).toBeGreaterThan(s5.indexOf('mv "<changeRoot>"'));
    }
  });
});

describe('change.archive.* in bulk-archive', () => {
  it('reads lifecycle once from the existing archive-inputs read', () => {
    for (const [label, body] of bulkBodies) {
      const s2 = step(body, 2);
      expect(body.match(/openspec instructions archive --change/g), label).toHaveLength(1);
      expect(s2, label).toContain('`lifecycle` (`before`, `completed`,\n   `handling`) or `lifecycleError`');
      expect(s2, label).toContain('They apply to every change in the batch.');
      expect(s2, label).toContain('no lifecycle actions');
    }
  });

  it('stops the batch on lifecycleError and handles before per change before sync or move', () => {
    for (const [label, body] of bulkBodies) {
      const s8 = step(body, 8);
      const error = s8.indexOf(
        'If `lifecycleError` is present: report its `issues` and `fix`, and stop the whole batch before any main-spec write or change move.'
      );
      const before = s8.indexOf(
        'If `lifecycle.before` is present, handle it once for each change, following `lifecycle.handling`, before 8a syncs or 8c moves that change.'
      );
      expect(error, label).toBeGreaterThan(-1);
      expect(before, label).toBeGreaterThan(error);
      expect(s8.indexOf('a. **Sync included delta specs**'), label).toBeGreaterThan(before);
    }
  });

  it('handles completed once per change after its move, whether or not specs were synced', () => {
    for (const [label, body] of bulkBodies) {
      const s8 = step(body, 8);
      const completed = s8.indexOf(
        '**After a successful move**, if `lifecycle.completed` is present, handle it once for this change following `lifecycle.handling`, whether or not its specs were synced.'
      );
      expect(completed, label).toBeGreaterThan(s8.indexOf('**Confirm the move did not nest:**'));
      expect(completed, label).toBeLessThan(s8.indexOf('d. **Track outcome**'));
    }
  });
});
