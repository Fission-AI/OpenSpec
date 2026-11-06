import { describe, it, expect } from 'vitest';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { generateSkillFiles, getBetaSkillTemplates } from '../../../src/core/shared/beta-skill-generation.js';
import { optionalWorkflow } from '../../../src/core/templates/optional-workflow.js';
import { withReferences } from '../../../src/core/templates/beta/workflows/references.js';
import type { SkillTemplate } from '../../../src/core/templates/beta/types.js';

// The beta skills ship `references/` files beside SKILL.md; today's
// per-project skills, which skill-generation.ts writes, never do.
describe('beta skill generation', () => {
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
      const [explore] = getBetaSkillTemplates(['explore']);
      const capture = explore.template.references?.find((ref) => ref.path === 'references/capture.md');
      expect(capture?.content).toBeDefined();
      expect(capture!.content).not.toContain('[[opsx:');
      // Neither propose nor apply is installed, so the capture hand-off names neither.
      expect(capture!.content).not.toContain('/opsx:propose');
      expect(capture!.content).not.toContain('/opsx:apply');
    });

    it('ships the references every deployed skill points to', () => {
      for (const { template: deployed, dirName } of getBetaSkillTemplates()) {
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

});
