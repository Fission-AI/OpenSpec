import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeChangeNames, changeStageDir, resolveChangeDir } from '../../src/utils/change-directory.js';
import { createChange } from '../../src/utils/change-utils.js';
import { getTaskProgressForChange } from '../../src/utils/task-progress.js';
import { ListCommand } from '../../src/core/list.js';
import { ChangeCommand } from '../../src/commands/change.js';
import { getAvailableChanges, validateChangeExists } from '../../src/commands/workflow/shared.js';

describe('change directories', () => {
  let root: string;
  let changes: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec approval '));
    changes = path.join(root, 'openspec', 'changes');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('keeps commands and artifacts usable across an agent move', async () => {
    const { changeDir } = await createChange(root, 'example');
    expect(changeDir).toBe(path.join(changes, 'proposed', 'example'));
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Example\n');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Work\n');
    fs.mkdirSync(path.join(changes, 'old-change'));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    for (const stage of ['proposed', 'approved']) {
      if (stage === 'approved') {
        fs.mkdirSync(path.join(changes, stage));
        fs.renameSync(changeDir, path.join(changes, stage, 'example'));
      }
      expect(resolveChangeDir(changes, 'example')).toBe(path.join(changes, stage, 'example'));
      expect(await getAvailableChanges(root)).toEqual(['example', 'old-change']);
      expect(await validateChangeExists('example', root)).toBe('example');
      expect(await getTaskProgressForChange(changes, 'example', root)).toEqual({ total: 1, completed: 0 });
      await new ListCommand().execute(root, 'changes', { json: true });
      expect(JSON.parse(log.mock.calls.at(-1)![0]).changes.map((c: { name: string }) => c.name).sort()).toEqual(['example', 'old-change']);
      await new ChangeCommand(root).show('example');
      expect(log).toHaveBeenLastCalledWith('# Example\n');
      await expect(createChange(root, 'example')).rejects.toThrow('already exists');
    }
    expect(fs.existsSync(path.join(changes, 'old-change'))).toBe(true);
  });

  it('refuses ambiguous names instead of selecting one', async () => {
    await createChange(root, 'example');
    fs.mkdirSync(path.join(changes, 'example'));
    expect(() => resolveChangeDir(changes, 'example')).toThrow('Ambiguous change');
  });

  it('preserves an old change named like a container', () => {
    const old = path.join(changes, 'proposed');
    fs.mkdirSync(old, { recursive: true });
    fs.writeFileSync(path.join(old, '.openspec.yaml'), 'schema: spec-driven\n');
    expect(activeChangeNames(changes)).toEqual(['proposed']);
    expect(resolveChangeDir(changes, 'proposed')).toBe(old);
    expect(() => changeStageDir(changes, 'proposed')).toThrow('Rename the existing change');
  });

  it('never resolves a container as a change', async () => {
    await createChange(root, 'example');
    expect(() => resolveChangeDir(changes, 'proposed')).toThrow('change container');
    await expect(validateChangeExists('proposed', root)).rejects.toThrow('change container');
    expect(fs.existsSync(path.join(changes, 'proposed', 'example'))).toBe(true);
  });

  it('resolves an alias to the same change without ambiguity', async () => {
    const { changeDir } = await createChange(root, 'example');
    fs.symlinkSync(changeDir, path.join(changes, 'example'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(fs.realpathSync.native(resolveChangeDir(changes, 'example'))).toBe(fs.realpathSync.native(changeDir));
  });

  it('reports an unreadable container', () => {
    vi.spyOn(fs, 'readdirSync').mockImplementation(() => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); });
    expect(() => activeChangeNames(changes)).toThrow('denied');
  });

  it.each(['../outside', '..\\outside', '.', '..'])('rejects unsafe name %s', name => {
    expect(() => resolveChangeDir(changes, name)).toThrow('Invalid change name');
  });
});
