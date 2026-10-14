import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import nodeFs from 'fs';
import os from 'os';
import path from 'path';
import {
  reconcileCommandFiles,
  formatKeptCommandFiles,
} from '../../src/core/shared/command-reconcile.js';
import { getCommandContents } from '../../src/core/shared/skill-generation.js';
import {
  CommandAdapterRegistry,
  generateCommands,
} from '../../src/core/command-generation/index.js';
import { ALL_WORKFLOWS } from '../../src/core/profiles.js';

const WORKFLOWS = ['propose', 'apply', 'archive'] as const;

async function writeGeneratedCommands(
  projectPath: string,
  toolId: string,
  workflows: readonly string[]
): Promise<string[]> {
  const adapter = CommandAdapterRegistry.get(toolId)!;
  const generated = generateCommands(getCommandContents(workflows), adapter);

  for (const cmd of generated) {
    const full = path.join(projectPath, cmd.path);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, cmd.fileContent);
  }

  return generated.map((cmd) => cmd.path);
}

describe('reconcileCommandFiles', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-reconcile-'));
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it('removes command files it generated', async () => {
    const written = await writeGeneratedCommands(projectPath, 'claude', WORKFLOWS);

    const result = await reconcileCommandFiles(projectPath, 'claude', WORKFLOWS);

    expect(result.removed.sort()).toEqual([...written].sort());
    expect(result.kept).toEqual([]);
    for (const cmdPath of written) {
      await expect(fs.access(path.join(projectPath, cmdPath))).rejects.toThrow();
    }
  });

  it('keeps a hand-edited command file and reports it', async () => {
    const written = await writeGeneratedCommands(projectPath, 'claude', WORKFLOWS);
    const edited = written.find((p) => p.endsWith('propose.md'))!;
    const editedFull = path.join(projectPath, edited);
    const original = await fs.readFile(editedFull, 'utf-8');
    await fs.writeFile(editedFull, `${original}\n<!-- our team's extra step -->\n`);

    const result = await reconcileCommandFiles(projectPath, 'claude', WORKFLOWS);

    expect(result.kept).toEqual([edited]);
    expect(result.removed).not.toContain(edited);
    // The edit survives byte-for-byte: kept means untouched, not rewritten.
    expect(await fs.readFile(editedFull, 'utf-8')).toBe(
      `${original}\n<!-- our team's extra step -->\n`
    );
    expect(formatKeptCommandFiles(result.kept)).toEqual([
      'Kept 1 command file that does not match generated output:',
      `  ${edited}`,
      'Move anything worth keeping into the skill, then delete by hand.',
    ]);
  });

  it('treats a BOM and CRLF checkout as untouched, not edited', async () => {
    const written = await writeGeneratedCommands(projectPath, 'claude', WORKFLOWS);
    const checkedOut = path.join(projectPath, written[0]);
    const original = await fs.readFile(checkedOut, 'utf-8');
    await fs.writeFile(checkedOut, `﻿${original.replace(/\n/g, '\r\n')}`);

    const result = await reconcileCommandFiles(projectPath, 'claude', WORKFLOWS);

    expect(result.kept).toEqual([]);
    expect(result.removed).toContain(written[0]);
  });

  it('removes a file left over from a wider profile than the one in use', async () => {
    // Written when every workflow was installed, reconciled against a narrower
    // set: still our generated output, so it must not be reported as an edit.
    const written = await writeGeneratedCommands(projectPath, 'claude', ALL_WORKFLOWS);

    const result = await reconcileCommandFiles(projectPath, 'claude', ['propose']);

    expect(result.kept).toEqual([]);
    expect(result.removed.sort()).toEqual([...written].sort());
  });

  it('keeps and reports a file it cannot read rather than passing over it', async () => {
    // A file left on disk must always be named. Silently skipping an
    // unreadable one would tell the user the directory was cleared when it
    // was not.
    const written = await writeGeneratedCommands(projectPath, 'claude', WORKFLOWS);
    const unreadable = written.find((p) => p.endsWith('apply.md'))!;
    const realReadFile = nodeFs.promises.readFile;
    const spy = vi
      .spyOn(nodeFs.promises, 'readFile')
      .mockImplementation(async (file, ...rest) => {
        if (String(file).endsWith(`${path.sep}apply.md`)) {
          throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
        }
        return realReadFile(file, ...rest);
      });

    try {
      const result = await reconcileCommandFiles(projectPath, 'claude', WORKFLOWS);
      expect(result.kept).toEqual([unreadable]);
      expect(result.removed).not.toContain(unreadable);
    } finally {
      spy.mockRestore();
    }

    // Still on disk, which is what being reported as kept has to mean.
    await expect(fs.access(path.join(projectPath, unreadable))).resolves.toBeUndefined();
  });

  it('does nothing for a tool with no command adapter', async () => {
    const result = await reconcileCommandFiles(projectPath, 'codex', WORKFLOWS);

    expect(result).toEqual({ removed: [], kept: [] });
  });

  it('reports nothing when no files were kept', () => {
    expect(formatKeptCommandFiles([])).toEqual([]);
  });
});
