import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const fsControl = vi.hoisted(() => ({
  linkErrorCode: null as string | null,
  mutateDestinationAfterStaging: null as null | { path: string; content: string },
  replaceStagingContent: null as string | null,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: actual,
    linkSync: (...args: Parameters<typeof actual.linkSync>) => {
      if (fsControl.linkErrorCode !== null) {
        const error = new Error('Mocked hard-link failure') as NodeJS.ErrnoException;
        error.code = fsControl.linkErrorCode;
        fsControl.linkErrorCode = null;
        throw error;
      }
      return actual.linkSync(...args);
    },
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      const result = actual.writeFileSync(...args);
      if (
        fsControl.replaceStagingContent !== null &&
        String(args[0]).includes('.override-staging-')
      ) {
        const replacement = fsControl.replaceStagingContent;
        fsControl.replaceStagingContent = null;
        actual.writeFileSync(args[0], replacement);
      }
      if (
        fsControl.mutateDestinationAfterStaging &&
        String(args[0]).includes('.override-staging-')
      ) {
        const mutation = fsControl.mutateDestinationAfterStaging;
        fsControl.mutateDestinationAfterStaging = null;
        actual.writeFileSync(mutation.path, mutation.content);
      }
      return result;
    },
  };
});

async function runSchemaCommand(args: string[]): Promise<void> {
  const { registerSchemaCommand } = await import('../../src/commands/schema.js');
  const program = new Command();
  registerSchemaCommand(program);
  await program.parseAsync(['node', 'openspec', 'schema', ...args]);
}

