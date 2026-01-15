import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackCommand } from '../../src/commands/feedback.js';
import { execSync, execFileSync } from 'child_process';

// Mock child_process functions
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

describe('FeedbackCommand', () => {
  let feedbackCommand: FeedbackCommand;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const mockExecSync = execSync as unknown as ReturnType<typeof vi.fn>;
  const mockExecFileSync = execFileSync as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    feedbackCommand = new FeedbackCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('gh CLI availability check', () => {
    it('should use which command on Unix/macOS platforms', async () => {
      // Mock platform as darwin
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/123\n');

      await feedbackCommand.execute('Test');

      // Verify 'which gh' was called
      expect(mockExecSync).toHaveBeenCalledWith('which gh', expect.any(Object));

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should use where command on Windows platform', async () => {
      // Mock platform as win32
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'where gh') {
          return Buffer.from('C:\\Program Files\\GitHub CLI\\gh.exe');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/123\n');

      await feedbackCommand.execute('Test');

      // Verify 'where gh' was called
      expect(mockExecSync).toHaveBeenCalledWith('where gh', expect.any(Object));

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle missing gh CLI with fallback', async () => {
      // Simulate gh not installed
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          throw new Error('Command not found');
        }
      });

      try {
        await feedbackCommand.execute('Test feedback');
      } catch (error: any) {
        // Should exit with code 0 (successful fallback)
        expect(error.message).toBe('process.exit(0)');
      }

      // Should display warning
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub CLI not found')
      );

      // Should show formatted feedback
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--- FORMATTED FEEDBACK ---')
      );

      // Should show manual submission URL
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/Fission-AI/OpenSpec/issues/new')
      );
    });

    it('should handle unauthenticated gh CLI with fallback', async () => {
      // Simulate gh installed but not authenticated
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          throw new Error('Not authenticated');
        }
      });

      try {
        await feedbackCommand.execute('Test feedback');
      } catch (error: any) {
        // Should exit with code 0 (successful fallback)
        expect(error.message).toBe('process.exit(0)');
      }

      // Should display warning
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub authentication required')
      );

      // Should show auth instructions
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('To auto-submit in the future: gh auth login')
      );

      // Should show formatted feedback
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--- FORMATTED FEEDBACK ---')
      );
    });
  });

  describe('successful feedback submission', () => {
    it('should submit feedback via gh CLI when authenticated', async () => {
      const issueUrl = 'https://github.com/Fission-AI/OpenSpec/issues/123';

      // Simulate gh installed and authenticated
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue(`${issueUrl}\n`);

      await feedbackCommand.execute('Great tool!');

      // Should call gh with correct arguments using execFileSync
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'gh',
        [
          'issue',
          'create',
          '--repo',
          'Fission-AI/OpenSpec',
          '--title',
          'Feedback: Great tool!',
          '--body',
          expect.stringContaining('Submitted via OpenSpec CLI'),
          '--label',
          'feedback',
        ],
        expect.objectContaining({
          encoding: 'utf-8',
          stdio: 'pipe',
        })
      );

      // Should display success message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Feedback submitted successfully')
      );

      // Should display issue URL
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(issueUrl)
      );
    });

    it('should include --body flag when body is provided', async () => {
      const issueUrl = 'https://github.com/Fission-AI/OpenSpec/issues/124';

      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue(`${issueUrl}\n`);

      await feedbackCommand.execute('Title here', { body: 'Detailed description' });

      // Verify body is included in the arguments
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--body',
          expect.stringContaining('Detailed description'),
        ]),
        expect.any(Object)
      );
    });

    it('should format title with "Feedback:" prefix', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/125\n');

      await feedbackCommand.execute('Test message');

      // Verify title has "Feedback:" prefix
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--title',
          'Feedback: Test message',
        ]),
        expect.any(Object)
      );
    });

    it('should include metadata in issue body', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/126\n');

      await feedbackCommand.execute('Test', { body: 'Body text' });

      // Verify metadata is included in body
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--body',
          expect.stringMatching(/Submitted via OpenSpec CLI[\s\S]*Version:[\s\S]*Platform:[\s\S]*Timestamp:/),
        ]),
        expect.any(Object)
      );
    });

    it('should add feedback label to the issue', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/127\n');

      await feedbackCommand.execute('Test');

      // Verify feedback label is added
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--label',
          'feedback',
        ]),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle gh CLI execution failure', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      // Mock execFileSync to throw error
      mockExecFileSync.mockImplementation(() => {
        const error: any = new Error('Network error');
        error.status = 1;
        error.stderr = Buffer.from('Error: Network connectivity issue');
        throw error;
      });

      try {
        await feedbackCommand.execute('Test');
      } catch (error: any) {
        // Should exit with the same code as gh CLI
        expect(error.message).toBe('process.exit(1)');
      }

      // Should display the error from gh CLI
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network connectivity issue')
      );
    });

    it('should handle quotes in title and body without escaping (no shell injection)', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        return '';
      });

      mockExecFileSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/128\n');

      await feedbackCommand.execute('Test with "quotes"', {
        body: 'Body with "quotes"',
      });

      // Verify quotes are passed as-is (no escaping needed with execFileSync)
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--title',
          'Feedback: Test with "quotes"',
          '--body',
          expect.stringContaining('Body with "quotes"'),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('formatted feedback output', () => {
    it('should display formatted feedback with proper structure', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          throw new Error('Command not found');
        }
      });

      try {
        await feedbackCommand.execute('Test message', { body: 'Test body' });
      } catch (error: any) {
        // Expected to exit
      }

      // Verify formatted output structure
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--- FORMATTED FEEDBACK ---')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Title: Feedback: Test message')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Labels: feedback')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--- END FEEDBACK ---')
      );
    });

    it('should generate correct manual submission URL', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh' || cmd === 'where gh') {
          throw new Error('Command not found');
        }
      });

      try {
        await feedbackCommand.execute('Test');
      } catch (error: any) {
        // Expected to exit
      }

      // Verify URL is shown
      const urlCall = consoleLogSpy.mock.calls.find((call: any[]) =>
        call[0]?.includes('https://github.com/Fission-AI/OpenSpec/issues/new')
      );
      expect(urlCall).toBeDefined();

      // Verify URL has proper parameters
      const url = urlCall?.[0];
      expect(url).toContain('title=');
      expect(url).toContain('body=');
      expect(url).toContain('labels=feedback');
    });
  });
});
