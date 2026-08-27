import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI } from '../helpers/run-cli.js';

describe('validation report CLI contract', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-findings-e2e-'));
    await fs.mkdir(path.join(projectDir, 'openspec', 'specs'), { recursive: true });
    await fs.writeFile(path.join(projectDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    for (const [id, checkbox] of [['done', 'x'], ['unfinished', ' ']]) {
      const dir = path.join(projectDir, 'openspec', 'changes', 'archive', id);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'tasks.md'), `# Tasks\n\n- [${checkbox}] 1.1 Work\n`);
    }
  });

  afterAll(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('selects findings through the real CLI while retaining full totals and failure status', async () => {
    const full = await runCLI(['validate', '--archived', '--json'], { cwd: projectDir });
    const compact = await runCLI(['validate', '--archived', '--json', '--report', 'findings'], { cwd: projectDir });
    expect(compact.exitCode).toBe(full.exitCode);
    expect(compact.exitCode).toBe(1);
    expect(compact.stderr).toBe('');
    const fullDoc = JSON.parse(full.stdout);
    const compactDoc = JSON.parse(compact.stdout);
    expect(compactDoc.report).toEqual({
      kind: 'validation-findings', version: '1.0', scope: 'archived', returnedItems: 1, totalItems: 2,
    });
    expect(compactDoc.itemFindings).toEqual([
      { ...fullDoc.items.find((item: { id: string }) => item.id === 'unfinished'), durationMs: expect.any(Number) },
    ]);
    expect(compactDoc.summary).toEqual(fullDoc.summary);
    expect(compactDoc.root).toEqual(fullDoc.root);
    expect(compactDoc).not.toHaveProperty('items');
    expect(compactDoc).not.toHaveProperty('version');
  });

  it.each([
    ['--all', '--report', 'unknown'],
    ['--all', '--report=FINDINGS'],
    ['--report', 'findings'],
    ['some-item', '--all', '--report', 'full'],
    ['--all', '--archived', '--report', 'findings'],
  ])('returns semantic errors as JSON before resolving a nonexistent store: %j', async (...args) => {
    const result = await runCLI(['validate', ...args, '--json', '--store', 'missing-store'], { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({ status: [{
      severity: 'error', code: 'invalid_validation_report_request',
      message: expect.any(String), fix: expect.any(String),
    }] });
  });

  it('keeps a missing report argument as a parser syntax error', async () => {
    const result = await runCLI(['validate', '--all', '--json', '--report'], { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain("option '--report <full|findings>' argument missing");
  });

  it('uses a real registered store and preserves its report root', async () => {
    const env = {
      XDG_CONFIG_HOME: path.join(projectDir, 'config'),
      XDG_DATA_HOME: path.join(projectDir, 'data'),
    };
    await registerStore({ id: 'report-store', localPath: projectDir, globalDataDir: getGlobalDataDir({ env }) });
    const result = await runCLI(['validate', '--archived', '--report', 'findings', '--json', '--store', 'report-store'], { cwd: projectDir, env });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output, JSON.stringify(output)).toHaveProperty('root');
    expect(await fs.realpath(output.root.path)).toBe(await fs.realpath(projectDir));
    expect(output.root.source).toBe('store');
    expect(output.root.store_id).toBe('report-store');
    expect(output.report).toMatchObject({ scope: 'archived', totalItems: 2, returnedItems: 1 });
    expect(output.itemFindings[0].id).toBe('unfinished');
  });

  it('retains root failure diagnostics instead of fabricating an empty report', async () => {
    const result = await runCLI(['validate', '--all', '--report', 'findings', '--json', '--store', 'missing-store'], { cwd: projectDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output.status).toHaveLength(1);
    expect(output.status[0].severity).toBe('error');
    expect(output.status[0].code).not.toBe('invalid_validation_report_request');
    expect(output).not.toHaveProperty('report');
  });

  it('retains fatal archive-discovery diagnostics', async () => {
    const malformedDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-findings-malformed-'));
    try {
      await fs.mkdir(path.join(malformedDir, 'openspec', 'changes'), { recursive: true });
      await fs.writeFile(path.join(malformedDir, 'openspec', 'changes', 'archive'), 'not a directory');
      const result = await runCLI(['validate', '--archived', '--report', 'findings', '--json'], { cwd: malformedDir });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout)).toMatchObject({ status: [{ code: 'validate_error' }] });
      expect(JSON.parse(result.stdout)).not.toHaveProperty('report');
    } finally {
      await fs.rm(malformedDir, { recursive: true, force: true });
    }
  });
});
