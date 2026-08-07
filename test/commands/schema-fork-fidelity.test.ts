import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

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
