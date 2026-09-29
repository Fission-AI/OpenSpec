import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discoverListLibraries } from '../../src/core/list-discovery.js';
import { ListCommand } from '../../src/core/list.js';

describe('recursive library listing', () => {
  let base: string;
  let lines: string[];
  const originalExitCode = process.exitCode;
  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'list-libraries-'));
    lines = [];
    vi.spyOn(console, 'log').mockImplementation(text => lines.push(text));
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    await fs.rm(base, { recursive: true, force: true });
  });
  async function library(relative: string, names: string[] = []) {
    const root = path.join(base, relative);
    await fs.mkdir(path.join(root, 'openspec', 'specs'), { recursive: true });
    await fs.mkdir(path.join(root, 'openspec', 'changes'), { recursive: true });
    for (const name of names) {
      await fs.mkdir(path.join(root, 'openspec', 'changes', name));
      await fs.writeFile(path.join(root, 'openspec', 'changes', name, 'tasks.md'), '- [ ] one\n');
    }
    return root;
  }
  async function list(mode: 'changes' | 'specs' = 'changes', json = false) {
    await new ListCommand().execute(base, mode, { recursive: true, json, sort: 'name' });
  }
  it('groups root, nested and empty libraries; sorts names within groups', async () => {
    await library('', ['zebra', 'alpha']);
    await library('product', ['alpha']);
    await library('empty');
    await list();
    expect(lines[0]).toBe('Changes — 3 libraries, 3 changes');
    expect(lines.join('\n')).toContain('openspec/ (root)');
    expect(lines.join('\n')).toContain('No active changes');
    expect(lines.findIndex(line => line.includes('alpha'))).toBeLessThan(lines.findIndex(line => line.includes('zebra')));
  });
  it('discovers descendants with no root, preserves duplicate ownership and clean JSON', async () => {
    await library('a', ['same']);
    await library('b', ['same']);
    await list('changes', true);
    expect(lines).toHaveLength(1);
    const result = JSON.parse(lines[0]);
    expect(result.changes.map((item: any) => item.library)).toEqual(['a/openspec/', 'b/openspec/']);
    expect(result.roots).toHaveLength(2);
  });
  it('preserves the single-library JSON shape', async () => {
    await library('', ['one']);
    await list('changes', true);
    expect(JSON.parse(lines[0]).roots).toBeUndefined();
    expect(JSON.parse(lines[0]).changes[0].library).toBeUndefined();
  });
  it('does not traverse excluded directories, planning contents or directory symlinks', async () => {
    await library('actual');
    for (const dir of ['node_modules', '.git', '.venv', '.worktrees', 'dist', '.cache', 'actual/openspec/changes/archive', 'actual/openspec/specs']) await library(dir);
    await fs.symlink(path.join(base, 'actual'), path.join(base, 'alias'), 'dir');
    expect((await discoverListLibraries(base)).map(root => root.library)).toEqual(['actual/openspec/']);
  });
  it('aggregates parsed specs with distinct owners', async () => {
    for (const relative of ['', 'nested']) {
      const root = await library(relative);
      await fs.mkdir(path.join(root, 'openspec', 'specs', 'feature'));
      await fs.writeFile(path.join(root, 'openspec', 'specs', 'feature', 'spec.md'), '# Feature\n\n## Purpose\nTest\n\n## Requirements\n\n### Requirement: Test\nThe system SHALL work.\n\n#### Scenario: works\n- **WHEN** called\n- **THEN** works\n');
    }
    await list('specs', true);
    expect(JSON.parse(lines[0]).specs.map((spec: any) => [spec.id, spec.requirementCount, spec.library])).toEqual([
      ['feature', 1, 'openspec/'], ['feature', 1, 'nested/openspec/'],
    ]);
  });
  it('reports a malformed library once and retains successful libraries', async () => {
    await library('', ['good']);
    await fs.mkdir(path.join(base, 'bad', 'openspec'), { recursive: true });
    await fs.writeFile(path.join(base, 'bad', 'openspec', 'changes'), 'bad');
    await list('changes', true);
    const result = JSON.parse(lines[0]);
    expect(result.changes[0].name).toBe('good');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain('read permissions');
    expect(process.exitCode).toBe(1);
  });
  it('keeps an unreadable library visible alongside readable libraries', async () => {
    await library('', ['good']);
    const blocked = await library('blocked');
    const originalRead = fs.readdir.bind(fs);
    vi.spyOn(fs, 'readdir').mockImplementation(((target: any, options: any) => {
      if (String(target) === path.join(blocked, 'openspec')) {
        return Promise.reject(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));
      }
      return originalRead(target, options);
    }) as any);
    await list('changes', true);
    const result = JSON.parse(lines[0]);
    expect(result.changes[0].name).toBe('good');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].library).toBe('blocked/openspec/');
  });
  it.each(['realpath', 'readdir'] as const)('contains inaccessible or vanished traversal directories during %s', async (operation) => {
    await library('', ['root-change']);
    await library('healthy', ['nested-change']);
    const original = fs[operation].bind(fs);
    const failures = ['EACCES', 'EPERM', 'ENOENT'];
    const blocked = new Map<string, string>();
    for (const code of failures) {
      const dir = path.join(base, code);
      await fs.mkdir(dir);
      blocked.set(dir, code);
    }
    vi.spyOn(fs, operation).mockImplementation(((target: any, options: any) => {
      const code = blocked.get(String(target));
      if (code) return Promise.reject(Object.assign(new Error(code), { code }));
      return (original as any)(target, options);
    }) as any);
    await list('changes', true);
    expect(JSON.parse(lines[0]).changes.map((item: any) => item.name)).toEqual(['root-change', 'nested-change']);
  });
  it('propagates base access failures and unexpected traversal errors', async () => {
    const child = path.join(base, 'child');
    await fs.mkdir(child);
    const original = fs.readdir.bind(fs);
    const failure = Object.assign(new Error('Read failure'), { code: 'EIO' });
    const read = vi.spyOn(fs, 'readdir').mockImplementation(((target: any, options: any) => {
      if (String(target) === child) return Promise.reject(failure);
      return original(target, options);
    }) as any);
    await expect(discoverListLibraries(base)).rejects.toBe(failure);
    read.mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));
    await expect(discoverListLibraries(base)).rejects.toMatchObject({ code: 'EACCES' });
  });
  it('recognizes config-only and legacy roots while ignoring an empty openspec directory', async () => {
    for (const relative of ['config-only', 'legacy', 'not-a-library']) {
      await fs.mkdir(path.join(base, relative, 'openspec'), { recursive: true });
    }
    await fs.writeFile(path.join(base, 'config-only', 'openspec', 'config.yml'), 'schema: spec-driven');
    await fs.writeFile(path.join(base, 'legacy', 'openspec', 'project.md'), '# Project');
    expect((await discoverListLibraries(base)).map(item => item.library)).toEqual(['config-only/openspec/', 'legacy/openspec/']);
  });
  it('reports malformed configuration without losing readable libraries', async () => {
    await library('', ['good']);
    const bad = await library('bad-config');
    await fs.writeFile(path.join(bad, 'openspec', 'config.yaml'), 'schema: [');
    await list('changes', true);
    expect(JSON.parse(lines[0]).diagnostics).toHaveLength(1);
    expect(JSON.parse(lines[0]).changes).toHaveLength(1);
  });
  it('puts status below long names in narrow terminals', async () => {
    await library('', ['a-long-change-name-for-a-narrow-terminal']);
    await library('empty');
    const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    Object.defineProperty(process.stdout, 'columns', { value: 40, configurable: true });
    try {
      await list();
      expect(lines.some(line => line.includes('a-long-change-name-for-a-narrow-terminal\n    0/1 tasks'))).toBe(true);
    } finally {
      if (descriptor) Object.defineProperty(process.stdout, 'columns', descriptor);
      else delete process.stdout.columns;
    }
  });
  it('keeps explicitly nonrecursive listing scoped to one root', async () => {
    await library('', ['one']);
    await library('nested', ['two']);
    await new ListCommand().execute(base, 'changes', { recursive: false, json: true });
    expect(JSON.parse(lines[0]).changes.map((item: any) => item.name)).toEqual(['one']);
  });
  it('retains recent sorting within each library', async () => {
    const root = await library('', ['older', 'newer']);
    await library('empty');
    await fs.utimes(path.join(root, 'openspec', 'changes', 'older', 'tasks.md'), 100, 100);
    await new ListCommand().execute(base, 'changes', { recursive: true, json: true });
    expect(JSON.parse(lines[0]).changes.map((item: any) => item.name)).toEqual(['newer', 'older']);
  });
});
