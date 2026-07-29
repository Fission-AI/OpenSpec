import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompletionCommand } from '../../src/commands/completion.js';
import { CompletionProvider } from '../../src/core/completions/completion-provider.js';
import * as shellDetection from '../../src/utils/shell-detection.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Mock the shell detection module
vi.mock('../../src/utils/shell-detection.js', () => ({
  detectShell: vi.fn(),
}));

// Mock the ZshInstaller
vi.mock('../../src/core/completions/installers/zsh-installer.js', () => ({
  ZshInstaller: vi.fn().mockImplementation(() => ({
    install: vi.fn().mockResolvedValue({
      success: true,
      installedPath: '/home/user/.oh-my-zsh/completions/_openspec',
      isOhMyZsh: true,
      message: 'Completion script installed successfully for Oh My Zsh',
      instructions: [
        'Completion script installed to Oh My Zsh completions directory.',
        'Restart your shell or run: exec zsh',
        'Completions should activate automatically.',
      ],
    }),
    uninstall: vi.fn().mockResolvedValue({
      success: true,
      message: 'Completion script removed from /home/user/.oh-my-zsh/completions/_openspec',
    }),
  })),
}));

describe('CompletionCommand', () => {
  let command: CompletionCommand;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    command = new CompletionCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = 0;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('generate subcommand', () => {
    it('should generate Zsh completion script to stdout', async () => {
      await command.generate({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
      expect(output).toContain('_openspec() {');
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.generate({});

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });

    it('should show error when shell cannot be auto-detected', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: undefined });

      await command.generate({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.generate({ shell: 'tcsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should handle shell parameter case-insensitively', async () => {
      await command.generate({ shell: 'ZSH' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });
  });

  describe('install subcommand', () => {
    it('should install Zsh completion script', async () => {
      await command.install({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script installed successfully')
      );
      expect(process.exitCode).toBe(0);
    });

    it('should show verbose output when --verbose flag is provided', async () => {
      await command.install({ shell: 'zsh', verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installed to:')
      );
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.install({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script installed successfully')
      );
    });

    it('should show error when shell cannot be auto-detected', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: undefined });

      await command.install({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.install({ shell: 'tcsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should display installation instructions', async () => {
      await command.install({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Restart your shell or run: exec zsh')
      );
    });
  });

  describe('uninstall subcommand', () => {
    it('should uninstall Zsh completion script', async () => {
      await command.uninstall({ shell: 'zsh', yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script removed')
      );
      expect(process.exitCode).toBe(0);
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.uninstall({ yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script removed')
      );
    });

    it('should show error when shell cannot be auto-detected', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: undefined });

      await command.uninstall({ yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.uninstall({ shell: 'tcsh', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle installation failures gracefully', async () => {
      const { ZshInstaller } = await import('../../src/core/completions/installers/zsh-installer.js');
      vi.mocked(ZshInstaller).mockImplementationOnce(() => ({
        install: vi.fn().mockResolvedValue({
          success: false,
          isOhMyZsh: false,
          message: 'Permission denied',
        }),
        uninstall: vi.fn(),
        isInstalled: vi.fn(),
        getInstallationInfo: vi.fn(),
        isOhMyZshInstalled: vi.fn(),
        getInstallationPath: vi.fn(),
        backupExistingFile: vi.fn(),
      } as any));

      const cmd = new CompletionCommand();
      await cmd.install({ shell: 'zsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
      expect(process.exitCode).toBe(1);
    });

    it('should handle uninstallation failures gracefully', async () => {
      const { ZshInstaller } = await import('../../src/core/completions/installers/zsh-installer.js');
      vi.mocked(ZshInstaller).mockImplementationOnce(() => ({
        install: vi.fn(),
        uninstall: vi.fn().mockResolvedValue({
          success: false,
          message: 'Completion script is not installed',
        }),
        isInstalled: vi.fn(),
        getInstallationInfo: vi.fn(),
        isOhMyZshInstalled: vi.fn(),
        getInstallationPath: vi.fn(),
        backupExistingFile: vi.fn(),
      } as any));

      const cmd = new CompletionCommand();
      await cmd.uninstall({ shell: 'zsh', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script is not installed')
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('dynamic completion data', () => {
    it('should output schema names for shell completion', async () => {
      await command.complete({ type: 'schemas' });

      expect(consoleLogSpy).toHaveBeenCalledWith('spec-driven\tschema');
      expect(process.exitCode).toBe(0);
    });

    it('applies schema Store visibility and replaces consumer-local schemas', async () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'openspec-completion-store-')
      );
      try {
        const schemaStoreRoot = path.join(tempDir, 'schema-store');
        for (const name of ['visible-flow', 'hidden-flow']) {
          const schemaDir = path.join(
            schemaStoreRoot,
            'openspec',
            'schemas',
            name
          );
          fs.mkdirSync(schemaDir, { recursive: true });
          fs.writeFileSync(
            path.join(schemaDir, 'schema.yaml'),
            `name: ${name}\n`
          );
        }
        const consumerSchemaDir = path.join(
          tempDir,
          'consumer',
          'openspec',
          'schemas',
          'consumer-only'
        );
        fs.mkdirSync(consumerSchemaDir, { recursive: true });
        fs.writeFileSync(
          path.join(consumerSchemaDir, 'schema.yaml'),
          'name: consumer-only\n'
        );

        const provider = new CompletionProvider(
          0,
          path.join(tempDir, 'consumer'),
          {
            root: schemaStoreRoot,
            source: 'store',
            storeId: 'department-schemas',
            visibleSchemas: ['visible-flow'],
          }
        );

        const schemas = await provider.getSchemaNames();
        expect(schemas).toContain('visible-flow');
        expect(schemas).not.toContain('hidden-flow');
        expect(schemas).not.toContain('consumer-only');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('does not reuse schema completion cache entries across resolution targets', async () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'openspec-completion-target-cache-')
      );
      try {
        const firstRoot = path.join(tempDir, 'first');
        const secondRoot = path.join(tempDir, 'second');
        for (const [root, name] of [
          [firstRoot, 'first-flow'],
          [secondRoot, 'second-flow'],
        ]) {
          const schemaDir = path.join(root, 'openspec', 'schemas', name);
          fs.mkdirSync(schemaDir, { recursive: true });
          fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), `name: ${name}\n`);
        }

        const provider = new CompletionProvider(60_000, tempDir);
        expect(await provider.getSchemaNames(firstRoot)).toContain('first-flow');

        const secondSchemas = await provider.getSchemaNames({
          root: secondRoot,
          source: 'store',
          storeId: 'second-store',
          visibleSchemas: '*',
        });
        expect(secondSchemas).toContain('second-flow');
        expect(secondSchemas).not.toContain('first-flow');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('fails silently instead of falling back for an invalid schemaStore authority', async () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'openspec-completion-invalid-')
      );
      try {
        fs.mkdirSync(path.join(tempDir, 'openspec', 'changes'), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(tempDir, 'openspec', 'config.yaml'),
          'schemaStore:\n  id: department-schemas\n  schemas: []\n'
        );

        await new CompletionCommand(tempDir).complete({ type: 'schemas' });

        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(1);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('lists ordinary schemas outside a project even when Stores are registered', async () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'openspec-completion-no-root-')
      );
      const previousXdgDataHome = process.env.XDG_DATA_HOME;
      try {
        process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
        const registryDir = path.join(
          process.env.XDG_DATA_HOME,
          'openspec',
          'stores'
        );
        fs.mkdirSync(registryDir, { recursive: true });
        fs.writeFileSync(
          path.join(registryDir, 'registry.yaml'),
          [
            'version: 1',
            'stores:',
            '  registered-store:',
            '    backend:',
            '      type: git',
            `      local_path: ${path.join(tempDir, 'registered-store')}`,
            '',
          ].join('\n')
        );

        await new CompletionCommand(path.join(tempDir, 'outside')).complete({
          type: 'schemas',
        });

        expect(consoleLogSpy).toHaveBeenCalledWith('spec-driven\tschema');
        expect(process.exitCode).toBe(0);
      } finally {
        if (previousXdgDataHome === undefined) {
          delete process.env.XDG_DATA_HOME;
        } else {
          process.env.XDG_DATA_HOME = previousXdgDataHome;
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('shell detection integration', () => {
    it('should show appropriate error when detected shell is unsupported', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: 'tcsh' });

      await command.generate({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'tcsh' is not supported yet. Currently supported: zsh, bash, fish, powershell"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should respect explicit shell parameter over auto-detection', async () => {
      vi.mocked(shellDetection.detectShell).mockReturnValue({ shell: undefined, detected: 'bash' });

      await command.generate({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });
  });
});
