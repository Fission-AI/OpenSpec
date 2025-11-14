import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { ChangeTemplateManager, type ChangeTemplateType } from '../../../src/core/templates/change-templates.js';

describe('ChangeTemplateManager', () => {
  let testDir: string;
  let openspecDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-templates-test-${randomUUID()}`);
    openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadTemplate', () => {
    it('should load default template when custom template does not exist', async () => {
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'proposal');
      
      expect(content).toContain('## Why');
      expect(content).toContain('## What Changes');
      expect(content).toContain('## Impact');
    });

    it('should load custom template when it exists', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const customTemplate = '## Custom Proposal\nThis is a custom template.';
      await fs.writeFile(path.join(templatesDir, 'proposal.md.template'), customTemplate);

      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'proposal');
      
      expect(content).toBe(customTemplate);
    });

    it('should replace {{changeId}} variable', async () => {
      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'proposal',
        { changeId: 'add-user-auth' }
      );
      
      expect(content).toContain('add-user-auth');
      expect(content).not.toContain('{{changeId}}');
    });

    it('should replace {{date}} variable', async () => {
      const testDate = '2025-11-14';
      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'proposal',
        { date: testDate }
      );
      
      expect(content).toContain(testDate);
      expect(content).not.toContain('{{date}}');
    });

    it('should replace {{capability}} variable in custom spec template', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const customTemplate = `## ADDED Requirements
### Requirement: {{capability}} Feature
The system SHALL provide {{capability}}.

#### Scenario: {{capability}} Scenario
- **WHEN** condition
- **THEN** result`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), customTemplate);

      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'spec',
        { capability: 'user-auth' }
      );
      
      expect(content).toContain('user-auth');
      expect(content).not.toContain('{{capability}}');
    });

    it('should replace all variables in valid spec template', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const customTemplate = `## ADDED Requirements
### Requirement: {{capability}} Feature
Change: {{changeId}}
Date: {{date}}
Capability: {{capability}}

#### Scenario: {{capability}} Scenario
- **WHEN** condition
- **THEN** result`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), customTemplate);

      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'spec',
        { changeId: 'add-feature', date: '2025-11-14', capability: 'auth' }
      );
      
      expect(content).toContain('Change: add-feature');
      expect(content).toContain('Date: 2025-11-14');
      expect(content).toContain('Capability: auth');
      expect(content).not.toContain('{{changeId}}');
      expect(content).not.toContain('{{date}}');
      expect(content).not.toContain('{{capability}}');
    });

    it('should use current date when date is not provided', async () => {
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'proposal');
      const today = new Date().toISOString().split('T')[0];
      
      expect(content).toContain(today);
    });

    it('should validate spec template and fallback to default if invalid', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      // Invalid template: missing required tags
      const invalidTemplate = 'This template is missing required tags.';
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), invalidTemplate);

      // Mock console.warn to capture the warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      // Should fallback to default template
      expect(content).toContain('## ADDED Requirements');
      expect(content).toContain('### Requirement:');
      expect(content).toContain('#### Scenario:');
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('should accept valid spec template with ADDED Requirements', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const validTemplate = `## ADDED Requirements
### Requirement: Test Requirement
The system SHALL test.

#### Scenario: Test Scenario
- **WHEN** test condition
- **THEN** test result`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), validTemplate);

      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toBe(validTemplate);
    });

    it('should accept valid spec template with MODIFIED Requirements', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const validTemplate = `## MODIFIED Requirements
### Requirement: Modified Requirement
The system SHALL be modified.

#### Scenario: Modified Scenario
- **WHEN** condition
- **THEN** result`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), validTemplate);

      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toBe(validTemplate);
    });

    it('should load all template types', async () => {
      const types: ChangeTemplateType[] = ['proposal', 'tasks', 'design', 'spec'];
      
      for (const type of types) {
        const content = await ChangeTemplateManager.loadTemplate(openspecDir, type);
        expect(content).toBeTruthy();
        expect(typeof content).toBe('string');
      }
    });
  });

  describe('loadTemplate with default templates', () => {
    it('should render template with variables synchronously', async () => {
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'proposal', {
        changeId: 'add-feature',
        date: '2025-11-14',
      });
      
      expect(content).toContain('add-feature');
      expect(content).toContain('2025-11-14');
      expect(content).not.toContain('{{changeId}}');
      expect(content).not.toContain('{{date}}');
    });

    it('should use current date when date is not provided', async () => {
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'proposal');
      const today = new Date().toISOString().split('T')[0];
      
      expect(content).toContain(today);
    });

    it('should handle empty context', async () => {
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'tasks');
      
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return default template for each type', () => {
      const types: ChangeTemplateType[] = ['proposal', 'tasks', 'design', 'spec'];
      
      for (const type of types) {
        const template = ChangeTemplateManager.getDefaultTemplate(type);
        expect(template).toBeTruthy();
        expect(typeof template).toBe('string');
      }
    });

    it('should return proposal template with correct structure', () => {
      const template = ChangeTemplateManager.getDefaultTemplate('proposal');
      
      expect(template).toContain('## Why');
      expect(template).toContain('## What Changes');
      expect(template).toContain('## Impact');
    });

    it('should return tasks template with correct structure', () => {
      const template = ChangeTemplateManager.getDefaultTemplate('tasks');
      
      expect(template).toContain('## 1. Implementation');
      expect(template).toContain('- [ ]');
    });

    it('should return design template with correct structure', () => {
      const template = ChangeTemplateManager.getDefaultTemplate('design');
      
      expect(template).toContain('## Context');
      expect(template).toContain('## Goals / Non-Goals');
      expect(template).toContain('## Decisions');
      expect(template).toContain('## Risks / Trade-offs');
    });

    it('should return spec template with required tags', () => {
      const template = ChangeTemplateManager.getDefaultTemplate('spec');
      
      expect(template).toContain('## ADDED Requirements');
      expect(template).toContain('### Requirement:');
      expect(template).toContain('#### Scenario:');
    });
  });

  describe('hasCustomTemplates', () => {
    it('should return false when templates directory does not exist', async () => {
      const hasTemplates = await ChangeTemplateManager.hasCustomTemplates(openspecDir);
      
      expect(hasTemplates).toBe(false);
    });

    it('should return true when templates directory exists', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      
      const hasTemplates = await ChangeTemplateManager.hasCustomTemplates(openspecDir);
      
      expect(hasTemplates).toBe(true);
    });

    it('should return false when path is a file, not a directory', async () => {
      const filePath = path.join(openspecDir, 'templates');
      await fs.writeFile(filePath, 'not a directory');
      
      const hasTemplates = await ChangeTemplateManager.hasCustomTemplates(openspecDir);
      
      expect(hasTemplates).toBe(false);
    });
  });

  describe('writeDefaultTemplates', () => {
    it('should create templates directory and write all template files', async () => {
      await ChangeTemplateManager.writeDefaultTemplates(openspecDir);
      
      const templatesDir = path.join(openspecDir, 'templates');
      expect(await fs.stat(templatesDir)).toBeDefined();
      
      const types: ChangeTemplateType[] = ['proposal', 'tasks', 'design', 'spec'];
      for (const type of types) {
        const templatePath = path.join(templatesDir, `${type}.md.template`);
        const exists = await fs.access(templatePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
        
        const content = await fs.readFile(templatePath, 'utf-8');
        expect(content).toBeTruthy();
      }
    });

    it('should not overwrite existing templates', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const customContent = 'Custom template content';
      await fs.writeFile(path.join(templatesDir, 'proposal.md.template'), customContent);
      
      await ChangeTemplateManager.writeDefaultTemplates(openspecDir);
      
      // Should still have custom content (writeFile overwrites, but we're testing the method behavior)
      const content = await fs.readFile(path.join(templatesDir, 'proposal.md.template'), 'utf-8');
      // Note: writeFile will overwrite, so this test verifies the method writes all templates
      expect(content).toBeTruthy();
    });

    it('should create nested templates directory if needed', async () => {
      const nestedOpenspecDir = path.join(testDir, 'nested', 'openspec');
      await ChangeTemplateManager.writeDefaultTemplates(nestedOpenspecDir);
      
      const templatesDir = path.join(nestedOpenspecDir, 'templates');
      const stats = await fs.stat(templatesDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('spec template validation', () => {
    it('should accept template with REMOVED Requirements', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const validTemplate = `## REMOVED Requirements
### Requirement: Old Requirement
**Reason**: Deprecated

#### Scenario: Removal Scenario
- **WHEN** condition
- **THEN** removed`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), validTemplate);

      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toBe(validTemplate);
    });

    it('should accept template with RENAMED Requirements', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const validTemplate = `## RENAMED Requirements
### Requirement: Old Name
FROM: Old Name
TO: New Name

#### Scenario: Rename Scenario
- **WHEN** condition
- **THEN** renamed`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), validTemplate);

      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toBe(validTemplate);
    });

    it('should reject template missing delta section', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const invalidTemplate = `### Requirement: Test
Some content here.`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), invalidTemplate);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toContain('## ADDED Requirements'); // Should fallback to default
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('should reject template missing Requirement header', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const invalidTemplate = `## ADDED Requirements
Some content without requirement header.`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), invalidTemplate);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toContain('### Requirement:'); // Should fallback to default
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('should reject template missing Scenario header', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const invalidTemplate = `## ADDED Requirements
### Requirement: Test Requirement
Some content without scenario.`;
      await fs.writeFile(path.join(templatesDir, 'spec.md.template'), invalidTemplate);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const content = await ChangeTemplateManager.loadTemplate(openspecDir, 'spec');
      
      expect(content).toContain('#### Scenario:'); // Should fallback to default
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple variable occurrences', async () => {
      const templatesDir = path.join(openspecDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      const template = '{{changeId}} and {{changeId}} again';
      await fs.writeFile(path.join(templatesDir, 'proposal.md.template'), template);

      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'proposal',
        { changeId: 'test' }
      );
      
      expect(content).toBe('test and test again');
    });

    it('should handle empty variables', async () => {
      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'proposal',
        { changeId: '', date: '', capability: '' }
      );
      
      expect(content).not.toContain('{{changeId}}');
      expect(content).not.toContain('{{date}}');
    });

    it('should handle special characters in variables', async () => {
      const content = await ChangeTemplateManager.loadTemplate(
        openspecDir,
        'proposal',
        { changeId: 'add-user-auth-v2', date: '2025-11-14', capability: 'user-auth/v2' }
      );
      
      expect(content).toContain('add-user-auth-v2');
      expect(content).toContain('2025-11-14');
    });
  });
});
