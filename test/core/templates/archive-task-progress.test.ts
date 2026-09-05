import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { runCLI } from '../../helpers/run-cli.js';

const surfaces = [
  ['archive skill', generateSkillContent(getArchiveChangeSkillTemplate(), 'test')],
  ['archive command', getOpsxArchiveCommandTemplate().content],
  ['bulk archive skill', generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'test')],
  ['bulk archive command', getOpsxBulkArchiveCommandTemplate().content],
] as const;

describe('archive task discovery uses schema-resolved CLI progress', () => {
  let root: string;

  async function write(relative: string, content: string) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-task-guidance-'));
    await write('openspec/config.yaml', 'schema: custom\n');
    // Include another change so callers must match the selected name, not
    // take the first list entry or aggregate progress across the whole root.
    await write('openspec/changes/other/tasks.md', '- [x] Unrelated completed work\n');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  for (const [surface, content] of surfaces) {
    it.each([
      ['custom output', 'planning/work-items.md', ['planning/work-items.md']],
      ['multiple outputs', 'work/*.md', ['work/backend.md', 'work/frontend.md']],
    ] as const)(`${surface}: counts unfinished tasks in %s`, async (_label, generates, files) => {
      await write('openspec/schemas/custom/schema.yaml', [
        'name: custom',
        'version: 1',
        'artifacts:',
        '  - id: implementation',
        `    generates: "${generates}"`,
        '    description: Implementation checklist',
        '    template: checklist.md',
        '    requires: []',
        'apply:',
        '  requires: [implementation]',
        `  tracks: "${generates}"`,
      ].join('\n'));
      await write('openspec/changes/selected/.openspec.yaml', 'schema: custom\n');
      for (const file of files) {
        await write(`openspec/changes/selected/${file}`, '- [x] Finished\n- [ ] Pending\n');
      }

      // Execute the lookup actually taught in the task-checking step. The old
      // single workflow read tasks.md, and bulk assumed an artifact id "tasks";
      // neither can find this schema's implementation checklist.
      const step = content.split('3. **')[1].split('4. **')[0];
      const command = step.match(/openspec (list --json)/);
      expect(command, surface).not.toBeNull();
      expect(step).toContain('same selected-root flags');
      expect(step).toMatch(/name` exactly matches/);
      expect(step).toContain('totalTasks - completedTasks');
      expect(step).not.toContain('artifactPaths.tasks');
      expect(step).not.toContain('If no tasks file exists');

      const result = await runCLI(command![1].split(' '), { cwd: root });
      expect(result.exitCode, result.stderr).toBe(0);
      const changes = JSON.parse(result.stdout).changes;
      expect(changes).toHaveLength(2);
      expect(changes.find((change: { name: string }) => change.name === 'selected')).toMatchObject({
        totalTasks: files.length * 2,
        completedTasks: files.length,
        status: 'in-progress',
      });
      await expect(fs.access(path.join(root, 'openspec/changes/selected/tasks.md'))).rejects.toThrow();
    });
  }
});
