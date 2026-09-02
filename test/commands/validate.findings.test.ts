import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import ora from 'ora';
import { ValidateCommand, projectValidationFindings } from '../../src/commands/validate.js';
import { resolveRootForCommand, toRootOutput, type ResolvedOpenSpecRoot } from '../../src/core/root-selection.js';
import { Validator } from '../../src/core/validation/validator.js';

vi.mock('../../src/core/root-selection.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/core/root-selection.js')>(),
  resolveRootForCommand: vi.fn(),
}));
vi.mock('ora', () => ({ default: vi.fn() }));

type Options = NonNullable<Parameters<ValidateCommand['execute']>[1]>;

describe('validate findings reports', () => {
  let directory: string;
  let root: ResolvedOpenSpecRoot;
  let previousExitCode: typeof process.exitCode;
  let stdout: string[];
  let stderr: string[];

  async function write(relative: string, contents: string): Promise<void> {
    const filename = path.join(directory, relative);
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, contents);
  }

  function delta(body = 'The feature SHALL return its documented result.'): string {
    return `## ADDED Requirements\n### Requirement: Example behavior\n${body}\n\n#### Scenario: Normal request\n- **WHEN** requested\n- **THEN** the documented result is returned\n`;
  }

  async function seed(): Promise<void> {
    await write('openspec/changes/a-clean/specs/example/spec.md', delta());
    await write('openspec/changes/b-warning/specs/example/spec.md', delta('The feature returns its documented result.'));
    await write('openspec/changes/c-info/specs/example/spec.md', `${delta()}\n### Notes\nNon-requirement notes.\n`);
    await fs.mkdir(path.join(root.changesDir, 'd-error'));
    await write('openspec/specs/clean/spec.md', `## Purpose\nThis specification defines a deterministic example for testing validation output contracts.\n\n## Requirements\n${delta().replace('## ADDED Requirements\n', '')}`);
    await write('openspec/specs/error/spec.md', '# Invalid specification\n');
    await write('openspec/changes/archive/a-clean/tasks.md', '- [x] 1.1 Done\n');
    await write('openspec/changes/archive/b-error/tasks.md', '- [ ] 1.1 Pending\n');
  }

  async function run(options: Options, item?: string) {
    stdout = [];
    stderr = [];
    process.exitCode = undefined;
    await new ValidateCommand().execute(item, { noInteractive: true, ...options });
    return { stdout: [...stdout], stderr: [...stderr], exitCode: process.exitCode ?? 0 };
  }

  async function json(options: Options) {
    const result = await run({ ...options, json: true });
    expect(result.stdout).toHaveLength(1);
    expect(result.stderr).toEqual([]);
    return { ...result, document: JSON.parse(result.stdout[0]) };
  }

  beforeEach(async () => {
    previousExitCode = process.exitCode;
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-findings-'));
    root = {
      path: directory,
      changesDir: path.join(directory, 'openspec', 'changes'),
      specsDir: path.join(directory, 'openspec', 'specs'),
      archiveDir: path.join(directory, 'openspec', 'changes', 'archive'),
      defaultSchema: 'spec-driven',
      source: 'nearest',
    };
    await fs.mkdir(root.changesDir, { recursive: true });
    await fs.mkdir(root.specsDir, { recursive: true });
    vi.mocked(resolveRootForCommand).mockReset().mockResolvedValue(root);
    vi.mocked(ora).mockClear();
    vi.spyOn(console, 'log').mockImplementation((...args) => stdout.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...args) => stderr.push(args.join(' ')));
    // Timing is not part of report compatibility; fix it for byte-for-byte checks.
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.exitCode = previousExitCode;
    await fs.rm(directory, { recursive: true, force: true });
  });

  const scopes: Array<[string, Options]> = [
    ['changes', { changes: true }],
    ['specs', { specs: true }],
    ['all', { all: true }],
    ['all', { changes: true, specs: true }],
    ['all', { all: true, changes: true }],
    ['all', { all: true, specs: true }],
    ['archived', { archived: true }],
  ];

  it.each(scopes)('preserves full output and projects the complete %s scope (%j)', async (scope, options) => {
    await seed();
    const full = await json(options);
    expect(await json({ ...options, report: 'full' })).toEqual(full);
    expect(await run({ ...options, report: 'full' })).toEqual(await run(options));
    const findings = await json({ ...options, report: 'findings' });
    const selected = full.document.items.filter((item: { issues: unknown[] }) => item.issues.length > 0);
    expect(findings.document).toEqual({
      report: { kind: 'validation-findings', version: '1.0', scope, returnedItems: selected.length, totalItems: full.document.summary.totals.items },
      itemFindings: selected,
      summary: full.document.summary,
      root: full.document.root,
    });
    expect(findings.document).not.toHaveProperty('items');
    expect(findings.document).not.toHaveProperty('version');
    expect(typeof findings.document.report.version).toBe('string');
    expect(findings.exitCode).toBe(full.exitCode);
  });

  it('preserves legacy mixed-flag precedence when report is omitted', async () => {
    await seed();
    for (const json of [false, true]) {
      expect(await run({ archived: true, all: true, json })).toEqual(await run({ archived: true, json }));
      expect(await run({ all: true, json }, 'ignored-item')).toEqual(await run({ all: true, json }));
    }
  });

  it.each([false, true])('retains warning and INFO records with full-mode verdicts (strict=%s)', async (strict) => {
    await seed();
    const full = await json({ changes: true, strict });
    const findings = await json({ changes: true, strict, report: 'findings' });
    const warning = findings.document.itemFindings.find((item: { id: string }) => item.id === 'b-warning');
    const info = findings.document.itemFindings.find((item: { id: string }) => item.id === 'c-info');
    expect(warning.issues.map((issue: { level: string }) => issue.level)).toEqual(['WARNING']);
    expect(warning.valid).toBe(!strict);
    expect(info.issues.map((issue: { level: string }) => issue.level)).toEqual(['INFO']);
    expect(info.valid).toBe(true);
    expect(findings.document.summary).toEqual(full.document.summary);
    expect(findings.exitCode).toBe(full.exitCode);
  });

  it.each([false, true])('preserves warning-only exit status without errors (strict=%s)', async (strict) => {
    await write('openspec/changes/warning/specs/example/spec.md', delta('The feature returns its documented result.'));
    const full = await json({ changes: true, strict });
    const findings = await json({ changes: true, strict, report: 'findings' });
    expect(findings.document.itemFindings).toHaveLength(1);
    expect(findings.exitCode).toBe(strict ? 1 : 0);
    expect(findings.exitCode).toBe(full.exitCode);
  });

  it('keeps an INFO-only strict run successful while displaying its finding', async () => {
    await write('openspec/changes/info/specs/example/spec.md', `${delta()}\n### Notes\nNon-requirement notes.\n`);
    const findings = await json({ changes: true, strict: true, report: 'findings' });
    expect(findings.document.itemFindings).toHaveLength(1);
    expect(findings.document.itemFindings[0].issues[0].level).toBe('INFO');
    expect(findings.exitCode).toBe(0);
  });

  it('orders human streams independently and emits every issue without clean rows', async () => {
    await seed();
    const findings = await json({ all: true, report: 'findings' });
    const human = await run({ all: true, report: 'findings' });
    expect(human.stdout[0]).toMatch(/^Scope:/);
    expect(human.stdout[1]).toMatch(/^Totals:/);
    expect(human.stdout[2]).toMatch(/^Details: openspec validate d-error --type change/);
    expect(human.stdout).toHaveLength(3);
    const errorText = human.stderr.join('\n');
    expect(errorText).not.toContain('change/a-clean');
    expect(errorText).not.toContain('spec/clean');
    let offset = -1;
    for (const item of findings.document.itemFindings) {
      const heading = `${item.type}/${item.id}`;
      const headingOffset = errorText.indexOf(heading, offset + 1);
      expect(headingOffset).toBeGreaterThan(offset);
      expect(errorText.split(heading)).toHaveLength(2);
      offset = headingOffset;
      for (const issue of item.issues) {
        const issueOffset = errorText.indexOf(`[${issue.level}] ${issue.path}: ${issue.message}`, offset + 1);
        expect(issueOffset).toBeGreaterThan(offset);
        offset = issueOffset;
      }
    }
    const archived = await run({ archived: true, report: 'findings' });
    expect(archived.stdout).toHaveLength(2);
    expect(archived.stdout.join('\n')).not.toContain('Details:');
  });

  it.each(scopes)('keeps empty %s scopes explicit and successful (%j)', async (scope, options) => {
    const full = await json(options);
    expect(await json({ ...options, report: 'full' })).toEqual(full);
    expect(await run({ ...options, report: 'full' })).toEqual(await run(options));
    const findings = await json({ ...options, report: 'findings' });
    expect(findings.document.report).toEqual({ kind: 'validation-findings', version: '1.0', scope, returnedItems: 0, totalItems: 0 });
    expect(findings.document.itemFindings).toEqual([]);
    expect(findings.document.summary).toEqual(full.document.summary);
    expect(findings.document.root).toEqual(toRootOutput(root));
    expect(findings.exitCode).toBe(0);
    const human = await run({ ...options, report: 'findings' });
    expect(human.stdout).toEqual([expect.stringMatching(/^Scope:/), 'No item findings.', 'Totals: 0 passed, 0 failed (0 items)']);
    expect(human.stderr).toEqual([]);
    expect(human.exitCode).toBe(0);
  });

  it('distinguishes a clean non-empty scope from an empty scope', async () => {
    await write('openspec/changes/clean/specs/example/spec.md', delta());
    const result = await json({ changes: true, report: 'findings' });
    expect(result.document.report).toMatchObject({ returnedItems: 0, totalItems: 1, scope: 'changes' });
    expect(result.document.itemFindings).toEqual([]);
    expect(result.document.summary.totals).toEqual({ items: 1, passed: 1, failed: 0 });
    const human = await run({ changes: true, report: 'findings' });
    expect(human.stdout).toEqual([expect.stringMatching(/^Scope:/), 'No item findings.', 'Totals: 1 passed, 0 failed (1 items)']);
    expect(human.stderr).toEqual([]);
    expect(human.exitCode).toBe(0);
  });

  it.each(['full', 'findings'])('rejects invalid %s requests before root resolution, progress, or validation', async (report) => {
    const validateSpec = vi.spyOn(Validator.prototype, 'validateSpec');
    const validateChange = vi.spyOn(Validator.prototype, 'validateChangeDeltaSpecs');
    const invalid: Array<[Options, string?]> = [
      [{ report }],
      [{ report }, 'named-item'],
      [{ report, all: true }, 'named-item'],
      ...[{ all: true }, { changes: true }, { specs: true }].map((scope): [Options] => [{ ...scope, archived: true, report }]),
      [{ report: 'unsupported', all: true }],
      [{ report: '', all: true }],
    ];
    for (const [options, item] of invalid) {
      const human = await run({ ...options, noInteractive: false }, item);
      expect(human.stdout).toEqual([]);
      expect(human.stderr.join('\n')).toMatch(/report/i);
      expect(human.exitCode).toBe(1);
      const result = await run({ ...options, json: true, noInteractive: false }, item);
      expect(result.stderr).toEqual([]);
      expect(result.stdout).toHaveLength(1);
      expect(JSON.parse(result.stdout[0])).toEqual({ status: [{ severity: 'error', code: 'invalid_validation_report_request', message: expect.any(String), fix: expect.any(String) }] });
      expect(result.exitCode).toBe(1);
    }
    expect(resolveRootForCommand).not.toHaveBeenCalled();
    expect(ora).not.toHaveBeenCalled();
    expect(validateSpec).not.toHaveBeenCalled();
    expect(validateChange).not.toHaveBeenCalled();
  });

  it.each([{ all: true }, { archived: true }])('preserves selected-store records, root, verdict, and full output (%j)', async (scope) => {
    await seed();
    root.source = 'store';
    root.storeId = 'team';
    const options = { ...scope, store: 'team' };
    const full = await json(options);
    expect(await json({ ...options, report: 'full' })).toEqual(full);
    expect(await run({ ...options, report: 'full' })).toEqual(await run(options));
    const result = await json({ ...options, report: 'findings' });
    expect(resolveRootForCommand).toHaveBeenLastCalledWith(expect.objectContaining({ store: 'team' }), expect.any(Object));
    expect(result.document.root).toEqual(toRootOutput(root));
    expect(result.document.itemFindings).toEqual(full.document.items.filter((item: { issues: unknown[] }) => item.issues.length));
    expect(result.exitCode).toBe(full.exitCode);
    if ('all' in scope) {
      const human = await run({ ...options, report: 'findings' });
      expect(human.stdout.at(-1)).toContain('--store team');
    }
  });

  it('projects whole records in input order without modifying the full report', () => {
    const issue = { level: 'INFO' as const, path: path.join('nested', 'spec.md'), message: 'Informational', line: 7 };
    const clean = { id: 'clean', type: 'change' as const, valid: true, issues: [], durationMs: 1 };
    const first = { ...clean, id: 'z-first', issues: [issue], futureField: { preserved: true } };
    const second = { ...first, id: 'a-second', valid: false };
    const full = { items: [first, clean, second], summary: { totals: { items: 3, passed: 2, failed: 1 }, byType: { change: { items: 3, passed: 2, failed: 1 } } }, version: '1.0' as const, root: toRootOutput(root) };
    const original = structuredClone(full);
    const result = projectValidationFindings(full, 'changes');
    expect(result.itemFindings).toEqual([first, second]);
    expect(result.itemFindings[0]).toBe(first);
    expect(result.itemFindings[1]).toBe(second);
    expect(result.report).toMatchObject({ returnedItems: 2, totalItems: 3 });
    expect(full).toEqual(original);
  });
});
