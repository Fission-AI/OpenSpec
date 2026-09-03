import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCLI } from '../helpers/run-cli.js';

async function runSchemaCommand(
  args: string[],
  schemaModule?: typeof import('../../src/commands/schema.js')
): Promise<void> {
  const { registerSchemaCommand } =
    schemaModule ?? (await import('../../src/commands/schema.js'));
  const program = new Command();
  registerSchemaCommand(program);
  await program.parseAsync(['node', 'openspec', 'schema', ...args]);
}

function snapshotTree(root: string): Array<{ path: string; type: string; content?: string }> | null {
  if (!fs.existsSync(root)) return null;

  const entries: Array<{ path: string; type: string; content?: string }> = [];
  const walk = (current: string, relative: string): void => {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        entries.push({ path: relativePath, type: 'directory' });
        walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        entries.push({
          path: relativePath,
          type: 'file',
          content: fs.readFileSync(absolutePath).toString('base64'),
        });
      } else {
        entries.push({
          path: relativePath,
          type: 'other',
          content: fs.readlinkSync(absolutePath),
        });
      }
    }
  };
  walk(root, '');
  return entries;
}

describe('schema command', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: typeof process.exitCode;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-test-'));

    // Create openspec directory structure
    fs.mkdirSync(path.join(tempDir, 'openspec', 'schemas'), { recursive: true });

    // Save original cwd and env
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    // Change to temp directory
    process.chdir(tempDir);

    // Set XDG paths to temp to avoid polluting user directories
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'xdg-config');

    // Spy on console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore cwd and env
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exitCode = originalExitCode;

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Restore spies
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Reset module cache
    vi.resetModules();
  });

  describe('schema which', () => {
    it('should show schema resolution from package', async () => {
      const { getSchemaDir, listSchemas } = await import(
        '../../src/core/artifact-graph/resolver.js'
      );

      // Verify spec-driven exists in package
      const schemas = listSchemas(tempDir);
      expect(schemas).toContain('spec-driven');

      const schemaDir = getSchemaDir('spec-driven', tempDir);
      expect(schemaDir).not.toBeNull();
      expect(schemaDir).toContain('schemas');
    });

    it('should detect project schema shadowing package', async () => {
      // Create a project-local spec-driven schema
      const projectSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(projectSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectSchemaDir, 'schema.yaml'),
        `name: spec-driven
version: 1
description: Custom spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`
      );
      fs.writeFileSync(path.join(projectSchemaDir, 'proposal.md'), '# Proposal');

      const { getSchemaDir } = await import('../../src/core/artifact-graph/resolver.js');

      // Should resolve to project
      const schemaDir = getSchemaDir('spec-driven', tempDir);
      expect(schemaDir).toBe(projectSchemaDir);
    });

    it('should list all schemas with --all flag', async () => {
      const { listSchemas } = await import('../../src/core/artifact-graph/resolver.js');

      const schemas = listSchemas(tempDir);
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas).toContain('spec-driven');
    });
  });

  describe('schema validate', () => {
    it('should validate a valid schema', async () => {
      // Create a valid project schema
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'test-schema');
      fs.mkdirSync(schemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemaDir, 'schema.yaml'),
        `name: test-schema
version: 1
description: Test schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`
      );
      fs.writeFileSync(path.join(schemaDir, 'proposal.md'), '# Proposal Template');

      const { parseSchema } = await import('../../src/core/artifact-graph/schema.js');
      const content = fs.readFileSync(path.join(schemaDir, 'schema.yaml'), 'utf-8');
      const schema = parseSchema(content);

      expect(schema.name).toBe('test-schema');
      expect(schema.artifacts).toHaveLength(1);
    });

    it('should detect missing template file', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'bad-schema');
      fs.mkdirSync(schemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemaDir, 'schema.yaml'),
        `name: bad-schema
version: 1
description: Bad schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: missing-template.md
`
      );

      // Template file doesn't exist, validation should report this
      const templatePath = path.join(schemaDir, 'missing-template.md');
      expect(fs.existsSync(templatePath)).toBe(false);
    });

    it('should reject a template symlink outside the runtime templates directory', async () => {
      if (process.platform === 'win32') return;

      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'linked-template');
      const templatesDir = path.join(schemaDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemaDir, 'schema.yaml'),
        `name: linked-template
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`
      );
      fs.symlinkSync('../schema.yaml', path.join(templatesDir, 'proposal.md'));

      await runSchemaCommand(['validate', 'linked-template', '--json']);

      expect(process.exitCode).toBe(1);
      const output = consoleLogSpy.mock.calls.at(-1)?.[0];
      expect(JSON.parse(output as string)).toMatchObject({
        valid: false,
        issues: [
          {
            path: 'artifacts.proposal.template',
            message: expect.stringContaining('outside the schema templates directory'),
          },
        ],
      });
    });

    it('should detect circular dependencies', async () => {
      const { parseSchema, SchemaValidationError } = await import(
        '../../src/core/artifact-graph/schema.js'
      );

      const content = `name: circular-schema
version: 1
description: Schema with circular deps
artifacts:
  - id: a
    generates: a.md
    description: A
    template: a.md
    requires:
      - b
  - id: b
    generates: b.md
    description: B
    template: b.md
    requires:
      - a
`;

      expect(() => parseSchema(content)).toThrow(SchemaValidationError);
      expect(() => parseSchema(content)).toThrow(/[Cc]yclic/);
    });

    it('should detect unknown dependency reference', async () => {
      const { parseSchema, SchemaValidationError } = await import(
        '../../src/core/artifact-graph/schema.js'
      );

      const content = `name: bad-ref-schema
version: 1
description: Schema with bad ref
artifacts:
  - id: a
    generates: a.md
    description: A
    template: a.md
    requires:
      - nonexistent
`;

      expect(() => parseSchema(content)).toThrow(SchemaValidationError);
      expect(() => parseSchema(content)).toThrow(/nonexistent/);
    });
  });

  describe('schema fork', () => {
    it('should copy schema to project directory', async () => {
      const { getSchemaDir } = await import('../../src/core/artifact-graph/resolver.js');

      // Get the package spec-driven schema
      const sourceDir = getSchemaDir('spec-driven', tempDir);
      expect(sourceDir).not.toBeNull();

      // Copy manually to simulate fork
      const destDir = path.join(tempDir, 'openspec', 'schemas', 'my-custom');
      fs.mkdirSync(destDir, { recursive: true });

      // Copy files
      const files = fs.readdirSync(sourceDir!);
      for (const file of files) {
        const srcPath = path.join(sourceDir!, file);
        const destPath = path.join(destDir, file);
        const stat = fs.statSync(srcPath);

        if (stat.isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Verify destination exists
      expect(fs.existsSync(path.join(destDir, 'schema.yaml'))).toBe(true);
    });

    it('should reject invalid schema names', () => {
      // Test kebab-case validation
      const isValidSchemaName = (name: string): boolean => {
        return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
      };

      expect(isValidSchemaName('my-schema')).toBe(true);
      expect(isValidSchemaName('my-schema-v2')).toBe(true);
      expect(isValidSchemaName('schema123')).toBe(true);
      expect(isValidSchemaName('My Schema')).toBe(false);
      expect(isValidSchemaName('my_schema')).toBe(false);
      expect(isValidSchemaName('MySchema')).toBe(false);
      expect(isValidSchemaName('-my-schema')).toBe(false);
      expect(isValidSchemaName('123schema')).toBe(false);
    });

    it('should reject linked files without copying their contents', async () => {
      if (process.platform === 'win32') return;

      const sourceDir = path.join(tempDir, 'openspec', 'schemas', 'linked-source');
      const templatesDir = path.join(sourceDir, 'templates');
      const secretPath = path.join(tempDir, 'secret.txt');
      const destinationDir = path.join(tempDir, 'openspec', 'schemas', 'linked-copy');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, 'schema.yaml'),
        `name: linked-source
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`
      );
      fs.writeFileSync(secretPath, 'keep this private');
      fs.symlinkSync(secretPath, path.join(templatesDir, 'proposal.md'));

      await runSchemaCommand(['fork', 'linked-source', 'linked-copy', '--json']);

      expect(process.exitCode).toBe(1);
      expect(fs.existsSync(destinationDir)).toBe(false);
      const output = consoleLogSpy.mock.calls.at(-1)?.[0];
      expect(JSON.parse(output as string).error).toContain(
        'Cannot fork schema with linked or unsupported entry'
      );
      expect(JSON.parse(output as string).error).toContain('Path is outside the allowed directory');
    });

    it('should dereference a confined template link into an independent fork', async () => {
      if (process.platform === 'win32') return;

      const sourceDir = path.join(tempDir, 'openspec', 'schemas', 'linked-source');
      const templatesDir = path.join(sourceDir, 'templates');
      const destinationDir = path.join(tempDir, 'openspec', 'schemas', 'linked-copy');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(sourceDir, 'schema.yaml'),
        `name: linked-source
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`
      );
      fs.writeFileSync(path.join(templatesDir, 'shared.md'), '# Shared template\n');
      fs.symlinkSync('shared.md', path.join(templatesDir, 'proposal.md'));

      await runSchemaCommand(['fork', 'linked-source', 'linked-copy', '--json']);

      expect(process.exitCode).not.toBe(1);
      const copiedTemplate = path.join(destinationDir, 'templates', 'proposal.md');
      expect(fs.lstatSync(copiedTemplate).isFile()).toBe(true);
      expect(fs.readFileSync(copiedTemplate, 'utf8')).toBe('# Shared template\n');
    });

    it('should fork a linked schema root', async () => {
      const realSourceDir = path.join(tempDir, 'shared-schema');
      const linkedSourceDir = path.join(
        tempDir,
        'openspec',
        'schemas',
        'linked-source'
      );
      const templatesDir = path.join(realSourceDir, 'templates');
      const destinationDir = path.join(tempDir, 'openspec', 'schemas', 'linked-copy');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.mkdirSync(path.dirname(linkedSourceDir), { recursive: true });
      fs.writeFileSync(
        path.join(realSourceDir, 'schema.yaml'),
        `name: linked-source
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`
      );
      fs.writeFileSync(path.join(templatesDir, 'proposal.md'), '# Linked root\n');
      fs.symlinkSync(
        realSourceDir,
        linkedSourceDir,
        process.platform === 'win32' ? 'junction' : 'dir'
      );

      await runSchemaCommand(['fork', 'linked-source', 'linked-copy', '--json']);

      expect(process.exitCode).not.toBe(1);
      expect(
        fs.readFileSync(path.join(destinationDir, 'templates', 'proposal.md'), 'utf8')
      ).toBe('# Linked root\n');
    });
  });

  describe('schema init', () => {
    const failureModes = [
      { label: 'new schema', force: false },
      { label: 'forced replacement', force: true },
    ];

    function prepareSchemaForFailure(force: boolean): {
      schemaDir: string;
      before: ReturnType<typeof snapshotTree>;
    } {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'my-workflow');
      if (force) {
        fs.mkdirSync(path.join(schemaDir, 'nested'), { recursive: true });
        fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), 'original schema bytes\n');
        fs.writeFileSync(path.join(schemaDir, 'nested', 'keep.bin'), Buffer.from([0, 1, 255]));
      }
      return { schemaDir, before: snapshotTree(schemaDir) };
    }

    async function runDefaultInit(
      force: boolean,
      schemaModule?: typeof import('../../src/commands/schema.js')
    ): Promise<void> {
      await runSchemaCommand(
        [
          'init',
          'my-workflow',
          ...(force ? ['--force'] : []),
          '--artifacts',
          'proposal,specs,tasks',
          '--default',
          '--json',
        ],
        schemaModule
      );
    }

    it('uses the configured default in the next new change command', async () => {
      const initialized = await runCLI(
        [
          'schema',
          'init',
          'my-workflow',
          '--artifacts',
          'proposal,specs,tasks',
          '--default',
          '--json',
        ],
        { cwd: tempDir }
      );
      expect(initialized.exitCode).toBe(0);

      const created = await runCLI(['new', 'change', 'uses-default', '--json'], {
        cwd: tempDir,
      });
      expect(created.exitCode).toBe(0);
      expect(
        fs.readFileSync(
          path.join(tempDir, 'openspec', 'changes', 'uses-default', '.openspec.yaml'),
          'utf-8'
        )
      ).toContain('schema: my-workflow');
    });

    it('scaffolds every template with a top-level heading', async () => {
      const initialized = await runCLI(
        [
          'schema',
          'init',
          'lint-clean',
          '--artifacts',
          'proposal,specs,design,tasks',
          '--json',
        ],
        { cwd: tempDir }
      );
      expect(initialized.exitCode).toBe(0);

      const templatesDir = path.join(
        tempDir,
        'openspec',
        'schemas',
        'lint-clean',
        'templates'
      );
      const templates = fs
        .readdirSync(templatesDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(path.relative(templatesDir, entry.parentPath), entry.name))
        .sort();
      expect(templates).toEqual([
        'design.md',
        'proposal.md',
        path.join('specs', 'spec.md'),
        'tasks.md',
      ].sort());

      // The artifact a template produces is a document in its own right, so it
      // opens with an `# ` heading rather than a section header (#1138).
      for (const template of templates) {
        const content = fs.readFileSync(path.join(templatesDir, template), 'utf-8');
        expect(content.replace(/\r\n?/g, '\n').split('\n')[0]).toMatch(/^# \S/);
      }
    });

    describe.each(failureModes)('$label with --default', ({ force }) => {
      it('preserves the schema and invalid YAML config byte-for-byte', async () => {
        const { schemaDir, before } = prepareSchemaForFailure(force);
        const configPath = path.join(tempDir, 'openspec', 'config.yaml');
        const configBytes = Buffer.from('schema: [unterminated\n');
        fs.writeFileSync(configPath, configBytes);

        await runDefaultInit(force);

        expect(process.exitCode).toBe(1);
        expect(snapshotTree(schemaDir)).toEqual(before);
        expect(fs.readFileSync(configPath)).toEqual(configBytes);
      });

      it('preserves the schema and scalar YAML config byte-for-byte', async () => {
        const { schemaDir, before } = prepareSchemaForFailure(force);
        const configPath = path.join(tempDir, 'openspec', 'config.yaml');
        const configBytes = Buffer.from('not-an-object\n');
        fs.writeFileSync(configPath, configBytes);

        await runDefaultInit(force);

        expect(process.exitCode).toBe(1);
        expect(snapshotTree(schemaDir)).toEqual(before);
        expect(fs.readFileSync(configPath)).toEqual(configBytes);
      });

      it('preserves the schema when the config path is a directory', async () => {
        const { schemaDir, before } = prepareSchemaForFailure(force);
        const configPath = path.join(tempDir, 'openspec', 'config.yaml');
        fs.mkdirSync(configPath);
        fs.writeFileSync(path.join(configPath, 'keep.txt'), 'keep me');

        await runDefaultInit(force);

        expect(process.exitCode).toBe(1);
        expect(snapshotTree(schemaDir)).toEqual(before);
        expect(snapshotTree(configPath)).toEqual([
          {
            path: 'keep.txt',
            type: 'file',
            content: Buffer.from('keep me').toString('base64'),
          },
        ]);
      });

      it('preserves the schema and read-only config byte-for-byte', async () => {
        if (process.platform === 'win32') return;

        const { schemaDir, before } = prepareSchemaForFailure(force);
        const configPath = path.join(tempDir, 'openspec', 'config.yaml');
        const configBytes = Buffer.from('schema: existing\n');
        fs.writeFileSync(configPath, configBytes, { mode: 0o444 });

        try {
          await runDefaultInit(force);

          expect(process.exitCode).toBe(1);
          expect(snapshotTree(schemaDir)).toEqual(before);
          expect(fs.readFileSync(configPath)).toEqual(configBytes);
        } finally {
          fs.chmodSync(configPath, 0o644);
        }
      });

      it('preserves the schema and an external config symlink target', async () => {
        if (process.platform === 'win32') return;

        const { schemaDir, before } = prepareSchemaForFailure(force);
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-config-'));
        const outsideConfig = path.join(outsideDir, 'config.yaml');
        const configPath = path.join(tempDir, 'openspec', 'config.yaml');
        const configBytes = Buffer.from('schema: untouched\n');
        fs.writeFileSync(outsideConfig, configBytes);
        fs.symlinkSync(outsideConfig, configPath, 'file');

        try {
          await runDefaultInit(force);

          expect(process.exitCode).toBe(1);
          expect(snapshotTree(schemaDir)).toEqual(before);
          expect(fs.readFileSync(outsideConfig)).toEqual(configBytes);
          expect(fs.lstatSync(configPath).isSymbolicLink()).toBe(true);
        } finally {
          fs.rmSync(outsideDir, { recursive: true, force: true });
        }
      });
    });

    it('rolls back a forced schema replacement when installing the config fails', async () => {
      const { schemaDir, before } = prepareSchemaForFailure(true);
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      const configBytes = Buffer.from('schema: existing\ncontext: keep me\n');
      fs.writeFileSync(configPath, configBytes);
      const schemaModule = await import('../../src/commands/schema.js');
      const { schemaInitFileOperations } = schemaModule;
      const renameSync = schemaInitFileOperations.renameSync;
      const renameCalls: Array<[string, string]> = [];
      schemaInitFileOperations.renameSync = (source, destination) => {
        renameCalls.push([String(source), String(destination)]);
        if (String(source).includes('.schema-init-config-')) {
          throw new Error('simulated config install failure');
        }
        renameSync(source, destination);
      };

      try {
        await runDefaultInit(true, schemaModule);
      } finally {
        schemaInitFileOperations.renameSync = renameSync;
      }

      expect(process.exitCode).toBe(1);
      expect(renameCalls[3]).toEqual([
        expect.stringContaining('.schema-init-config-'),
        expect.stringMatching(/[/\\]openspec[/\\]config\.yaml$/),
      ]);
      expect(snapshotTree(schemaDir)).toEqual(before);
      expect(fs.readFileSync(configPath)).toEqual(configBytes);
    });

    it('makes the new schema the one the config loader resolves when --default is given', async () => {
      const { readProjectConfig } = await import('../../src/core/project-config.js');

      await runSchemaCommand([
        'init',
        'my-workflow',
        '--artifacts',
        'proposal,specs,tasks',
        '--default',
        '--json',
      ]);

      expect(process.exitCode).toBeUndefined();
      // Asserted through the loader, not the raw YAML: --default's whole job is
      // that the next `new change` picks the schema up, and the key it has to
      // write to make that happen is the one readProjectConfig looks at (#1708).
      expect(readProjectConfig(tempDir)?.schema).toBe('my-workflow');
    });

    it('keeps the rest of an existing config when --default rewrites it', async () => {
      const { readProjectConfig } = await import('../../src/core/project-config.js');
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      fs.writeFileSync(configPath, 'schema: spec-driven\ncontext: keep me\n');

      await runSchemaCommand([
        'init',
        'my-workflow',
        '--artifacts',
        'proposal,specs,tasks',
        '--default',
        '--json',
      ]);

      const config = readProjectConfig(tempDir);
      expect(config?.schema).toBe('my-workflow');
      expect(config?.context).toBe('keep me');
    });

    it('updates config.yml in place without hiding its settings behind a new config.yaml', async () => {
      const { readProjectConfig } = await import('../../src/core/project-config.js');
      const configPath = path.join(tempDir, 'openspec', 'config.yml');
      fs.writeFileSync(
        configPath,
        '# project context\nschema: spec-driven\ncontext: keep me\n'
      );

      await runSchemaCommand([
        'init',
        'my-workflow',
        '--artifacts',
        'proposal,specs,tasks',
        '--default',
        '--json',
      ]);

      expect(fs.existsSync(path.join(tempDir, 'openspec', 'config.yaml'))).toBe(false);
      expect(fs.readFileSync(configPath, 'utf-8')).toContain('# project context');
      expect(readProjectConfig(tempDir)).toMatchObject({
        schema: 'my-workflow',
        context: 'keep me',
      });
    });

    it('does not set the default through a config symlink outside the project', async () => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-config-'));
      const outsideConfig = path.join(outsideDir, 'config.yaml');
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      fs.writeFileSync(outsideConfig, 'schema: untouched\n');
      fs.symlinkSync(outsideConfig, configPath, 'file');

      try {
        await runSchemaCommand([
          'init',
          'my-workflow',
          '--artifacts',
          'proposal,specs,tasks',
          '--default',
          '--json',
        ]);

        expect(process.exitCode).toBe(1);
        expect(fs.readFileSync(outsideConfig, 'utf-8')).toBe('schema: untouched\n');
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it('clears the dead defaultSchema key a previous run left behind', async () => {
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      fs.writeFileSync(configPath, 'defaultSchema: stale-workflow\n');

      await runSchemaCommand([
        'init',
        'my-workflow',
        '--artifacts',
        'proposal,specs,tasks',
        '--default',
        '--json',
      ]);

      // Both keys present would leave the file naming two different defaults,
      // one of which does nothing.
      const written = fs.readFileSync(configPath, 'utf-8');
      expect(written).toContain('schema: my-workflow');
      expect(written).not.toContain('defaultSchema');
    });

    it('should preserve an existing schema when forced init rejects an artifact', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'tdd-driven');
      const schemaPath = path.join(schemaDir, 'schema.yaml');
      const sentinelPath = path.join(schemaDir, 'keep.bin');
      const existingSchema = 'name: tdd-driven\nversion: 1\n';
      const sentinel = Buffer.from([0x00, 0x01, 0x7f, 0xff]);

      fs.mkdirSync(schemaDir, { recursive: true });
      fs.writeFileSync(schemaPath, existingSchema);
      fs.writeFileSync(sentinelPath, sentinel);

      await runSchemaCommand([
        'init',
        'tdd-driven',
        '--force',
        '--artifacts',
        'proposal,specs,design,task',
        '--json',
      ]);

      expect(process.exitCode).toBe(1);
      const output = consoleLogSpy.mock.calls.at(-1)?.[0];
      expect(typeof output).toBe('string');
      expect(JSON.parse(output as string)).toEqual({
        created: false,
        error: "Unknown artifact 'task'",
        valid: ['proposal', 'specs', 'design', 'tasks'],
      });
      expect(fs.readFileSync(schemaPath, 'utf-8')).toBe(existingSchema);
      expect(fs.readFileSync(sentinelPath)).toEqual(sentinel);
    });

    it('should replace an existing schema after forced init validates its artifacts', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'tdd-driven');
      const sentinelPath = path.join(schemaDir, 'keep.txt');

      fs.mkdirSync(schemaDir, { recursive: true });
      fs.writeFileSync(sentinelPath, 'remove me');

      await runSchemaCommand([
        'init',
        'tdd-driven',
        '--force',
        '--artifacts',
        'proposal,specs,design,tasks',
        '--json',
      ]);

      expect(process.exitCode).toBeUndefined();
      const output = consoleLogSpy.mock.calls.at(-1)?.[0];
      expect(typeof output).toBe('string');
      expect(JSON.parse(output as string)).toMatchObject({
        created: true,
        schema: 'tdd-driven',
        artifacts: ['proposal', 'specs', 'design', 'tasks'],
      });
      expect(fs.existsSync(sentinelPath)).toBe(false);
      expect(fs.existsSync(path.join(schemaDir, 'schema.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(schemaDir, 'templates', 'proposal.md'))).toBe(true);
      expect(fs.existsSync(path.join(schemaDir, 'templates', 'specs', 'spec.md'))).toBe(true);
      expect(fs.existsSync(path.join(schemaDir, 'templates', 'design.md'))).toBe(true);
      expect(fs.existsSync(path.join(schemaDir, 'templates', 'tasks.md'))).toBe(true);
    });

    it('should create schema directory with schema.yaml', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'new-schema');
      fs.mkdirSync(schemaDir, { recursive: true });

      const { stringify: stringifyYaml } = await import('yaml');

      const schema = {
        name: 'new-schema',
        version: 1,
        description: 'A new schema',
        artifacts: [
          {
            id: 'proposal',
            generates: 'proposal.md',
            description: 'Proposal',
            template: 'proposal.md',
            requires: [],
          },
        ],
      };

      fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), stringifyYaml(schema));
      fs.writeFileSync(path.join(schemaDir, 'proposal.md'), '# Proposal');

      // Verify
      expect(fs.existsSync(path.join(schemaDir, 'schema.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(schemaDir, 'proposal.md'))).toBe(true);
    });

    it('should validate schema name format', () => {
      const isValidSchemaName = (name: string): boolean => {
        return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
      };

      expect(isValidSchemaName('valid-name')).toBe(true);
      expect(isValidSchemaName('Invalid Name')).toBe(false);
    });

    it('should set up artifact dependencies correctly', async () => {
      const { parseSchema } = await import('../../src/core/artifact-graph/schema.js');

      // Create schema with standard artifact chain
      const content = `name: test-workflow
version: 1
description: Test workflow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
  - id: specs
    generates: specs/**/*.md
    description: Specs
    template: specs/spec.md
    requires:
      - proposal
  - id: design
    generates: design.md
    description: Design
    template: design.md
    requires:
      - specs
  - id: tasks
    generates: tasks.md
    description: Tasks
    template: tasks.md
    requires:
      - design
`;

      const schema = parseSchema(content);
      expect(schema.artifacts[0].requires).toEqual([]);
      expect(schema.artifacts[1].requires).toEqual(['proposal']);
      expect(schema.artifacts[2].requires).toEqual(['specs']);
      expect(schema.artifacts[3].requires).toEqual(['design']);
    });

    it('excludes init staging/backup temp dirs from schema discovery', async () => {
      // `schema init` stages into `.init-staging-<rand>` and moves an existing
      // schema aside to `<name>.init-backup-<pid>-<ts>`. Both live inside the
      // schemas dir, and the backup deliberately outlives the run when its
      // cleanup is blocked, so discovery must never surface either as a real
      // schema. Mirrors the equivalent guard for `schema fork`.
      const validSchema = [
        'name: real-schema',
        'version: 1',
        'description: a real project schema',
        'artifacts:',
        '  - id: proposal',
        '    generates: proposal.md',
        '    description: The proposal',
        '    template: proposal.md',
        '    requires: []',
        '',
      ].join('\n');
      const schemasDir = path.join(tempDir, 'openspec', 'schemas');
      const realSchema = path.join(schemasDir, 'real-schema');
      fs.mkdirSync(realSchema, { recursive: true });
      fs.writeFileSync(path.join(realSchema, 'schema.yaml'), validSchema);

      for (const tempName of [
        '.init-staging-abc123',
        'real-schema.init-backup-999-1700000000000',
      ]) {
        const dir = path.join(schemasDir, tempName);
        fs.mkdirSync(dir, { recursive: true });
        // Give them a valid-looking schema.yaml so only the name filter can
        // exclude them (not a missing file).
        fs.writeFileSync(path.join(dir, 'schema.yaml'), validSchema);
      }

      const { listSchemas, listSchemasWithInfo } = await import(
        '../../src/core/artifact-graph/resolver.js'
      );

      const names = listSchemas(tempDir);
      expect(names).toContain('real-schema');
      expect(names.some((n) => n.includes('.init-'))).toBe(false);

      const infoNames = listSchemasWithInfo(tempDir).map((s) => s.name);
      expect(infoNames).toContain('real-schema');
      expect(infoNames.some((n) => n.includes('.init-'))).toBe(false);
    });
  });

  describe('JSON output format', () => {
    it('should output valid JSON for schema which', async () => {
      const { listSchemas } = await import('../../src/core/artifact-graph/resolver.js');

      const schemas = listSchemas(tempDir);
      const jsonOutput = JSON.stringify(schemas);

      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    });

    it('should include expected fields in validation JSON', () => {
      const validationResult = {
        valid: true,
        name: 'test-schema',
        path: '/path/to/schema',
        issues: [],
      };

      const json = JSON.stringify(validationResult);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('valid');
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('path');
      expect(parsed).toHaveProperty('issues');
    });

    it('should include expected fields in fork JSON', () => {
      const forkResult = {
        forked: true,
        source: 'spec-driven',
        sourcePath: '/path/to/source',
        sourceLocation: 'package',
        destination: 'my-custom',
        destinationPath: '/path/to/dest',
      };

      const json = JSON.stringify(forkResult);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('forked');
      expect(parsed).toHaveProperty('source');
      expect(parsed).toHaveProperty('sourceLocation');
      expect(parsed).toHaveProperty('destination');
    });

    it('should include expected fields in init JSON', () => {
      const initResult = {
        created: true,
        path: '/path/to/schema',
        schema: 'new-schema',
        artifacts: ['proposal', 'specs'],
        setAsDefault: false,
      };

      const json = JSON.stringify(initResult);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('created');
      expect(parsed).toHaveProperty('path');
      expect(parsed).toHaveProperty('schema');
      expect(parsed).toHaveProperty('artifacts');
    });
  });
});

