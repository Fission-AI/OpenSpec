import { describe, expect, it } from 'vitest';

import {
  getOpsxVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';

const skill = getVerifyChangeSkillTemplate();
const command = getOpsxVerifyCommandTemplate();

const bodies: Array<[string, string]> = [
  ['skill', skill.instructions],
  ['command', command.content],
];

describe('verify-change templates', () => {
  it('keeps active no-task changes eligible for ambiguous selection', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('show all active changes returned by the list');
      expect(body, label).toContain('including changes with `status: "no-tasks"`');
      expect(body, label).not.toContain(
        'show changes that have implementation tasks (tasks artifact exists)'
      );
    }
  });

  it('prefers schema-aware apply task fields without assuming a tasks artifact id', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('top-level `tasks` and `progress`');
      expect(body, label).toContain("schema's `apply.tracks` configuration");
      expect(body, label).toContain('do not assume every schema uses a `tasks` artifact id');
      expect(body, label).toContain('If neither source provides task descriptions');
    }
  });

  it('preserves task checks when apply metadata cannot represent glob artifacts', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('If `tasks` is empty but `contextFiles.tasks` contains paths');
      expect(body, label).toContain('read every resolved file and count its checkboxes');
      expect(body, label).toContain('Label these as artifact-derived totals');
      expect(body, label).toContain('do not report the zero apply totals as completion');
      expect(body, label).toContain('or the fallback files contain incomplete checkboxes');
    }
  });

  it('does not lose incomplete checkboxes omitted from the task list', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('If `progress.remaining` is greater than 0');
      expect(body, label).toContain('incomplete checkboxes without descriptions');
      expect(body, label).toContain('Do not infer completion from the listed tasks alone');
    }
  });

  it('requires usable evidence rather than just existing artifact paths', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('cannot be read or contain no usable requirements, scenarios, or design decisions');
      expect(body, label).toContain('Continue checks supported by the remaining evidence');
      expect(body, label).toContain('a partially checked input set is not a fully verified check');
      expect(body, label).toContain('If implementation changes cannot be identified, mark **Code Pattern Consistency** as not verified');
    }
  });

  it('does not mistake apply readiness for verification or execute apply instructions', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Treat apply `state` and `instruction` as context, not a verification verdict');
      expect(body, label).toContain('Do not implement tasks or archive the change during verification');
    }
  });

  it('preserves optional artifacts and the existing archive workflow', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Verification is advisory');
      expect(body, label).toContain('`skip_specs: true`');
      expect(body, label).toContain('schemas without task tracking');
      expect(body, label).toContain('Do not require or invent optional or intentionally omitted artifacts');
      expect(body, label).toContain('`Not verified` describes a limit of this report, not a new archive prerequisite');
      expect(body, label).toContain('Archive retains its own checks and user-confirmation behavior');
    }
  });

  it('preserves task-only verification without dropping checks supported by other artifacts', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('If only task evidence is available, verify task completion only');
      expect(body, label).toContain('including **Code Pattern Consistency**, as not verified');
      expect(body, label).toContain('With other supporting artifacts, **Code Pattern Consistency** still runs');
    }
  });

  it('covers warning and suggestion outcomes without claiming all checks passed', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('If no CRITICAL issues, one or more warnings, and no checks were skipped');
      expect(body, label).toContain('If only suggestions and no checks were skipped');
      expect(body, label).toContain('Include the suggestion count when nonzero');
    }
  });

  it('maps missing supporting artifacts to every check they prevent', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'mark **Spec Coverage**, **Requirement Implementation Mapping**, and **Scenario Coverage** as not verified'
      );
      expect(body, label).toContain('mark **Design Adherence** as not verified');
      expect(body, label).toContain('**Code Pattern Consistency** still runs');
    }
  });

  it('never reports a skipped check as passing or archive-ready', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('`Not verified (<reason>)` for every skipped check');
      expect(body, label).toContain('Never score a skipped check as passing');
      expect(body, label).toContain('Treat every not verified or partially verified check as skipped in the final assessment');
      expect(body, label).toContain('If any check was skipped and there are no CRITICAL issues');
      expect(body, label).toContain(
        'If any check was skipped, also name every skipped check and its reason'
      );
      expect(body, label).toContain('do not claim readiness');
      expect(body, label).toContain('If no issues and no checks were skipped');
    }
  });
});