describe('schema overlay commands', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: typeof process.exitCode;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-overlay-command-'))
    );
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    process.chdir(tempDir);
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'xdg-config');
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
    fsControl.linkErrorCode = null;
    fsControl.mutateDestinationAfterStaging = null;
    fsControl.replaceStagingContent = null;
    vi.resetModules();
  });

  function overlayPath(): string {
    return path.join(
      tempDir,
      'xdg-data',
      'openspec',
      'schemas',
      'spec-driven',
      'schema.override.yaml'
    );
  }

  function lastJsonLog(): Record<string, unknown> {
    const value = consoleLogSpy.mock.calls.at(-1)?.[0];
    expect(typeof value).toBe('string');
    return JSON.parse(value as string) as Record<string, unknown>;
  }

  it('creates a no-op overlay without copying schema or templates', async () => {
    await runSchemaCommand(['override', 'spec-driven', '--json']);

    expect(process.exitCode).toBeUndefined();
    expect(lastJsonLog()).toMatchObject({
      created: true,
      schema: 'spec-driven',
      path: overlayPath(),
    });
    expect(fs.readFileSync(overlayPath(), 'utf-8')).toContain('patchVersion: 1');
    expect(fs.existsSync(path.join(path.dirname(overlayPath()), 'schema.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(path.dirname(overlayPath()), 'templates'))).toBe(false);
  });

  it('does not overwrite an overlay created during initial installation', async () => {
    const concurrentContent = 'patchVersion: 1\ndescription: Concurrent creation\n';
    fsControl.mutateDestinationAfterStaging = {
      path: overlayPath(),
      content: concurrentContent,
    };

    await runSchemaCommand(['override', 'spec-driven', '--json']);

    expect(process.exitCode).toBe(1);
    expect(lastJsonLog()).toMatchObject({
      created: false,
      error: expect.stringContaining('Schema override already exists'),
    });
    expect(fs.readFileSync(overlayPath(), 'utf-8')).toBe(concurrentContent);
  });

  it.each(['EPERM', 'ENOSYS', 'EXDEV'])(
    'falls back to exclusive creation when hard links fail with %s',
    async (errorCode) => {
      fsControl.linkErrorCode = errorCode;

      await runSchemaCommand(['override', 'spec-driven', '--json']);

      expect(process.exitCode).toBeUndefined();
      expect(lastJsonLog()).toMatchObject({ created: true, path: overlayPath() });
      expect(fs.readFileSync(overlayPath(), 'utf-8')).toContain('patchVersion: 1');
    }
  );

  it('preserves an existing overlay unless force is supplied', async () => {
    await runSchemaCommand(['override', 'spec-driven', '--json']);
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\ndescription: Keep me\n');
    consoleLogSpy.mockClear();
    process.exitCode = undefined;

    await runSchemaCommand(['override', 'spec-driven', '--json']);

    expect(process.exitCode).toBe(1);
    expect(lastJsonLog()).toMatchObject({ created: false });
    expect(fs.readFileSync(overlayPath(), 'utf-8')).toContain('Keep me');
  });

  it('atomically replaces an existing overlay with force', async () => {
    await runSchemaCommand(['override', 'spec-driven', '--json']);
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\ndescription: Replace me\n');
    consoleLogSpy.mockClear();
    process.exitCode = undefined;

    await runSchemaCommand(['override', 'spec-driven', '--force', '--json']);

    expect(process.exitCode).toBeUndefined();
    expect(lastJsonLog()).toMatchObject({ created: true });
    expect(fs.readFileSync(overlayPath(), 'utf-8')).not.toContain('Replace me');
    expect(
      fs.readdirSync(path.dirname(overlayPath())).filter((name) => name.includes('override-'))
    ).toEqual([]);
  });

  it('preserves a concurrently modified overlay during force replacement', async () => {
    await runSchemaCommand(['override', 'spec-driven', '--json']);
    const concurrentContent = 'patchVersion: 1\ndescription: Concurrent edit\n';
    fsControl.mutateDestinationAfterStaging = {
      path: overlayPath(),
      content: concurrentContent,
    };
    consoleLogSpy.mockClear();
    process.exitCode = undefined;

    await runSchemaCommand(['override', 'spec-driven', '--force', '--json']);

    expect(process.exitCode).toBe(1);
    expect(lastJsonLog()).toMatchObject({
      created: false,
      error: expect.stringContaining('changed while the replacement was being prepared'),
    });
    expect(fs.readFileSync(overlayPath(), 'utf-8')).toBe(concurrentContent);
  });

  it('rejects invalid staged content without replacing the existing overlay', async () => {
    const existingContent = 'patchVersion: 1\ndescription: Keep me\n';
    fs.mkdirSync(path.dirname(overlayPath()), { recursive: true });
    fs.writeFileSync(overlayPath(), existingContent);
    fsControl.replaceStagingContent = 'patchVersion: invalid\n';

    await runSchemaCommand(['override', 'spec-driven', '--force', '--json']);

    expect(process.exitCode).toBe(1);
    expect(lastJsonLog()).toMatchObject({
      created: false,
      error: expect.stringContaining('Invalid schema override'),
    });
    expect(fs.readFileSync(overlayPath(), 'utf-8')).toBe(existingContent);
    expect(
      fs.readdirSync(path.dirname(overlayPath())).filter((entry) =>
        entry.startsWith('.override-staging-')
      )
    ).toEqual([]);
  });

  it('refuses to combine an overlay with a complete user replacement', async () => {
    const userSchemaDir = path.dirname(overlayPath());
    fs.mkdirSync(userSchemaDir, { recursive: true });
    fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), 'name: spec-driven\n');

    await runSchemaCommand(['override', 'spec-driven', '--json']);

    expect(process.exitCode).toBe(1);
    const output = lastJsonLog();
    expect(output).toMatchObject({ created: false });
    expect(output.error as string).toContain('complete user schema');
    expect(fs.existsSync(overlayPath())).toBe(false);
  });

  it('normalizes YAML extensions in schema resolution and validation output', async () => {
    fs.mkdirSync(path.dirname(overlayPath()), { recursive: true });
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\n');

    await runSchemaCommand(['which', 'spec-driven.yaml', '--json']);

    expect(lastJsonLog()).toMatchObject({
      name: 'spec-driven',
      source: 'package',
      overlay: { path: overlayPath() },
    });

    consoleLogSpy.mockClear();
    await runSchemaCommand(['validate', 'spec-driven.yml', '--json']);

    expect(lastJsonLog()).toMatchObject({
      name: 'spec-driven',
      valid: true,
      overlayPath: overlayPath(),
    });
  });

  it('labels active and inactive overlays in the human schema listing', async () => {
    fs.mkdirSync(path.dirname(overlayPath()), { recursive: true });
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\n');

    await runSchemaCommand(['which', '--all']);

    expect(consoleLogSpy.mock.calls.flat().join('\n')).toContain(
      'spec-driven (user overlay)'
    );

    const projectSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
    fs.mkdirSync(projectSchemaDir, { recursive: true });
    fs.writeFileSync(path.join(projectSchemaDir, 'schema.yaml'), 'name: spec-driven\n');
    consoleLogSpy.mockClear();

    await runSchemaCommand(['which', '--all']);

    expect(consoleLogSpy.mock.calls.flat().join('\n')).toContain(
      'spec-driven (shadows: package) (inactive user overlay)'
    );
  });

  it('continues listing usable schemas when one user schema conflicts', async () => {
    const conflictingDir = path.join(
      tempDir,
      'xdg-data',
      'openspec',
      'schemas',
      'conflicting'
    );
    fs.mkdirSync(conflictingDir, { recursive: true });
    fs.writeFileSync(path.join(conflictingDir, 'schema.yaml'), `
name: conflicting
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);
    fs.writeFileSync(path.join(conflictingDir, 'schema.override.yaml'), 'patchVersion: 1\n');

    await runSchemaCommand(['which', '--all', '--json']);

    const value = consoleLogSpy.mock.calls.at(-1)?.[0];
    const output = JSON.parse(String(value)) as Array<{ name: string }>;
    expect(output.map((schema) => schema.name)).toContain('spec-driven');
    expect(output.map((schema) => schema.name)).not.toContain('conflicting');
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).toContain(
      "Warning: skipped 'conflicting'"
    );
  });

  it('reports and validates a composed package schema', async () => {
    const userSchemaDir = path.dirname(overlayPath());
    fs.mkdirSync(userSchemaDir, { recursive: true });
    fs.writeFileSync(overlayPath(), `
patchVersion: 1
artifacts:
  tasks:
    instruction:
      append: Personal rule
`);

    await runSchemaCommand(['which', 'spec-driven', '--json']);
    expect(lastJsonLog()).toMatchObject({
      name: 'spec-driven',
      source: 'package',
      overlay: { source: 'user', path: overlayPath() },
    });

    consoleLogSpy.mockClear();
    process.exitCode = undefined;
    await runSchemaCommand(['validate', 'spec-driven', '--json']);
    expect(lastJsonLog()).toMatchObject({
      name: 'spec-driven',
      valid: true,
      overlayPath: overlayPath(),
      issues: [],
    });
  });

  it('reports the concrete user and package source for each template', async () => {
    const userSchemaDir = path.dirname(overlayPath());
    const userTemplatesDir = path.join(userSchemaDir, 'templates');
    fs.mkdirSync(userTemplatesDir, { recursive: true });
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\n');
    fs.writeFileSync(path.join(userTemplatesDir, 'tasks.md'), '# Personal tasks\n');

    const { templatesCommand } = await import('../../src/commands/workflow/templates.js');
    await templatesCommand({ schema: 'spec-driven', json: true });

    expect(lastJsonLog()).toMatchObject({
      tasks: {
        path: fs.realpathSync.native(path.join(userTemplatesDir, 'tasks.md')),
        source: 'user',
      },
      proposal: {
        source: 'package',
      },
    });
  });

  it('returns file-specific validation issues for an invalid overlay', async () => {
    fs.mkdirSync(path.dirname(overlayPath()), { recursive: true });
    fs.writeFileSync(overlayPath(), `
patchVersion: 1
artifacts:
  tasks:
    instruction:
      replace: Replacement
      append: Conflict
`);

    await runSchemaCommand(['validate', 'spec-driven', '--json']);

    expect(process.exitCode).toBe(1);
    const output = lastJsonLog();
    expect(output.valid).toBe(false);
    expect(output.issues).toEqual([
      expect.objectContaining({
        level: 'error',
        path: overlayPath(),
        message: expect.stringContaining('replace cannot be combined'),
      }),
    ]);
  });

  it('reports a complete user schema and overlay conflict during validation', async () => {
    const userSchemaDir = path.dirname(overlayPath());
    fs.mkdirSync(userSchemaDir, { recursive: true });
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\n');
    fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), `
name: spec-driven
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);

    await runSchemaCommand(['validate', 'spec-driven', '--json']);

    expect(process.exitCode).toBe(1);
    expect(lastJsonLog()).toMatchObject({
      name: 'spec-driven',
      valid: false,
      issues: [
        expect.objectContaining({
          path: overlayPath(),
          message: expect.stringContaining('both a complete user replacement'),
        }),
      ],
    });
  });

  it('validates a project schema despite an inactive conflicting user layer', async () => {
    const userSchemaDir = path.dirname(overlayPath());
    fs.mkdirSync(userSchemaDir, { recursive: true });
    fs.writeFileSync(overlayPath(), 'patchVersion: 1\n');
    fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), 'name: conflicting-user\n');

    const projectSchemaDir = path.join(
      tempDir,
      'openspec',
      'schemas',
      'spec-driven'
    );
    fs.mkdirSync(path.join(projectSchemaDir, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(projectSchemaDir, 'schema.yaml'), `
name: spec-driven
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);
    fs.writeFileSync(path.join(projectSchemaDir, 'templates', 'proposal.md'), '# Proposal\n');

    await runSchemaCommand(['validate', 'spec-driven', '--json']);

    expect(process.exitCode).toBeUndefined();
    expect(lastJsonLog()).toMatchObject({
      name: 'spec-driven',
      valid: true,
      issues: [],
    });
  });

  it('materializes the effective overlay and templates when forking', async () => {
    const userSchemaDir = path.dirname(overlayPath());
    const userTemplatesDir = path.join(userSchemaDir, 'templates');
    fs.mkdirSync(userTemplatesDir, { recursive: true });
    fs.writeFileSync(overlayPath(), `
patchVersion: 1
artifacts:
  tasks:
    instruction:
      append: Personal forked rule
`);
    fs.writeFileSync(path.join(userTemplatesDir, 'tasks.md'), '# Personal tasks template\n');

    await runSchemaCommand(['fork', 'spec-driven', 'personal-flow', '--json']);

    expect(process.exitCode).toBeUndefined();
    const destination = path.join(tempDir, 'openspec', 'schemas', 'personal-flow');
    const schemaContent = fs.readFileSync(path.join(destination, 'schema.yaml'), 'utf-8');
    expect(schemaContent).toContain('name: personal-flow');
    expect(schemaContent).toContain('Personal forked rule');
    expect(fs.readFileSync(path.join(destination, 'templates', 'tasks.md'), 'utf-8'))
      .toContain('Personal tasks template');
    expect(fs.readFileSync(path.join(destination, 'templates', 'proposal.md'), 'utf-8'))
      .toContain('## Why');
  });
});
