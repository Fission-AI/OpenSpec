import { describe, it, expect } from 'vitest';
import {
  getOpsxMultiagentApplySkillTemplate,
  getOpsxMultiagentApplyCommandTemplate,
  getOpsxMultiagentSkillTemplate,
  getOpsxMultiagentCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

describe('multiagent-apply templates', () => {
  describe('getOpsxMultiagentApplySkillTemplate', () => {
    it('should return a valid SkillTemplate', () => {
      const template = getOpsxMultiagentApplySkillTemplate();

      expect(template.name).toBe('openspec-multiagent-apply');
      expect(template.description).toBeTruthy();
      expect(template.instructions).toBeTruthy();
      expect(template.license).toBe('MIT');
    });

    it('should reference TeamCreate in instructions', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).toContain('TeamCreate');
    });

    it('should reference TaskCreate in instructions', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).toContain('TaskCreate');
    });

    it('should reference TaskUpdate in instructions', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).toContain('TaskUpdate');
    });

    it('should reference worktree isolation in instructions', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).toContain('worktree');
    });

    it('should reference dispec-driven schema validation', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).toContain('dispec-driven');
    });

    it('should reference shutdown_request', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).toContain('shutdown_request');
    });

    it('should not reference TodoWrite', () => {
      const template = getOpsxMultiagentApplySkillTemplate();
      expect(template.instructions).not.toContain('TodoWrite');
    });
  });

  describe('getOpsxMultiagentApplyCommandTemplate', () => {
    it('should return a valid CommandTemplate', () => {
      const template = getOpsxMultiagentApplyCommandTemplate();

      expect(template.name).toBe('OPSX: Multiagent Apply');
      expect(template.description).toBeTruthy();
      expect(template.category).toBe('Workflow');
      expect(template.tags).toContain('multiagent');
      expect(template.tags).toContain('apply');
      expect(template.content).toBeTruthy();
    });

    it('should not reference TodoWrite', () => {
      const template = getOpsxMultiagentApplyCommandTemplate();
      expect(template.content).not.toContain('TodoWrite');
    });
  });
});

describe('existing multiagent templates do not reference TodoWrite', () => {
  it('multiagent skill template should not reference TodoWrite', () => {
    const template = getOpsxMultiagentSkillTemplate();
    expect(template.instructions).not.toContain('TodoWrite');
  });

  it('multiagent command template should not reference TodoWrite', () => {
    const template = getOpsxMultiagentCommandTemplate();
    expect(template.content).not.toContain('TodoWrite');
  });

  it('multiagent skill template should reference TaskCreate', () => {
    const template = getOpsxMultiagentSkillTemplate();
    expect(template.instructions).toContain('TaskCreate');
  });

  it('multiagent skill template should reference /opsx:multiagent-apply', () => {
    const template = getOpsxMultiagentSkillTemplate();
    expect(template.instructions).toContain('/opsx:multiagent-apply');
  });
});
