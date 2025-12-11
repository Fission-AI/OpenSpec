import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectShell, SupportedShell } from '../../src/utils/shell-detection.js';

describe('shell-detection', () => {
  let originalShell: string | undefined;
  let originalPSModulePath: string | undefined;
  let originalComspec: string | undefined;
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    // Save original environment
    originalShell = process.env.SHELL;
    originalPSModulePath = process.env.PSModulePath;
    originalComspec = process.env.COMSPEC;
    originalPlatform = process.platform;

    // Clear environment for clean testing
    delete process.env.SHELL;
    delete process.env.PSModulePath;
    delete process.env.COMSPEC;
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
      process.env.PSModulePath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules';
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

  describe('SupportedShell type', () => {
    it('should accept valid shell types', () => {
      const shells: SupportedShell[] = ['zsh', 'bash', 'fish', 'powershell'];
      expect(shells).toHaveLength(4);
    });
  });
});
