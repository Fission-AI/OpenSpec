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
    tempRoot = path.join(os.tmpdir(), `lightspec-change-command-list-${Date.now()}`);
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
