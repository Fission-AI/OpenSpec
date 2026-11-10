import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { detectShell, SupportedShell } from '../../src/utils/shell-detection.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);

// PSModulePath as Windows sets it machine-wide: every process inherits it,
// cmd.exe included, so on its own it says nothing about the running shell.
const PROGRAM_FILES_VARS = ['ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432'];

const MACHINE_PSMODULEPATH =
  'C:\\Program Files\\WindowsPowerShell\\Modules;C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules';

// What a running Windows PowerShell 5.1 hands its children: it prepends the
// per-user modules folder at startup.
const WINDOWS_POWERSHELL_SESSION_PSMODULEPATH =
  'C:\\Users\\dev\\Documents\\WindowsPowerShell\\Modules;' + MACHINE_PSMODULEPATH;

// What a running PowerShell 7 hands its children.
const POWERSHELL_7_SESSION_PSMODULEPATH =
  'C:\\Users\\dev\\Documents\\PowerShell\\Modules;C:\\Program Files\\PowerShell\\Modules;' +
  'c:\\program files\\powershell\\7\\Modules;' + MACHINE_PSMODULEPATH;

describe('shell-detection', () => {
  let originalShell: string | undefined;
  let originalPSModulePath: string | undefined;
  let originalComspec: string | undefined;
  let originalProgramFiles: Record<string, string | undefined>;
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    // Save original environment
    originalShell = process.env.SHELL;
    originalPSModulePath = process.env.PSModulePath;
    originalComspec = process.env.COMSPEC;
    originalProgramFiles = Object.fromEntries(
      PROGRAM_FILES_VARS.map((name) => [name, process.env[name]])
    );
    originalPlatform = process.platform;

    // Clear environment for clean testing
    delete process.env.SHELL;
    delete process.env.PSModulePath;
    delete process.env.COMSPEC;
    // Pin the Windows install folders so tests behave the same on every host.
    process.env.ProgramFiles = 'C:\\Program Files';
    process.env['ProgramFiles(x86)'] = 'C:\\Program Files (x86)';
    delete process.env.ProgramW6432;

    // Default: parent process is not a shell (e.g. the test runner), so
    // detection falls through to environment-based logic.
    mockedExecFileSync.mockReset();
    mockedExecFileSync.mockReturnValue('node\n');
  });

  afterEach(() => {
    // Restore original environment
    if (originalShell !== undefined) {
      process.env.SHELL = originalShell;
    } else {
      delete process.env.SHELL;
    }
    if (originalPSModulePath !== undefined) {
      process.env.PSModulePath = originalPSModulePath;
    } else {
      delete process.env.PSModulePath;
    }
    if (originalComspec !== undefined) {
      process.env.COMSPEC = originalComspec;
    } else {
      delete process.env.COMSPEC;
    }
    for (const [name, value] of Object.entries(originalProgramFiles)) {
      if (value !== undefined) {
        process.env[name] = value;
      } else {
        delete process.env[name];
      }
    }
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('detectShell', () => {
    it('should detect zsh from SHELL environment variable', () => {
      process.env.SHELL = '/bin/zsh';
      const result = detectShell();
      expect(result.shell).toBe('zsh');
      expect(result.detected).toBe('zsh');
    });

    it('should detect zsh from various zsh paths', () => {
      const zshPaths = [
        '/usr/bin/zsh',
        '/usr/local/bin/zsh',
        '/opt/homebrew/bin/zsh',
        '/home/user/.local/bin/zsh',
      ];

      for (const path of zshPaths) {
        process.env.SHELL = path;
        const result = detectShell();
        expect(result.shell).toBe('zsh');
        expect(result.detected).toBe('zsh');
      }
    });

    it('should detect bash from SHELL environment variable', () => {
      process.env.SHELL = '/bin/bash';
      const result = detectShell();
      expect(result.shell).toBe('bash');
      expect(result.detected).toBe('bash');
    });

    it('should detect bash from various bash paths', () => {
      const bashPaths = [
        '/usr/bin/bash',
        '/usr/local/bin/bash',
        '/opt/homebrew/bin/bash',
        '/home/user/.local/bin/bash',
      ];

      for (const path of bashPaths) {
        process.env.SHELL = path;
        const result = detectShell();
        expect(result.shell).toBe('bash');
        expect(result.detected).toBe('bash');
      }
    });

    it('should detect fish from SHELL environment variable', () => {
      process.env.SHELL = '/usr/bin/fish';
      const result = detectShell();
      expect(result.shell).toBe('fish');
      expect(result.detected).toBe('fish');
    });

    it('should detect fish from various fish paths', () => {
      const fishPaths = [
        '/bin/fish',
        '/usr/local/bin/fish',
        '/opt/homebrew/bin/fish',
        '/home/user/.local/bin/fish',
      ];

      for (const path of fishPaths) {
        process.env.SHELL = path;
        const result = detectShell();
        expect(result.shell).toBe('fish');
        expect(result.detected).toBe('fish');
      }
    });

    it('should be case-insensitive when detecting shell', () => {
      process.env.SHELL = '/BIN/ZSH';
      let result = detectShell();
      expect(result.shell).toBe('zsh');

      process.env.SHELL = '/USR/BIN/BASH';
      result = detectShell();
      expect(result.shell).toBe('bash');

      process.env.SHELL = '/USR/BIN/FISH';
      result = detectShell();
      expect(result.shell).toBe('fish');
    });

    it('should detect PowerShell from PSModulePath environment variable', () => {
      process.env.PSModulePath = 'C:\\Program Files\\PowerShell\\Modules';
      const result = detectShell();
      expect(result.shell).toBe('powershell');
      expect(result.detected).toBe('powershell');
    });

    it('should detect PowerShell on Windows platform with PSModulePath', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      process.env.PSModulePath = WINDOWS_POWERSHELL_SESSION_PSMODULEPATH;
      const result = detectShell();
      expect(result.shell).toBe('powershell');
      expect(result.detected).toBe('powershell');
    });

    it('should return detected name for unsupported shell', () => {
      process.env.SHELL = '/bin/tcsh';
      const result = detectShell();
      expect(result.shell).toBeUndefined();
      expect(result.detected).toBe('tcsh');
    });

    it('should return undefined when SHELL is not set and not on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      const result = detectShell();
      expect(result.shell).toBeUndefined();
      expect(result.detected).toBeUndefined();
    });

    it('should return detected name for cmd.exe on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe';
      const result = detectShell();
      expect(result.shell).toBeUndefined();
      expect(result.detected).toBe('cmd.exe');
    });

    it('should return undefined when no shell information is available', () => {
      const result = detectShell();
      expect(result.shell).toBeUndefined();
      expect(result.detected).toBeUndefined();
    });
  });

  describe('Windows: cmd.exe vs PowerShell (#2226)', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.COMSPEC = 'C:\\WINDOWS\\system32\\cmd.exe';
    });

    it('detects cmd.exe when PSModulePath is only the machine-wide default', () => {
      process.env.PSModulePath = MACHINE_PSMODULEPATH;
      const result = detectShell();
      expect(result.shell).toBeUndefined();
      expect(result.detected).toBe('cmd.exe');
    });

    it('detects cmd.exe when installers added Program Files module folders machine-wide', () => {
      process.env.PSModulePath =
        MACHINE_PSMODULEPATH +
        ';C:\\Program Files (x86)\\Microsoft SQL Server\\150\\Tools\\PowerShell\\Modules\\' +
        ';C:\\Program Files\\Contoso\\PowerShell\\Modules';
      const result = detectShell();
      expect(result.shell).toBeUndefined();
      expect(result.detected).toBe('cmd.exe');
    });

    it('detects Windows PowerShell 5.1 from the per-user modules folder it adds', () => {
      process.env.PSModulePath = WINDOWS_POWERSHELL_SESSION_PSMODULEPATH;
      expect(detectShell()).toEqual({ shell: 'powershell', detected: 'powershell' });
    });

    it('detects PowerShell 7 from the per-user modules folder it adds', () => {
      process.env.PSModulePath = POWERSHELL_7_SESSION_PSMODULEPATH;
      expect(detectShell()).toEqual({ shell: 'powershell', detected: 'powershell' });
    });

    it('detects PowerShell when Documents is redirected (OneDrive, another drive)', () => {
      process.env.PSModulePath =
        'C:\\Users\\dev\\OneDrive - Contoso\\Documents\\WindowsPowerShell\\Modules\;' + MACHINE_PSMODULEPATH;
      expect(detectShell().shell).toBe('powershell');

      process.env.PSModulePath = 'D:\\MyDocs\\PowerShell\\Modules;' + MACHINE_PSMODULEPATH;
      expect(detectShell().shell).toBe('powershell');
    });

    it('still reports nothing when neither signal is present', () => {
      delete process.env.COMSPEC;
      process.env.PSModulePath = MACHINE_PSMODULEPATH;
      expect(detectShell()).toEqual({ shell: undefined, detected: undefined });
    });
  });

  describe('parent process detection', () => {
    // Parent-process detection is POSIX-only, so pin the platform to make
    // these tests exercise the `ps` path even when CI runs on Windows.
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
    });

    it('should detect fish from the parent process even when SHELL is bash', () => {
      // Reproduces #1197: fish user whose login shell ($SHELL) is bash.
      process.env.SHELL = '/bin/bash';
      mockedExecFileSync.mockReturnValue('fish\n');
      const result = detectShell();
      expect(result.shell).toBe('fish');
      expect(result.detected).toBe('fish');
    });

    it('should handle full-path comm output from macOS ps', () => {
      process.env.SHELL = '/bin/bash';
      mockedExecFileSync.mockReturnValue('/opt/homebrew/bin/fish\n');
      const result = detectShell();
      expect(result.shell).toBe('fish');
    });

    it('should detect a login shell reported with a leading dash', () => {
      process.env.SHELL = '/bin/bash';
      mockedExecFileSync.mockReturnValue('-zsh\n');
      const result = detectShell();
      expect(result.shell).toBe('zsh');
    });

    it('should fall back to SHELL when the parent process is not a shell', () => {
      process.env.SHELL = '/usr/bin/fish';
      mockedExecFileSync.mockReturnValue('node\n');
      const result = detectShell();
      expect(result.shell).toBe('fish');
    });

    it('should not mistake shell-named tools like fish-lsp for the shell', () => {
      process.env.SHELL = '/bin/zsh';
      mockedExecFileSync.mockReturnValue('fish-lsp\n');
      const result = detectShell();
      expect(result.shell).toBe('zsh');
    });

    it('should fall back to SHELL when reading the parent process fails', () => {
      process.env.SHELL = '/bin/zsh';
      mockedExecFileSync.mockImplementation(() => {
        throw new Error('ps unavailable');
      });
      const result = detectShell();
      expect(result.shell).toBe('zsh');
    });

    it('should not shell out to ps on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.PSModulePath = WINDOWS_POWERSHELL_SESSION_PSMODULEPATH;
      const result = detectShell();
      expect(result.shell).toBe('powershell');
      expect(mockedExecFileSync).not.toHaveBeenCalled();
    });
  });

  describe('SupportedShell type', () => {
    it('should accept valid shell types', () => {
      const shells: SupportedShell[] = ['zsh', 'bash', 'fish', 'powershell'];
      expect(shells).toHaveLength(4);
    });
  });
});
