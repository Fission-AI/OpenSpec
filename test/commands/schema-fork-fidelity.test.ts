import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Deterministic, cross-platform hooks to fail specific fork filesystem steps
// without relying on permissions or symlink support (ESM forbids spying on
// node:fs's namespace exports directly). Only the wrapped calls are affected;
// every other fs call passes straight through to the real implementation.
const fsControl = vi.hoisted(() => ({
  failCopyFileSync: false,
  failStagingInstall: false,
  failBackupRestore: false,
  // When set, simulate a concurrent process editing the fork destination: after
  // the next real file copy during staging, overwrite `path` with `content`.
  mutateOnCopy: null as null | { path: string; content: string },
  // When set, simulate a concurrent write to the backup dir: after the
  // destination is moved aside (dest -> backup), overwrite the backup's
  // schema.yaml with `content`.
  mutateBackupContent: null as null | string,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const nodePath = await import('node:path');
  return {
    ...actual,
    default: actual,
    copyFileSync: (...args: Parameters<typeof actual.copyFileSync>) => {
      if (fsControl.failCopyFileSync) {
        throw new Error('simulated copy failure');
      }
      const result = actual.copyFileSync(...args);
      if (fsControl.mutateOnCopy) {
        const { path: target, content } = fsControl.mutateOnCopy;
        fsControl.mutateOnCopy = null; // one-shot
        actual.writeFileSync(target, content);
      }
      return result;
    },
    renameSync: (...args: Parameters<typeof actual.renameSync>) => {
      // Fail ONLY the final staging->destination install move, leaving the
      // earlier destination->backup move and the backup->destination restore
      // to run for real.
      if (
        fsControl.failStagingInstall &&
        String(args[0]).includes('.fork-staging-')
      ) {
        throw new Error('simulated install rename failure');
      }
      // Fail the backup->destination restore move (source is the backup dir).
      if (
        fsControl.failBackupRestore &&
        String(args[0]).includes('.fork-backup-')
      ) {
        throw new Error('simulated restore rename failure');
      }
      const result = actual.renameSync(...args);
      // After the destination is moved aside to the backup dir, simulate a
      // concurrent write into that backup before it is (potentially) deleted.
      if (
        fsControl.mutateBackupContent !== null &&
        String(args[1]).includes('.fork-backup-')
      ) {
        const content = fsControl.mutateBackupContent;
        fsControl.mutateBackupContent = null; // one-shot
        actual.writeFileSync(
          nodePath.join(String(args[1]), 'schema.yaml'),
          content
        );
      }
      return result;
    },
  };
});

// Regression coverage for PR #1130: `schema fork` must preserve the source
// schema.yaml verbatim (block scalars, comments, key order) except for the
// updated top-level `name`. The prior implementation round-tripped through
// parseSchema -> stringifyYaml, which dropped comments and could rewrite
// block-scalar style; the new implementation edits a yaml Document in place.

async function runSchemaCommand(args: string[]): Promise<void> {
  const { registerSchemaCommand } = await import('../../src/commands/schema.js');
  const program = new Command();
  registerSchemaCommand(program);
  await program.parseAsync(['node', 'openspec', 'schema', ...args]);
}

describe('schema fork fidelity (PR #1130)', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: typeof process.exitCode;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // A valid source schema.yaml that intentionally carries:
  //  - a leading banner comment
  //  - an inline comment above a field
  //  - a literal block scalar (`instruction: |`) with multiple lines
  const SOURCE_SCHEMA = [
    '# banner comment that must survive the fork',
    'name: src-schema',
    'version: 1',
    'description: source schema',
    'artifacts:',
    '  - id: proposal',
    '    generates: proposal.md',
    '    description: The proposal',
    '    template: proposal.md',
    '    # instruction is authored as a literal block scalar',
    '    instruction: |',
    '      First line of guidance',
    '      Second line of guidance',
    '    requires: []',
    '',
  ].join('\n');

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-fork-fidelity-'));
    fs.mkdirSync(path.join(tempDir, 'openspec', 'schemas'), { recursive: true });

    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    process.chdir(tempDir);
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'xdg-config');

    // Author the source schema as a project-local schema.
    const srcDir = path.join(tempDir, 'openspec', 'schemas', 'src-schema');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'schema.yaml'), SOURCE_SCHEMA);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.resetModules();
  });

  it('preserves block scalars and comments while updating name', async () => {
    await runSchemaCommand(['fork', 'src-schema', 'forked-schema', '--json']);

    expect(process.exitCode).toBeFalsy();

    const destPath = path.join(
      tempDir,
      'openspec',
      'schemas',
      'forked-schema',
      'schema.yaml'
    );
    expect(fs.existsSync(destPath)).toBe(true);

    const forked = fs.readFileSync(destPath, 'utf-8');

    // 1. name was updated to the destination name.
    expect(forked).toMatch(/^name: forked-schema$/m);
    expect(forked).not.toMatch(/^name: src-schema$/m);

    // 2. The literal block scalar is preserved in `|` form, NOT flattened to
    //    a single line (the old parseSchema->stringify round trip is what this
    //    PR replaces). Both content lines remain on their own indented lines.
    expect(forked).toMatch(/instruction: \|/);
    expect(forked).toContain('      First line of guidance');
    expect(forked).toContain('      Second line of guidance');
    expect(forked).not.toContain('First line of guidance Second line of guidance');

    // 3. Comments survive the fork (the old object round trip dropped them).
    expect(forked).toContain('# banner comment that must survive the fork');
    expect(forked).toContain(
      '# instruction is authored as a literal block scalar'
    );

    // 4. Everything else is byte-identical: the only change vs. the source is
    //    the name line. Proven by reconstructing the source from the fork.
    const roundTripToSource = forked.replace(
      /^name: forked-schema$/m,
      'name: src-schema'
    );
    expect(roundTripToSource).toBe(SOURCE_SCHEMA);
  });

  it('rejects an invalid source schema instead of forking it', async () => {
    // Regression for the review on PR #1130: switching to the Document API must
    // NOT drop the structural validation the old parseSchema path performed.
    // This source is valid YAML but structurally invalid (its single artifact
    // is missing the required generates/description/template fields), so the
    // fork must fail rather than serialize a broken schema.
    const invalidDir = path.join(
      tempDir,
      'openspec',
      'schemas',
      'invalid-schema'
    );
    fs.mkdirSync(invalidDir, { recursive: true });
    fs.writeFileSync(
      path.join(invalidDir, 'schema.yaml'),
      ['name: invalid-schema', 'version: 1', 'artifacts:', '  - id: proposal', ''].join('\n')
    );

    await runSchemaCommand([
      'fork',
      'invalid-schema',
      'forked-invalid',
      '--json',
    ]);

    // The command reports failure (non-zero exit) and the JSON payload marks
    // the fork as not performed with an error message.
    expect(process.exitCode).toBeTruthy();
    const output = consoleLogSpy.mock.calls
      .map((call) => String(call[0]))
      .join('\n');
    expect(output).toContain('"forked": false');
    expect(output).toMatch(/Invalid schema/i);

    // Hardening: a failed fork must not litter a partial destination. The
    // freshly-copied dir is removed, so a corrected retry is not blocked by a
    // spurious "already exists".
    const destDir = path.join(
      tempDir,
      'openspec',
      'schemas',
      'forked-invalid'
    );
    expect(fs.existsSync(destDir)).toBe(false);

    // A second fork of the same (still invalid) source fails for the RIGHT
    // reason — invalid schema — not because a leftover directory exists.
    process.exitCode = undefined;
    consoleLogSpy.mockClear();
    await runSchemaCommand(['fork', 'invalid-schema', 'forked-invalid', '--json']);
    const retry = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(retry).toMatch(/Invalid schema/i);
    expect(retry).not.toMatch(/already exists/i);
  });

  it('never removes a pre-existing destination when --force is absent', async () => {
    // Guards the safety invariant of the failure cleanup: it may only delete a
    // directory this run created. Without --force an existing destination is
    // rejected BEFORE any copy, so a user's directory (and its files) must be
    // left completely untouched.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'my-dest');
    fs.mkdirSync(destDir, { recursive: true });
    const sentinel = path.join(destDir, 'sentinel.txt');
    fs.writeFileSync(sentinel, 'do not delete me');

    await runSchemaCommand(['fork', 'src-schema', 'my-dest', '--json']);

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toMatch(/already exists/i);
    // The pre-existing directory and its contents survive intact.
    expect(fs.existsSync(sentinel)).toBe(true);
    expect(fs.readFileSync(sentinel, 'utf-8')).toBe('do not delete me');
  });

  it('does not destroy a valid destination when --force forks an invalid source', async () => {
    // Atomicity: `fork --force` must validate the source BEFORE removing the
    // existing destination, so an unusable source can never leave the user with
    // nothing. The source is validated up front (before the --force removal),
    // so the prior destination survives untouched.
    const invalidDir = path.join(tempDir, 'openspec', 'schemas', 'invalid-schema');
    fs.mkdirSync(invalidDir, { recursive: true });
    fs.writeFileSync(
      path.join(invalidDir, 'schema.yaml'),
      ['name: invalid-schema', 'version: 1', 'artifacts:', '  - id: proposal', ''].join('\n')
    );

    // A valid, pre-existing destination the user does not want to lose.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'keep-me');
    fs.mkdirSync(destDir, { recursive: true });
    const existing = path.join(destDir, 'schema.yaml');
    const existingContent = [
      'name: keep-me',
      'version: 3',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Keep this',
      '    template: proposal.md',
      '    requires: []',
      '',
    ].join('\n');
    fs.writeFileSync(existing, existingContent);

    await runSchemaCommand(['fork', 'invalid-schema', 'keep-me', '--force', '--json']);

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toContain('"forked": false');
    expect(output).toMatch(/Invalid schema/i);
    // The valid destination was NOT destroyed by the --force removal.
    expect(fs.existsSync(existing)).toBe(true);
    expect(fs.readFileSync(existing, 'utf-8')).toBe(existingContent);
  });

  it('rejects a self-fork and leaves the source intact', async () => {
    // Data-loss guard: forking a schema onto itself with --force must be
    // rejected UP FRONT. The old flow removed the destination (which is the
    // source) before copying, so the copy then read from a directory it had
    // just deleted — destroying the only copy of the schema. Nothing may be
    // removed, and the source schema.yaml must be byte-identical afterward.
    await runSchemaCommand(['fork', 'src-schema', 'src-schema', '--force', '--json']);

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toContain('"forked": false');
    expect(output).toMatch(/onto itself/i);

    // The source survives untouched, comments and block scalars included.
    const srcPath = path.join(
      tempDir,
      'openspec',
      'schemas',
      'src-schema',
      'schema.yaml'
    );
    expect(fs.existsSync(srcPath)).toBe(true);
    expect(fs.readFileSync(srcPath, 'utf-8')).toBe(SOURCE_SCHEMA);
  });

  it('preserves an existing --force destination when the copy fails', async () => {
    // Atomicity for a mid-copy failure: the fork is staged in a temporary
    // sibling directory and only swapped into place once complete, so a failure
    // WHILE copying must never remove the existing destination. Here the source
    // is valid (passes the up-front parseSchema), but the file copy itself is
    // forced to fail; the pre-existing destination must be left fully intact.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'keep-me');
    fs.mkdirSync(destDir, { recursive: true });
    const existing = path.join(destDir, 'schema.yaml');
    const existingContent = [
      'name: keep-me',
      'version: 3',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Keep this',
      '    template: proposal.md',
      '    requires: []',
      '',
    ].join('\n');
    fs.writeFileSync(existing, existingContent);

    fsControl.failCopyFileSync = true;
    try {
      await runSchemaCommand(['fork', 'src-schema', 'keep-me', '--force', '--json']);
    } finally {
      fsControl.failCopyFileSync = false;
    }

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toContain('"forked": false');
    expect(output).toMatch(/simulated copy failure/i);

    // The existing destination was never removed — the copy failed while still
    // staging, before any replacement.
    expect(fs.existsSync(existing)).toBe(true);
    expect(fs.readFileSync(existing, 'utf-8')).toBe(existingContent);

    // And no staging leftovers linger in the schemas directory.
    const leftovers = fs
      .readdirSync(path.join(tempDir, 'openspec', 'schemas'))
      .filter((entry) => entry.startsWith('.fork-staging-'));
    expect(leftovers).toEqual([]);
  });

  it('restores the destination when the final install move fails', async () => {
    // Atomicity for the swap itself: `fork --force` moves the existing
    // destination to a sibling backup, installs the staged fork, and only then
    // discards the backup. If the install move fails (e.g. a Windows lock), the
    // backup must be moved back so the original destination is never lost.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'keep-me');
    fs.mkdirSync(destDir, { recursive: true });
    const existing = path.join(destDir, 'schema.yaml');
    const existingContent = [
      'name: keep-me',
      'version: 3',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Keep this',
      '    template: proposal.md',
      '    requires: []',
      '',
    ].join('\n');
    fs.writeFileSync(existing, existingContent);

    fsControl.failStagingInstall = true;
    try {
      await runSchemaCommand(['fork', 'src-schema', 'keep-me', '--force', '--json']);
    } finally {
      fsControl.failStagingInstall = false;
    }

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toContain('"forked": false');
    expect(output).toMatch(/simulated install rename failure/i);

    // The original destination was moved to backup, the install failed, and the
    // backup was moved back — so the destination is byte-identical.
    expect(fs.existsSync(existing)).toBe(true);
    expect(fs.readFileSync(existing, 'utf-8')).toBe(existingContent);

    // No staging or backup leftovers linger in the schemas directory.
    const leftovers = fs
      .readdirSync(path.join(tempDir, 'openspec', 'schemas'))
      .filter(
        (entry) =>
          entry.startsWith('.fork-staging-') ||
          entry.includes('.fork-backup-')
      );
    expect(leftovers).toEqual([]);
  });

  it('surfaces the backup location when a failed install cannot be restored', async () => {
    // Worst case: the install move fails AND the restore move back also fails.
    // The original destination is now stranded in the backup dir. The command
    // must NOT silently swallow this — it must throw an error naming the backup
    // path so the user can recover manually, with the install error attached.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'keep-me');
    fs.mkdirSync(destDir, { recursive: true });
    const existing = path.join(destDir, 'schema.yaml');
    fs.writeFileSync(existing, 'name: keep-me\nversion: 3\n');

    fsControl.failStagingInstall = true;
    fsControl.failBackupRestore = true;
    try {
      await runSchemaCommand(['fork', 'src-schema', 'keep-me', '--force', '--json']);
    } finally {
      fsControl.failStagingInstall = false;
      fsControl.failBackupRestore = false;
    }

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toContain('"forked": false');
    // The destination loss is surfaced, not silent: the error names a
    // `.fork-backup-` directory and how to restore it.
    expect(output).toMatch(/\.fork-backup-/);
    expect(output).toMatch(/preserved at/i);
    expect(output).toMatch(/could not restore/i);

    // The original content really is still on disk in the backup dir the error
    // points at (recovery is genuinely possible).
    const backupDir = fs
      .readdirSync(path.join(tempDir, 'openspec', 'schemas'))
      .find((entry) => entry.includes('.fork-backup-'));
    expect(backupDir).toBeTruthy();
    const rescued = fs.readFileSync(
      path.join(tempDir, 'openspec', 'schemas', backupDir!, 'schema.yaml'),
      'utf-8'
    );
    expect(rescued).toBe('name: keep-me\nversion: 3\n');
  });

  it('excludes fork staging/backup temp dirs from schema discovery', async () => {
    // The transient dirs `schema fork` creates live inside the schemas dir, so a
    // concurrent `openspec schema list`/validate scan must never treat them as
    // real schemas. Simulate both a staging and a backup dir mid-fork.
    const schemasDir = path.join(tempDir, 'openspec', 'schemas');
    for (const tempName of ['.fork-staging-abc123', 'keep-me.fork-backup-999-1700000000000']) {
      const dir = path.join(schemasDir, tempName);
      fs.mkdirSync(dir, { recursive: true });
      // Give them a valid-looking schema.yaml so only the name filter can
      // exclude them (not a missing file).
      fs.writeFileSync(path.join(dir, 'schema.yaml'), SOURCE_SCHEMA);
    }

    const { listSchemas, listSchemasWithInfo } = await import(
      '../../src/core/artifact-graph/resolver.js'
    );

    const names = listSchemas(tempDir);
    expect(names).toContain('src-schema');
    expect(names.some((n) => n.includes('.fork-'))).toBe(false);

    const infoNames = listSchemasWithInfo(tempDir).map((s) => s.name);
    expect(infoNames).toContain('src-schema');
    expect(infoNames.some((n) => n.includes('.fork-'))).toBe(false);
  });

  it('aborts and preserves a destination edited concurrently during staging', async () => {
    // The race alfred reproduced: between authorizing the --force overwrite and
    // the destructive swap, another process edits the destination. The fork must
    // fingerprint the authorized destination, re-check it before moving it aside,
    // and ABORT if it changed — never clobbering the concurrent edit.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'keep-me');
    fs.mkdirSync(destDir, { recursive: true });
    const existing = path.join(destDir, 'schema.yaml');
    const originalContent = [
      'name: keep-me',
      'version: 3',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Original',
      '    template: proposal.md',
      '    requires: []',
      '',
    ].join('\n');
    fs.writeFileSync(existing, originalContent);

    // Simulate the concurrent edit landing DURING the staging copy (after the
    // destination fingerprint was captured, before the destructive move).
    const concurrentContent = originalContent.replace(
      'description: Original',
      'description: Edited by a concurrent process'
    );
    fsControl.mutateOnCopy = { path: existing, content: concurrentContent };
    try {
      await runSchemaCommand(['fork', 'src-schema', 'keep-me', '--force', '--json']);
    } finally {
      fsControl.mutateOnCopy = null;
    }

    const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeTruthy();
    expect(output).toContain('"forked": false');
    expect(output).toMatch(/changed on disk|concurrent|aborted/i);

    // The concurrent edit is preserved — NOT overwritten by the fork. The
    // destination still has the concurrent content, and is not the fork's copy
    // (which would carry src-schema's `description: The proposal`).
    expect(fs.existsSync(existing)).toBe(true);
    expect(fs.readFileSync(existing, 'utf-8')).toBe(concurrentContent);

    // No staging or backup leftovers remain — the abort happened before any move.
    const leftovers = fs
      .readdirSync(path.join(tempDir, 'openspec', 'schemas'))
      .filter(
        (entry) =>
          entry.startsWith('.fork-staging-') || entry.includes('.fork-backup-')
      );
    expect(leftovers).toEqual([]);
  });

  it('keeps the backup when it is modified during the install window', async () => {
    // Second window: after the original is moved aside to the backup, a
    // concurrent write lands in the backup before it is discarded. The fork must
    // re-fingerprint the backup before deleting it and, on mismatch, keep it and
    // surface its location rather than silently deleting changed content.
    const destDir = path.join(tempDir, 'openspec', 'schemas', 'keep-me');
    fs.mkdirSync(destDir, { recursive: true });
    const existing = path.join(destDir, 'schema.yaml');
    fs.writeFileSync(existing, 'name: keep-me\nversion: 3\n');

    fsControl.mutateBackupContent = 'name: keep-me\nversion: 4-touched-in-backup\n';
    try {
      await runSchemaCommand(['fork', 'src-schema', 'keep-me', '--force', '--json']);
    } finally {
      fsControl.mutateBackupContent = null;
    }

    // The fork itself succeeds (the install path was untouched by the race).
    const errOutput = consoleErrorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(process.exitCode).toBeFalsy();
    // The install landed the fork at the destination.
    expect(fs.readFileSync(existing, 'utf-8')).toMatch(/^name: keep-me$/m);

    // The changed backup was NOT deleted, and its location is surfaced.
    expect(errOutput).toMatch(/was NOT deleted/i);
    expect(errOutput).toMatch(/\.fork-backup-/);
    const backupDir = fs
      .readdirSync(path.join(tempDir, 'openspec', 'schemas'))
      .find((entry) => entry.includes('.fork-backup-'));
    expect(backupDir).toBeTruthy();
    expect(
      fs.readFileSync(
        path.join(tempDir, 'openspec', 'schemas', backupDir!, 'schema.yaml'),
        'utf-8'
      )
    ).toBe('name: keep-me\nversion: 4-touched-in-backup\n');
  });

  it('writes YAML-ambiguous names as strings, not booleans/null', async () => {
    // Lock-in for the Document-API rename: forking to a kebab-valid but
    // YAML-ambiguous name (true/false/null/off) must round-trip as a STRING, so
    // the forked schema still loads. Guards against a future yaml core-schema
    // change that would emit these unquoted.
    const { parse } = await import('yaml');
    for (const name of ['true', 'false', 'null', 'off']) {
      process.exitCode = undefined;
      await runSchemaCommand(['fork', 'src-schema', name, '--json']);
      expect(process.exitCode).toBeFalsy();

      const destPath = path.join(
        tempDir,
        'openspec',
        'schemas',
        name,
        'schema.yaml'
      );
      const parsed = parse(fs.readFileSync(destPath, 'utf-8')) as {
        name: unknown;
      };
      expect(parsed.name).toBe(name);
      expect(typeof parsed.name).toBe('string');
    }
  });

  it('demonstrates the pre-#1130 object round trip dropped comments', async () => {
    // This asserts the OLD behavior that motivated the fix: parsing to a plain
    // object and re-stringifying discards comments (and does not carry the
    // authored block-scalar comment through). Kept as executable documentation
    // of what regressed before the parseDocument-based fix.
    const { parse, stringify } = await import('yaml');
    const obj = parse(SOURCE_SCHEMA) as Record<string, unknown>;
    obj.name = 'forked-schema';
    const oldOutput = stringify(obj);

    expect(oldOutput).not.toContain('# banner comment that must survive the fork');
    expect(oldOutput).not.toContain(
      '# instruction is authored as a literal block scalar'
    );
  });
});
