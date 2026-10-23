import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getSkillTemplates,
  getCommandTemplates,
  getCommandContents,
  generateSkillContent,
  generateSkillFiles,
  writeSkillFiles,
} from '../../../src/core/shared/skill-generation.js';
import { optionalWorkflow } from '../../../src/core/templates/optional-workflow.js';
import { withReferences } from '../../../src/core/templates/workflows/references.js';
import type { SkillTemplate } from '../../../src/core/templates/types.js';

describe('skill-generation', () => {
  describe('getSkillTemplates', () => {
    it('should return all 12 skill templates', () => {
      const templates = getSkillTemplates();
      expect(templates).toHaveLength(12);
    });

    it('should have unique directory names', () => {
      const templates = getSkillTemplates();
      const dirNames = templates.map(t => t.dirName);
      const uniqueDirNames = new Set(dirNames);
      expect(uniqueDirNames.size).toBe(templates.length);
    });

    it('should include all expected skills', () => {
      const templates = getSkillTemplates();
      const dirNames = templates.map(t => t.dirName);

      expect(dirNames).toContain('openspec-explore');
      expect(dirNames).toContain('openspec-new-change');
      expect(dirNames).toContain('openspec-continue-change');
      expect(dirNames).toContain('openspec-apply-change');
      expect(dirNames).toContain('openspec-update-change');
      expect(dirNames).toContain('openspec-ff-change');
      expect(dirNames).toContain('openspec-sync-specs');
      expect(dirNames).toContain('openspec-archive-change');
      expect(dirNames).toContain('openspec-bulk-archive-change');
      expect(dirNames).toContain('openspec-verify-change');
      expect(dirNames).toContain('openspec-onboard');
      expect(dirNames).toContain('openspec-propose');
    });

    it('should have valid template structure', () => {
      const templates = getSkillTemplates();

      for (const { template, dirName, workflowId } of templates) {
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.instructions).toBeTruthy();
        expect(dirName).toBeTruthy();
        expect(workflowId).toBeTruthy();
      }
    });

    it('should have unique workflow IDs', () => {
      const templates = getSkillTemplates();
      const ids = templates.map(t => t.workflowId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(templates.length);
    });

    it('should filter by workflow IDs when provided', () => {
      const filtered = getSkillTemplates(['propose', 'explore', 'apply', 'archive']);
      expect(filtered).toHaveLength(4);
      const ids = filtered.map(t => t.workflowId);
      expect(ids).toContain('propose');
      expect(ids).toContain('explore');
      expect(ids).toContain('apply');
      expect(ids).toContain('archive');
      expect(ids).not.toContain('new');
      expect(ids).not.toContain('ff');
    });

    it('should return all templates when filter is undefined', () => {
      const all = getSkillTemplates();
      const noFilter = getSkillTemplates(undefined);
      expect(noFilter).toHaveLength(all.length);
    });

    it('should return empty array when filter matches nothing', () => {
      const filtered = getSkillTemplates(['nonexistent']);
      expect(filtered).toHaveLength(0);
    });

    it('should return single template when filter has one workflow', () => {
      const filtered = getSkillTemplates(['propose']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].workflowId).toBe('propose');
      expect(filtered[0].dirName).toBe('openspec-propose');
    });
  });

  describe('getCommandTemplates', () => {
    it('should return all 12 command templates', () => {
      const templates = getCommandTemplates();
      expect(templates).toHaveLength(12);
    });

    it('should have unique IDs', () => {
      const templates = getCommandTemplates();
      const ids = templates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(templates.length);
    });

    it('should include all expected commands', () => {
      const templates = getCommandTemplates();
      const ids = templates.map(t => t.id);

      expect(ids).toContain('explore');
      expect(ids).toContain('new');
      expect(ids).toContain('continue');
      expect(ids).toContain('apply');
      expect(ids).toContain('update');
      expect(ids).toContain('ff');
      expect(ids).toContain('sync');
      expect(ids).toContain('archive');
      expect(ids).toContain('bulk-archive');
      expect(ids).toContain('verify');
      expect(ids).toContain('onboard');
      expect(ids).toContain('propose');
    });

    it('should filter by workflow IDs when provided', () => {
      const filtered = getCommandTemplates(['propose', 'explore', 'apply', 'archive']);
      expect(filtered).toHaveLength(4);
      const ids = filtered.map(t => t.id);
      expect(ids).toContain('propose');
      expect(ids).toContain('explore');
      expect(ids).toContain('apply');
      expect(ids).toContain('archive');
      expect(ids).not.toContain('new');
      expect(ids).not.toContain('ff');
    });

    it('should return all templates when filter is undefined', () => {
      const all = getCommandTemplates();
      const noFilter = getCommandTemplates(undefined);
      expect(noFilter).toHaveLength(all.length);
    });

    it('should return empty array when filter matches nothing', () => {
      const filtered = getCommandTemplates(['nonexistent']);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getCommandContents', () => {
    it('should return all 12 command contents', () => {
      const contents = getCommandContents();
      expect(contents).toHaveLength(12);
    });

    it('should have valid content structure', () => {
      const contents = getCommandContents();

      for (const content of contents) {
        expect(content.id).toBeTruthy();
        expect(content.name).toBeTruthy();
        expect(content.description).toBeTruthy();
        expect(content.body).toBeTruthy();
      }
    });

    it('should have matching IDs with command templates', () => {
      const templates = getCommandTemplates();
      const contents = getCommandContents();

      const templateIds = templates.map(t => t.id).sort();
      const contentIds = contents.map(c => c.id).sort();

      expect(contentIds).toEqual(templateIds);
    });

    it('should filter by workflow IDs when provided', () => {
      const filtered = getCommandContents(['propose', 'explore']);
      expect(filtered).toHaveLength(2);
      const ids = filtered.map(c => c.id);
      expect(ids).toContain('propose');
      expect(ids).toContain('explore');
      expect(ids).not.toContain('new');
    });

    it('should return all contents when filter is undefined', () => {
      const all = getCommandContents();
      const noFilter = getCommandContents(undefined);
      expect(noFilter).toHaveLength(all.length);
    });
  });

  describe('generateSkillContent', () => {
    it('should generate valid YAML frontmatter', () => {
      const template = {
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Test instructions',
        license: 'MIT',
        compatibility: 'Test compatibility',
        metadata: {
          author: 'test-author',
          version: '2.0',
        },
      };

      const content = generateSkillContent(template, '0.23.0');

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: test-skill');
      expect(content).toContain('description: Test description');
      expect(content).toContain('license: MIT');
      expect(content).toContain('compatibility: Test compatibility');
      expect(content).toContain('author: test-author');
      expect(content).toContain('version: "2.0"');
      expect(content).toContain('generatedBy: "0.23.0"');
      expect(content).toContain('Test instructions');
    });

    it('should use default values for optional fields', () => {
      const template = {
        name: 'minimal-skill',
        description: 'Minimal description',
        instructions: 'Minimal instructions',
      };

      const content = generateSkillContent(template, '0.24.0');

      expect(content).toContain('license: MIT');
      expect(content).toContain('compatibility: Requires openspec CLI.');
      expect(content).toContain('author: openspec');
      expect(content).toContain('version: "1.0"');
      expect(content).toContain('generatedBy: "0.24.0"');
    });

    it('should embed the provided version in generatedBy field', () => {
      const template = {
        name: 'version-test',
        description: 'Test version embedding',
        instructions: 'Instructions',
      };

      const content1 = generateSkillContent(template, '0.23.0');
      expect(content1).toContain('generatedBy: "0.23.0"');

      const content2 = generateSkillContent(template, '1.0.0');
      expect(content2).toContain('generatedBy: "1.0.0"');

      const content3 = generateSkillContent(template, '0.24.0-beta.1');
      expect(content3).toContain('generatedBy: "0.24.0-beta.1"');
    });

    it('should end frontmatter with separator and blank line', () => {
      const template = {
        name: 'test',
        description: 'Test',
        instructions: 'Body content',
      };

      const content = generateSkillContent(template, '0.23.0');

      expect(content).toMatch(/---\n\nBody content\n$/);
    });

    it('should apply transformInstructions callback when provided', () => {
      const template = {
        name: 'transform-test',
        description: 'Test transform callback',
        instructions: 'Use /opsx:new to start and /opsx:apply to implement.',
      };

      const transformer = (text: string) => text.replace(/\/opsx:/g, '/opsx-');
      const content = generateSkillContent(template, '0.23.0', transformer);

      expect(content).toContain('/opsx-new');
      expect(content).toContain('/opsx-apply');
      expect(content).not.toContain('/opsx:new');
      expect(content).not.toContain('/opsx:apply');
    });

    it('should not transform instructions when callback is undefined', () => {
      const template = {
        name: 'no-transform-test',
        description: 'Test without transform',
        instructions: 'Use /opsx:new to start.',
      };

      const content = generateSkillContent(template, '0.23.0', undefined);

      expect(content).toContain('/opsx:new');
    });

    it('should support custom transformInstructions logic', () => {
      const template = {
        name: 'custom-transform',
        description: 'Test custom transform',
        instructions: 'Some PLACEHOLDER text here.',
      };

      const customTransformer = (text: string) => text.replace('PLACEHOLDER', 'REPLACED');
      const content = generateSkillContent(template, '0.23.0', customTransformer);

      expect(content).toContain('Some REPLACED text here.');
      expect(content).not.toContain('PLACEHOLDER');
    });
  });

  describe('skill references', () => {
    const template: SkillTemplate = {
      name: 'openspec-demo',
      description: 'Demo skill',
      instructions: 'Read `references/rules.md` before writing.',
      references: [{ path: 'references/rules.md', content: '# Rules\n\nRun `/opsx:apply` when ready.' }],
    };

    it('generates SKILL.md first, then each reference with a trailing newline', () => {
      const files = generateSkillFiles(template, '1.2.3');
      expect(files.map((file) => file.relativePath)).toEqual(['SKILL.md', 'references/rules.md']);
      expect(files[0].content).toBe(generateSkillContent(template, '1.2.3'));
      expect(files[1].content).toBe('# Rules\n\nRun `/opsx:apply` when ready.\n');
    });

    it('applies the tool transform to references as well as SKILL.md', () => {
      const files = generateSkillFiles(template, '1.2.3', (text) => text.replaceAll('/opsx:apply', '/openspec-apply-change'));
      expect(files[0].content).not.toContain('/opsx:apply');
      expect(files[1].content).toContain('/openspec-apply-change');
    });

    it.each(['rules.md', 'references/../escape.md', 'references/Rules.md', 'references/nested/rules.md', '/references/rules.md'])(
      'rejects the reference path %s',
      (badPath) => {
        expect(() =>
          generateSkillFiles({ ...template, references: [{ path: badPath, content: 'x' }] }, '1.2.3')
        ).toThrow(/invalid reference path/);
      }
    );

    it('refuses a reference whose optional-workflow block was never resolved', () => {
      const unresolved = {
        ...template,
        references: [{ path: 'references/rules.md', content: optionalWorkflow('apply', 'yes', 'no') }],
      };
      expect(() => generateSkillFiles(unresolved, '1.2.3')).toThrow(/references\/rules\.md/);
    });

    it('resolves optional-workflow blocks in references against the installed set', () => {
      const [explore] = getSkillTemplates(['explore']);
      const capture = explore.template.references?.find((ref) => ref.path === 'references/capture.md');
      expect(capture?.content).toBeDefined();
      expect(capture!.content).not.toContain('[[opsx:');
      // Neither propose nor apply is installed, so the capture hand-off names neither.
      expect(capture!.content).not.toContain('/opsx:propose');
      expect(capture!.content).not.toContain('/opsx:apply');
    });

    it('ships the references every deployed skill points to', () => {
      for (const { template: deployed, dirName } of getSkillTemplates()) {
        const files = generateSkillFiles(deployed, '1.2.3');
        const shipped = new Set(files.map((file) => file.relativePath));
        const body = files.map((file) => file.content).join('\n');
        for (const [, referenced] of body.matchAll(/`(references\/[a-z0-9-]+\.md)`/g)) {
          expect(shipped.has(referenced), `${dirName} points to ${referenced}`).toBe(true);
        }
        for (const file of files.slice(1)) {
          expect(body.split(`\`${file.relativePath}\``).length - 1, `${dirName} never points to ${file.relativePath}`)
            .toBeGreaterThan(0);
        }
      }
    });

    it('appends references to a command body, each under its path', () => {
      const body = withReferences('Body text.', template.references!);
      expect(body).toBe('Body text.\n\n---\n\n## Reference: references/rules.md\n\nRun `/opsx:apply` when ready.');
      expect(withReferences('Body text.', [])).toBe('Body text.');
    });
  });

  describe('writeSkillFiles', () => {
    let root: string;

    beforeEach(async () => {
      root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-skill-files-'));
    });

    afterEach(async () => {
      await fs.rm(root, { recursive: true, force: true });
    });

    const files = [
      { relativePath: 'SKILL.md', content: 'skill\n' },
      { relativePath: 'references/rules.md', content: 'rules\n' },
    ];

    it('writes SKILL.md and its references', async () => {
      const skillDir = path.join(root, '.claude', 'skills', 'openspec-demo');
      await writeSkillFiles(root, skillDir, files);
      expect(await fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf8')).toBe('skill\n');
      expect(await fs.readFile(path.join(skillDir, 'references', 'rules.md'), 'utf8')).toBe('rules\n');
    });

    it('removes a reference a newer version no longer ships, and nothing else', async () => {
      const skillDir = path.join(root, '.claude', 'skills', 'openspec-demo');
      await fs.mkdir(path.join(skillDir, 'references', 'notes'), { recursive: true });
      await fs.writeFile(path.join(skillDir, 'references', 'old.md'), 'stale\n');
      await fs.writeFile(path.join(skillDir, 'references', 'keep.txt'), 'not markdown\n');

      await writeSkillFiles(root, skillDir, files);

      const left = (await fs.readdir(path.join(skillDir, 'references'))).sort();
      expect(left).toEqual(['keep.txt', 'notes', 'rules.md']);
    });

    it('refuses to write outside the skills root', async () => {
      const skillDir = path.join(root, '..', 'elsewhere');
      await expect(writeSkillFiles(root, skillDir, files)).rejects.toThrow();
    });
  });
});
