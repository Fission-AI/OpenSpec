import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests that GateCommand sets correct process.exitCode based on
 * blocking vs warning gate severity.
 *
 * - blocking gate FAIL -> process.exitCode = 1
 * - warning gate FAIL (all blocking pass) -> process.exitCode = 0
 */

// Mock all external dependencies so we can control gate results
const mockLoadChangeContext = vi.fn().mockReturnValue({ schemaName: 'test-schema' });
const mockResolveSchema = vi.fn();
const mockValidateChangeExists = vi.fn().mockResolvedValue('test-change');
const mockGetChangesDir = vi.fn().mockReturnValue('/tmp/fake-changes');
const mockCheckGate = vi.fn();

vi.mock('../../src/core/artifact-graph/index.js', () => ({
  loadChangeContext: mockLoadChangeContext,
  resolveSchema: mockResolveSchema,
}));

vi.mock('../../src/commands/workflow/shared.js', () => ({
  validateChangeExists: mockValidateChangeExists,
}));

vi.mock('../../src/utils/change-utils.js', () => ({
  getChangesDir: mockGetChangesDir,
}));

vi.mock('../../src/core/validation/gate-checker.js', () => ({
  GateChecker: vi.fn().mockImplementation(() => ({
    checkGate: mockCheckGate,
  })),
}));

describe('GateCommand exit code behavior', () => {
  let originalExitCode: number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockCheckGate.mockReset();
    mockResolveSchema.mockReset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    consoleLogSpy.mockRestore();
  });

  it('should set exit code 1 when blocking gate fails', async () => {
    const { GateCommand } = await import('../../src/commands/gate.js');

    mockResolveSchema.mockReturnValue({
      apply: {
        gates: {
          post: [
            { id: 'task-done', check: 'all-tasks-done', severity: 'blocking' },
          ],
        },
      },
    });

    mockCheckGate.mockResolvedValue({
      id: 'task-done',
      description: 'All tasks must be done',
      passed: false,
      details: { remaining: ['task-1'] },
    });

    const cmd = new GateCommand();
    await cmd.execute({ change: 'test-change', phase: 'post', json: true });

    expect(process.exitCode).toBe(1);
  });

  it('should set exit code 0 when warning gate fails but all blocking gates pass', async () => {
    const { GateCommand } = await import('../../src/commands/gate.js');

    mockResolveSchema.mockReturnValue({
      apply: {
        gates: {
          post: [
            { id: 'ai-check', check: 'ai-review', severity: 'warning', prompt: 'Review code' },
          ],
        },
      },
    });

    mockCheckGate.mockResolvedValue({
      id: 'ai-check',
      description: 'AI review',
      passed: false,
      details: {},
      ai_review_needed: true,
    });

    const cmd = new GateCommand();
    await cmd.execute({ change: 'test-change', phase: 'post', json: true });

    // Warning-only failure should NOT set exit code to 1
    expect(process.exitCode).toBe(0);
  });
});
