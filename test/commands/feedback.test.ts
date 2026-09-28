import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackCommand } from '../../src/commands/feedback.js';
import { execFileSync } from 'child_process';

// Every subprocess the command runs — the gh lookup, the auth probe, and the
// issue creation — goes through execFileSync; there is no shell anywhere.
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('FeedbackCommand', () => {
  let feedbackCommand: FeedbackCommand;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const mockExecFileSync = execFileSync as unknown as ReturnType<typeof vi.fn>;
  // The availability probes are answered by setGhProbes; everything else is the
  // `gh issue create` call, so assertions below can index its calls directly.
  const ghIssueSync = vi.fn();

  function setGhProbes({ installed = true, authenticated = true } = {}): void {
    mockExecFileSync.mockImplementation((file: string, args: string[], options?: any) => {
      if (file === 'which' || file === 'where') {
        if (!installed) throw new Error('Command not found');
        return Buffer.from('/usr/local/bin/gh');
      }
      if (file === 'gh' && args[0] === 'auth') {
        if (!authenticated) throw new Error('Not authenticated');
        return Buffer.from('Logged in');
      }
      return ghIssueSync(file, args, options);
    });
  }

  beforeEach(() => {
    feedbackCommand = new FeedbackCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });
    vi.clearAllMocks();
    ghIssueSync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('gh CLI availability check', () => {
    it('should use which command on Unix/macOS platforms', async () => {
      // Mock platform as darwin
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/123\n');

      await feedbackCommand.execute('Test');

      // Verify 'which gh' was called
      expect(mockExecFileSync).toHaveBeenCalledWith('which', ['gh'], expect.any(Object));

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should use where command on Windows platform', async () => {
      // Mock platform as win32
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/123\n');

      await feedbackCommand.execute('Test');

      // Verify 'where gh' was called
      expect(mockExecFileSync).toHaveBeenCalledWith('where', ['gh'], expect.any(Object));

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('probes gh without a shell', async () => {
      setGhProbes();
      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/123\n');

      await feedbackCommand.execute('Test');

      // Free-form issue text sits right next to these probes, so none of them
      // may spawn a shell: every call passes argv as an array.
      for (const [, args] of mockExecFileSync.mock.calls) {
        expect(Array.isArray(args)).toBe(true);
      }
      expect(mockExecFileSync).toHaveBeenCalledWith('gh', ['auth', 'status'], expect.any(Object));
    });

    it('should handle missing gh CLI with fallback', async () => {
      // Simulate gh not installed
      setGhProbes({ installed: false });

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
      setGhProbes({ authenticated: false });

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
      setGhProbes();

      ghIssueSync.mockReturnValue(`${issueUrl}\n`);

      await feedbackCommand.execute('Great tool!');

      // Should call gh with correct arguments using execFileSync
      expect(ghIssueSync).toHaveBeenCalledWith(
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

      // Only one attempt, and no note about a dropped label
      expect(ghIssueSync).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("without the 'feedback' label")
      );
    });

    it('should preserve message and body whitespace in the issue body', async () => {
      const issueUrl = 'https://github.com/Fission-AI/OpenSpec/issues/124';

      setGhProbes();

      ghIssueSync.mockReturnValue(`${issueUrl}\n`);

      const message = '  Title here  ';
      const details = '    const x = 1;  ';
      await feedbackCommand.execute(message, { body: details });

      const args = ghIssueSync.mock.calls[0][1] as string[];
      const body = args[args.indexOf('--body') + 1];
      expect(body).toContain(
        `## Summary\n\n${message}\n\n## Details\n\n${details}\n\n---`
      );
    });

    it('should preserve the full message in the body and shorten a long title', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/125\n');

      const message =
        'Generated workflows declare too few allowed tools,\nso headless runs cannot write files and silently fail.';
      await feedbackCommand.execute(message);

      const args = ghIssueSync.mock.calls[0][1] as string[];
      const title = args[args.indexOf('--title') + 1];
      const body = args[args.indexOf('--body') + 1];

      expect(title).toBe(
        'Feedback: Generated workflows declare too few allowed tools, so…'
      );
      expect(title.length).toBeLessThanOrEqual(72);
      expect(title).not.toMatch(/[\r\n]/);
      expect(body).toContain(`## Summary\n\n${message}`);
    });

    it('should not split Unicode grapheme clusters when shortening a title', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/125\n');

      const family = '👨‍👩‍👧‍👦';
      const message = family.repeat(20);
      await feedbackCommand.execute(message);

      const args = ghIssueSync.mock.calls[0][1] as string[];
      const title = args[args.indexOf('--title') + 1];
      const summary = title.slice('Feedback: '.length, -1);

      expect(Array.from(title).length).toBeLessThanOrEqual(72);
      expect(title.endsWith('…')).toBe(true);
      expect(summary).toMatch(/^(?:👨‍👩‍👧‍👦)+$/u);
    });

    it('should enforce the title limit at the exact boundary', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/125\n');

      await feedbackCommand.execute('x'.repeat(62));
      await feedbackCommand.execute('x'.repeat(63));

      const exactArgs = ghIssueSync.mock.calls[0][1] as string[];
      const shortenedArgs = ghIssueSync.mock.calls[1][1] as string[];
      const exactTitle = exactArgs[exactArgs.indexOf('--title') + 1];
      const shortenedTitle = shortenedArgs[shortenedArgs.indexOf('--title') + 1];

      expect(exactTitle).toBe(`Feedback: ${'x'.repeat(62)}`);
      expect(Array.from(exactTitle)).toHaveLength(72);
      expect(shortenedTitle).toBe(`Feedback: ${'x'.repeat(61)}…`);
      expect(Array.from(shortenedTitle)).toHaveLength(72);
    });

    it('should format title with "Feedback:" prefix', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/125\n');

      await feedbackCommand.execute('Test message');

      // Verify title has "Feedback:" prefix
      expect(ghIssueSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--title',
          'Feedback: Test message',
        ]),
        expect.any(Object)
      );
    });

    it('should include metadata in issue body', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/126\n');

      await feedbackCommand.execute('Test', { body: 'Body text' });

      // Verify metadata is included in body
      expect(ghIssueSync).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          '--body',
          expect.stringMatching(/Submitted via OpenSpec CLI[\s\S]*Version:[\s\S]*Platform:[\s\S]*Timestamp:/),
        ]),
        expect.any(Object)
      );
    });

    it('should add feedback label to the issue', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/127\n');

      await feedbackCommand.execute('Test');

      // Verify feedback label is added
      expect(ghIssueSync).toHaveBeenCalledWith(
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
      setGhProbes();

      // Mock execFileSync to throw error
      ghIssueSync.mockImplementation(() => {
        const error: any = new Error('Network error');
        error.status = 1;
        error.stderr = Buffer.from('Error: Network connectivity issue');
        throw error;
      });

      await expect(feedbackCommand.execute('Test')).rejects.toThrow(
        'process.exit(1)'
      );

      // Should display the error from gh CLI
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network connectivity issue')
      );

      // A non-label failure must NOT be retried
      expect(ghIssueSync).toHaveBeenCalledTimes(1);

      // ...and must not discard the typed feedback: the manual-submission
      // fallback (formatted text + pre-filled URL) is shown like the
      // missing-gh and unauthenticated flows.
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please submit your feedback manually:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('github.com/Fission-AI/OpenSpec/issues/new')
      );
    });

    it('should not retry when the feedback text mentions the label error', async () => {
      setGhProbes();

      // gh fails for an unrelated reason. Node puts the whole command line —
      // including the user's own words — into error.message, so only stderr
      // may decide whether this was a label failure.
      ghIssueSync.mockImplementation((_cmd: string, args: string[]) => {
        const error: any = new Error(
          `Command failed: gh ${args.join(' ')}\nerror connecting to api.github.com`
        );
        error.status = 1;
        error.stderr = Buffer.from('error connecting to api.github.com');
        throw error;
      });

      await expect(
        feedbackCommand.execute('gh could not add label bug report')
      ).rejects.toThrow('process.exit(1)');

      expect(ghIssueSync).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("without the 'feedback' label")
      );
    });

    it('should retry without the label when the repo does not define it', async () => {
      const issueUrl = 'https://github.com/Fission-AI/OpenSpec/issues/129';

      setGhProbes();

      // gh resolves label names before creating the issue, so a repo without
      // the label fails with no issue created
      ghIssueSync.mockImplementation((_cmd: string, args: string[]) => {
        if (args.includes('--label')) {
          const error: any = new Error('gh failed');
          error.status = 1;
          error.stderr = Buffer.from(
            'could not add label: labels not found: feedback'
          );
          throw error;
        }
        return `${issueUrl}\n`;
      });

      await feedbackCommand.execute('Test');

      expect(ghIssueSync).toHaveBeenCalledTimes(2);

      // First attempt asks for the label
      expect(ghIssueSync).toHaveBeenNthCalledWith(
        1,
        'gh',
        expect.arrayContaining(['--label', 'feedback']),
        expect.any(Object)
      );

      // Retry drops it
      expect(ghIssueSync).toHaveBeenNthCalledWith(
        2,
        'gh',
        expect.not.arrayContaining(['--label']),
        expect.any(Object)
      );

      // The feedback still lands as an issue, and the user is told the label
      // was not applied
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Feedback submitted successfully')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(issueUrl)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("without the 'feedback' label")
      );
    });

    it('should preserve gh exit code when the unlabeled retry also fails', async () => {
      setGhProbes();

      ghIssueSync.mockImplementation((_cmd: string, args: string[]) => {
        const error: any = new Error('gh failed');

        if (args.includes('--label')) {
          error.status = 1;
          error.stderr = Buffer.from(
            'could not add label: labels not found: feedback'
          );
        } else {
          error.status = 4;
          error.stderr = Buffer.from('Error: issues are disabled');
        }

        throw error;
      });

      await expect(feedbackCommand.execute('Test')).rejects.toThrow(
        'process.exit(4)'
      );

      expect(ghIssueSync).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('issues are disabled')
      );
    });

    it('should handle quotes in title and body without escaping (no shell injection)', async () => {
      setGhProbes();

      ghIssueSync.mockReturnValue('https://github.com/Fission-AI/OpenSpec/issues/128\n');

      await feedbackCommand.execute('Test with "quotes"', {
        body: 'Body with "quotes"',
      });

      // Verify quotes are passed as-is (no escaping needed with execFileSync)
      expect(ghIssueSync).toHaveBeenCalledWith(
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
      setGhProbes({ installed: false });

      const message =
        'Generated workflows declare too few allowed tools,\nso headless runs cannot write files and silently fail.';

      try {
        await feedbackCommand.execute(message, { body: 'Test body' });
      } catch (error: any) {
        // Expected to exit
      }

      // Verify formatted output structure
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--- FORMATTED FEEDBACK ---')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Title: Feedback: Generated workflows declare too few allowed tools, so…'
        )
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Labels: feedback')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('--- END FEEDBACK ---')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`## Summary\n\n${message}`)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('## Details\n\nTest body')
      );
    });

    it('should generate correct manual submission URL', async () => {
      setGhProbes({ installed: false });

      try {
        await feedbackCommand.execute('Test');
      } catch (error: any) {
        // Expected to exit
      }

      // Verify URL is shown. Match on the parsed origin and path rather than a
      // substring, so a lookalike host in the output cannot satisfy the check.
      const urlCall = consoleLogSpy.mock.calls.find((call: any[]) => {
        const found = /https?:\/\/\S+/.exec(String(call[0] ?? ''));
        if (!found) {
          return false;
        }
        try {
          const parsed = new URL(found[0]);
          return (
            parsed.origin === 'https://github.com' &&
            parsed.pathname === '/Fission-AI/OpenSpec/issues/new'
          );
        } catch {
          return false;
        }
      });
      expect(urlCall).toBeDefined();

      // Verify URL has proper parameters
      const url = urlCall?.[0];
      expect(url).toContain('title=');
      expect(url).toContain('body=');
      expect(url).toContain('labels=feedback');
    });
  });
});
