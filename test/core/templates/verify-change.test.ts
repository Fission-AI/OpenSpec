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

  it('uses schema-aware apply task fields instead of a hardcoded tasks artifact id', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('top-level `tasks` and `progress`');
      expect(body, label).toContain("schema's `apply.tracks` configuration");
      expect(body, label).toContain('do not look for a `contextFiles.tasks` artifact id');
      expect(body, label).toContain('`tasks` is empty and `progress.total` is 0');
      expect(body, label).not.toContain('`contextFiles.tasks` exists');
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
      expect(body, label).toContain('If any check was skipped and there are no CRITICAL issues');
      expect(body, label).toContain(
        'If any check was skipped, also name every skipped check and its reason'
      );
      expect(body, label).toContain('do not claim readiness');
      expect(body, label).toContain('If no issues and no checks were skipped');
    }
  });
});
