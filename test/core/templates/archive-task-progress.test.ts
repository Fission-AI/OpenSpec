import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  generateSkillContent,
  getCommandTemplates,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { getGlobalDataDir, registerStore } from '../../../src/core/index.js';
import { runCLI } from '../../helpers/run-cli.js';

// Go through getSkillTemplates/getCommandTemplates rather than the raw
// templates: these workflows carry optional-workflow blocks, and only these
// entry points resolve them against an installed set. Building from the raw
// template leaves `[[opsx:if-workflow ...]]` in the text, which skill
// generation rejects. The set names sync so the installed branch is chosen,
// which is the wording these assertions are about.
const WORKFLOWS = ['archive', 'bulk-archive', 'sync'];
const skill = (workflowId: string): string =>
  generateSkillContent(
    getSkillTemplates(WORKFLOWS).find((entry) => entry.workflowId === workflowId)!.template,
    'test'
  );
const command = (id: string): string =>
  getCommandTemplates(WORKFLOWS).find((entry) => entry.id === id)!.template.content;

const surfaces = [
  ['archive skill', skill('archive')],
  ['archive command', command('archive')],
  ['bulk archive skill', skill('bulk-archive')],
  ['bulk archive command', command('bulk-archive')],
] as const;

describe('archive task discovery uses schema-resolved CLI progress', () => {
  let root: string;
  let callerRoot: string;
  let env: NodeJS.ProcessEnv;
  const storeId = 'task-store';

  async function write(relative: string, content: string) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-task-guidance-'));
    env = {
      XDG_DATA_HOME: path.join(root, 'data'),
      XDG_CONFIG_HOME: path.join(root, 'config'),
    };
    await write('openspec/config.yaml', 'schema: custom\n');
    await fs.mkdir(path.join(root, 'openspec/specs'), { recursive: true });
    // Include another change so callers must match the selected name, not
    // take the first list entry or aggregate progress across the whole root.
    await write('openspec/changes/other/tasks.md', '- [x] Unrelated completed work\n');
    await registerStore({ id: storeId, localPath: root, globalDataDir: getGlobalDataDir({ env }) });

    // The caller's nearest root contains the same change name, but its tasks
    // are all done. Omitting --store must therefore produce different progress.
    callerRoot = path.join(root, 'caller');
    await write('caller/openspec/config.yaml', 'schema: spec-driven\n');
    await write('caller/openspec/changes/selected/tasks.md', '- [x] Local work is done\n');
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
        await write(`openspec/changes/selected/${file}`, '- [ x ] Finished\n- [~] Pending\n- [ ] Pending\n');
      }

      // Execute the lookup actually taught in the task-checking step. The old
      // single workflow read tasks.md, and bulk assumed an artifact id "tasks";
      // neither can find this schema's implementation checklist.
      const step = content.split('3. **')[1].split('4. **')[0];
      const command = step.match(/`openspec (list[^`]*)`/);
      expect(command, surface).not.toBeNull();
      expect(step).toContain('same selected-root flags');
      expect(step).toMatch(/name` exactly matches/);
      expect(step).toContain('totalTasks - completedTasks');
      expect(step).toContain('nonnegative integer');
      expect(step).toContain('completedTasks <= totalTasks');
      expect(step).toMatch(/other markers.*remain incomplete/s);
      expect(step).not.toContain('artifactPaths.tasks');
      expect(step).not.toContain('If no tasks file exists');

      const args = command![1].trim().split(/\s+/);
      expect(args).toEqual(['list', '--json']);
      const storeFlag = content.match(/then pass `(--store) <id>`/);
      expect(storeFlag).not.toBeNull();
      expect(content).toContain('Every unscoped example of those commands below is shorthand: before running it, append the flag');
      const scopedArgs = [...args, storeFlag![1], storeId];
      expect(scopedArgs).toEqual(['list', '--json', '--store', storeId]);

      const unscoped = await runCLI(args, { cwd: callerRoot, env });
      expect(unscoped.exitCode, unscoped.stderr).toBe(0);
      expect(JSON.parse(unscoped.stdout).changes).toEqual([
        expect.objectContaining({ name: 'selected', totalTasks: 1, completedTasks: 1 }),
      ]);

      const result = await runCLI(scopedArgs, { cwd: callerRoot, env });
      expect(result.exitCode, result.stderr).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.root).toMatchObject({ source: 'store', store_id: storeId });
      const changes = report.changes;
      expect(changes).toHaveLength(2);
      expect(changes.find((change: { name: string }) => change.name === 'selected')).toMatchObject({
        totalTasks: files.length * 3,
        completedTasks: files.length,
        status: 'in-progress',
      });
      await expect(fs.access(path.join(root, 'openspec/changes/selected/tasks.md'))).rejects.toThrow();
    });
  }
});
