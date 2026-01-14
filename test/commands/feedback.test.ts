import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackCommand } from '../../src/commands/feedback.js';
import { execSync } from 'child_process';

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('FeedbackCommand', () => {
  let feedbackCommand: FeedbackCommand;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const mockExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

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
    it('should handle missing gh CLI with fallback', async () => {
      // Simulate gh not installed
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh') {
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
        if (cmd === 'which gh') {
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
        expect.stringContaining('To auto-submit in future: gh auth login')
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
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          return `${issueUrl}\n`;
        }
        return '';
      });

      await feedbackCommand.execute('Great tool!');

      // Should call gh issue create
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('gh issue create'),
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
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          // Verify body is included in the command
          expect(cmd).toContain('Detailed description');
          return `${issueUrl}\n`;
        }
        return '';
      });

      await feedbackCommand.execute('Title here', { body: 'Detailed description' });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--body'),
        expect.any(Object)
      );
    });

    it('should format title with "Feedback:" prefix', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          // Verify title has "Feedback:" prefix
          expect(cmd).toContain('Feedback: Test message');
          return 'https://github.com/Fission-AI/OpenSpec/issues/125\n';
        }
        return '';
      });

      await feedbackCommand.execute('Test message');
    });

    it('should include metadata in issue body', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          // Verify metadata is included
          expect(cmd).toContain('Submitted via OpenSpec CLI');
          expect(cmd).toContain('Version:');
          expect(cmd).toContain('Platform:');
          expect(cmd).toContain('Timestamp:');
          return 'https://github.com/Fission-AI/OpenSpec/issues/126\n';
        }
        return '';
      });

      await feedbackCommand.execute('Test', { body: 'Body text' });
    });

    it('should add feedback label to the issue', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          // Verify feedback label is added
          expect(cmd).toContain('--label feedback');
          return 'https://github.com/Fission-AI/OpenSpec/issues/127\n';
        }
        return '';
      });

      await feedbackCommand.execute('Test');
    });
  });

  describe('error handling', () => {
    it('should handle gh CLI execution failure', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          const error: any = new Error('Network error');
          error.status = 1;
          error.stderr = Buffer.from('Error: Network connectivity issue');
          throw error;
        }
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

    it('should escape quotes in title and body', async () => {
      mockExecSync.mockImplementation((cmd: string, options?: any) => {
        if (cmd === 'which gh') {
          return Buffer.from('/usr/local/bin/gh');
        }
        if (cmd === 'gh auth status') {
          return Buffer.from('Logged in');
        }
        if (cmd.includes('gh issue create')) {
          // Verify quotes are escaped
          expect(cmd).toContain('\\"');
          return 'https://github.com/Fission-AI/OpenSpec/issues/128\n';
        }
        return '';
      });

      await feedbackCommand.execute('Test with "quotes"', {
        body: 'Body with "quotes"',
      });
    });
  });

  describe('formatted feedback output', () => {
    it('should display formatted feedback with proper structure', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which gh') {
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
        if (cmd === 'which gh') {
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
