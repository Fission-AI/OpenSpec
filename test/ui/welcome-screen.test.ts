import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../src/core/profiles.js';

const { useKeypressMock } = vi.hoisted(() => ({
  useKeypressMock: vi.fn(),
}));

vi.mock('@inquirer/core', () => ({
  createPrompt: vi.fn((view) => async (config: Record<string, never>) => {
    let keypressHandler: ((key: { name: string; ctrl: boolean }) => void) | undefined;
    useKeypressMock.mockImplementation((handler) => {
      keypressHandler = handler;
    });

    return new Promise<void>((resolve) => {
      view(config, resolve);
      keypressHandler?.({ name: 'return', ctrl: false });
    });
  }),
  isEnterKey: vi.fn((key) => key.name === 'return'),
  useKeypress: useKeypressMock,
}));

describe('welcome screen', () => {
  const originalNoColor = process.env.NO_COLOR;
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;
  const originalColumns = process.stdout.columns;
  let writeSpy: ReturnType<typeof vi.spyOn<typeof process.stdout, 'write'>>;

  const writtenOutput = () =>
    writeSpy.mock.calls.map((call) => String(call[0])).join('');

  // The animated path paints on a timer, so assert against the static fallback.
  const renderStatically = () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
  };

  beforeEach(() => {
    delete process.env.NO_COLOR;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'columns', { value: 100, configurable: true });
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    useKeypressMock.mockClear();
  });

  afterEach(() => {
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY, configurable: true });
    Object.defineProperty(process.stdout, 'columns', { value: originalColumns, configurable: true });
    vi.restoreAllMocks();
  });

  it('uses an Inquirer prompt to wait for Enter', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');

    await showWelcomeScreen(CORE_WORKFLOWS);

    expect(useKeypressMock).toHaveBeenCalledOnce();
  });

  it('only advertises commands the profile installs', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    await showWelcomeScreen(CORE_WORKFLOWS);

    const output = writtenOutput();

    expect(output).toContain('/opsx:propose');
    expect(output).toContain('/opsx:apply');
    expect(output).not.toContain('/opsx:new');
    expect(output).not.toContain('/opsx:continue');
  });

  it('advertises expanded commands when a custom profile installs them', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    await showWelcomeScreen(['new', 'continue', 'apply']);

    const output = writtenOutput();

    expect(output).toContain('/opsx:new');
    expect(output).toContain('/opsx:continue');
    expect(output).not.toContain('/opsx:propose');
  });

  it('omits the quick start block when no onboarding workflow is installed', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    await showWelcomeScreen(['archive']);

    const output = writtenOutput();

    expect(output).toContain('Welcome to OpenSpec');
    expect(output).not.toContain('Quick start after setup:');
  });

  it('keeps every rendered line inside the animation width budget', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    // The animated path moves the cursor up a fixed count of logical lines, so a
    // line that wraps at the narrowest animating terminal (MIN_WIDTH = 60) makes
    // each frame redraw lower than the last. Worst case is every command shown.
    await showWelcomeScreen(ALL_WORKFLOWS);

    const rendered = writtenOutput().replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

    for (const line of rendered.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(59);
    }
  });
});
