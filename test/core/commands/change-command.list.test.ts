import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChangeCommand } from '../../../src/commands/change.js';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

describe('ChangeCommand.list', () => {
  let cmd: ChangeCommand;
  let tempRoot: string;
  let originalCwd: string;

  beforeAll(async () => {
    cmd = new ChangeCommand();
    originalCwd = process.cwd();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-change-command-list-'));
    const changeDir = path.join(tempRoot, 'openspec', 'changes', 'demo');
    await fs.mkdir(changeDir, { recursive: true });
    const proposal = `# Change: Demo\n\n## Why\nTest list.\n\n## What Changes\n- **auth:** Add requirement`;
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposal, 'utf-8');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n- [ ] Task 2\n', 'utf-8');
    process.chdir(tempRoot);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('returns JSON with expected shape', async () => {
    // Capture console output
    const logs: string[] = [];
    const origLog = console.log;
    try {
      console.log = (msg?: any, ...args: any[]) => {
        logs.push([msg, ...args].filter(Boolean).join(' '));
      };

      await cmd.list({ json: true });

      const output = logs.join('\n');
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      if (parsed.length > 0) {
        const item = parsed[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('deltaCount');
        expect(item).toHaveProperty('taskStatus');
        expect(item.taskStatus).toHaveProperty('total');
        expect(item.taskStatus).toHaveProperty('completed');
      }
    } finally {
      console.log = origLog;
    }
  });

  it('prints IDs by default and details with --long', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    try {
      console.log = (msg?: any, ...args: any[]) => {
        logs.push([msg, ...args].filter(Boolean).join(' '));
      };
      await cmd.list({});
      const idsOnly = logs.join('\n');
      expect(idsOnly).toMatch(/\w+/);
      logs.length = 0;
      await cmd.list({ long: true });
      const longOut = logs.join('\n');
      expect(longOut).toMatch(/:\s/);
      expect(longOut).toMatch(/\[deltas\s\d+\]/);
    } finally {
      console.log = origLog;
    }

  });
});

describe('ChangeCommand.list with a change that has no proposal.md', () => {
  let cmd: ChangeCommand;
  let tempRoot: string;
  let originalCwd: string;

  const capture = async (run: () => Promise<void>): Promise<string> => {
    const logs: string[] = [];
    const origLog = console.log;
    try {
      console.log = (msg?: any, ...args: any[]) => {
        logs.push([msg, ...args].filter(Boolean).join(' '));
      };
      await run();
      return logs.join('\n');
    } finally {
      console.log = origLog;
    }
  };

  beforeAll(async () => {
    cmd = new ChangeCommand();
    originalCwd = process.cwd();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-change-list-noproposal-'));
    // What `openspec new change` leaves behind, plus tasks: no proposal.md.
    const scaffolded = path.join(tempRoot, 'openspec', 'changes', 'scaffolded');
    await fs.mkdir(scaffolded, { recursive: true });
    await fs.writeFile(path.join(scaffolded, '.openspec.yaml'), 'schema: spec-driven\n', 'utf-8');
    await fs.writeFile(path.join(scaffolded, 'tasks.md'), '- [x] Task 1\n- [ ] Task 2\n', 'utf-8');
    process.chdir(tempRoot);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('lists it, matching what `openspec list` resolves', async () => {
    expect(await capture(() => cmd.list({}))).toContain('scaffolded');
  });

  it('--long reports the missing proposal and keeps task counts', async () => {
    const out = await capture(() => cmd.list({ long: true }));
    expect(out).toContain('scaffolded: (no proposal.md yet)');
    expect(out).toContain('[tasks 1/2]');
    expect(out).not.toContain('(unable to read)');
  });

  it('--json names the change instead of "Unknown" and keeps task counts', async () => {
    const parsed = JSON.parse(await capture(() => cmd.list({ json: true })));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: 'scaffolded',
      title: 'scaffolded',
      deltaCount: 0,
      taskStatus: { total: 2, completed: 1 },
    });
  });
});