describe('schema command shell completion registry', () => {
  it('should have schema command in registry', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const schemaCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'schema');
    expect(schemaCmd).toBeDefined();
    expect(schemaCmd?.description).toBe('Manage workflow schemas');
  });

  it('should have all schema subcommands in registry', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const schemaCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'schema');
    const subcommandNames = schemaCmd?.subcommands?.map((s) => s.name) ?? [];

    expect(subcommandNames).toContain('which');
    expect(subcommandNames).toContain('validate');
    expect(subcommandNames).toContain('fork');
    expect(subcommandNames).toContain('init');
  });

  it('should have --json flag on all subcommands', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const schemaCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'schema');
    const subcommands = schemaCmd?.subcommands ?? [];

    for (const subcmd of subcommands) {
      const flagNames = subcmd.flags?.map((f) => f.name) ?? [];
      expect(flagNames).toContain('json');
    }
  });

  it('should have --all flag on which subcommand', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const schemaCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'schema');
    const whichCmd = schemaCmd?.subcommands?.find((s) => s.name === 'which');
    const flagNames = whichCmd?.flags?.map((f) => f.name) ?? [];

    expect(flagNames).toContain('all');
  });

  it('should have --verbose flag on validate subcommand', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const schemaCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'schema');
    const validateCmd = schemaCmd?.subcommands?.find((s) => s.name === 'validate');
    const flagNames = validateCmd?.flags?.map((f) => f.name) ?? [];

    expect(flagNames).toContain('verbose');
  });

  it('should have --force flag on fork and init subcommands', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const schemaCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'schema');
    const forkCmd = schemaCmd?.subcommands?.find((s) => s.name === 'fork');
    const initCmd = schemaCmd?.subcommands?.find((s) => s.name === 'init');

    expect(forkCmd?.flags?.map((f) => f.name)).toContain('force');
    expect(initCmd?.flags?.map((f) => f.name)).toContain('force');
  });
});
