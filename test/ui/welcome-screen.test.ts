import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../src/core/profiles.js';

const { useKeypressMock, execFileSyncMock } = vi.hoisted(() => ({
  useKeypressMock: vi.fn(),
  execFileSyncMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFileSync: execFileSyncMock,
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
  const originalNoAnimation = process.env.OPENSPEC_NO_ANIMATION;
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
    delete process.env.OPENSPEC_NO_ANIMATION;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'columns', { value: 100, configurable: true });
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    useKeypressMock.mockClear();
    // Deterministic default: no OS-level reduced-motion preference detectable,
    // so animated-path tests behave the same on every machine.
    execFileSyncMock.mockReset();
    execFileSyncMock.mockImplementation(() => {
      throw new Error('not available in tests');
    });
  });

  afterEach(() => {
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
    if (originalNoAnimation === undefined) {
      delete process.env.OPENSPEC_NO_ANIMATION;
    } else {
      process.env.OPENSPEC_NO_ANIMATION = originalNoAnimation;
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

  it('does not promise opsx commands in the setup summary', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    // This screen runs before tool selection, and skills-only tools (Codex,
    // Kimi Code, ...) correctly receive no command files, so the summary must
    // not state that opsx slash commands are part of every setup.
    await showWelcomeScreen(['archive']);

    const output = writtenOutput();

    expect(output).toContain('Agent Skills for AI tools');
    expect(output).toContain('Workflow commands, if supported');
    expect(output).not.toContain('opsx slash commands');
  });

  it('flags that the quick-start spelling varies by tool', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    // The quick start shows canonical names, but this screen renders one
    // prompt before tools are picked — an Amazon Q user types @opsx-propose
    // and a Codex user $openspec-propose, neither of which is shown here.
    await showWelcomeScreen(['propose']);

    const output = writtenOutput();

    expect(output).toContain('/opsx:propose');
    expect(output).toContain('spelling varies by tool');
  });

  it('omits the spelling caveat when there is no quick start block', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    renderStatically();

    await showWelcomeScreen(['archive']);

    expect(writtenOutput()).not.toContain('spelling varies by tool');
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

  it('renders statically when OPENSPEC_NO_ANIMATION is set', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    process.env.OPENSPEC_NO_ANIMATION = '1';

    await showWelcomeScreen(CORE_WORKFLOWS);

    // Static rendering still waits for the Enter the prompt line asks for;
    // otherwise the keystroke falls through into the tool picker (#1462).
    expect(useKeypressMock).toHaveBeenCalledOnce();
    const output = writtenOutput();
    expect(output).toContain('Welcome to OpenSpec');
    expect(output).toContain('Press Enter');
    // No cursor-up repaints: the frame is drawn exactly once.
    expect(output).not.toMatch(/\x1b\[\d+A/);
  });

  it('honors OPENSPEC_NO_ANIMATION even when set to an empty value', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
    process.env.OPENSPEC_NO_ANIMATION = '';

    await showWelcomeScreen(CORE_WORKFLOWS);

    expect(useKeypressMock).toHaveBeenCalledOnce();
    expect(writtenOutput()).not.toMatch(/\x1b\[\d+A/);
  });

  it('renders statically when animate is disabled via options', async () => {
    const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');

    await showWelcomeScreen(CORE_WORKFLOWS, { animate: false });

    expect(useKeypressMock).toHaveBeenCalledOnce();
    const output = writtenOutput();
    expect(output).toContain('Welcome to OpenSpec');
    expect(output).not.toMatch(/\x1b\[\d+A/);
  });

  it.runIf(process.platform === 'darwin' || process.platform === 'linux')(
    'renders statically when the OS prefers reduced motion',
    async () => {
      const { showWelcomeScreen } = await import('../../src/ui/welcome-screen.js');
      execFileSyncMock.mockImplementation((file: string) =>
        file === 'defaults' ? '1\n' : 'false\n'
      );

      await showWelcomeScreen(CORE_WORKFLOWS);

      expect(useKeypressMock).toHaveBeenCalledOnce();
      expect(writtenOutput()).toContain('Welcome to OpenSpec');
    }
  );
});

describe('prefersReducedMotion', () => {
  beforeEach(() => {
    execFileSyncMock.mockReset();
  });

  it('detects macOS Reduce Motion', async () => {
    const { prefersReducedMotion } = await import('../../src/ui/welcome-screen.js');
    execFileSyncMock.mockReturnValue('1\n');

    expect(prefersReducedMotion('darwin')).toBe(true);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'defaults',
      ['read', 'com.apple.universalaccess', 'reduceMotion'],
      expect.objectContaining({ timeout: 500 })
    );
  });

  it('treats a disabled or unset macOS preference as no preference', async () => {
    const { prefersReducedMotion } = await import('../../src/ui/welcome-screen.js');

    execFileSyncMock.mockReturnValue('0\n');
    expect(prefersReducedMotion('darwin')).toBe(false);

    // `defaults read` exits non-zero while the key has never been toggled.
    execFileSyncMock.mockImplementation(() => {
      throw new Error('The domain/default pair does not exist');
    });
    expect(prefersReducedMotion('darwin')).toBe(false);
  });

  it('detects GNOME reduced motion via disabled animations', async () => {
    const { prefersReducedMotion } = await import('../../src/ui/welcome-screen.js');

    execFileSyncMock.mockReturnValue('false\n');
    expect(prefersReducedMotion('linux')).toBe(true);

    execFileSyncMock.mockReturnValue('true\n');
    expect(prefersReducedMotion('linux')).toBe(false);
  });

  it('returns false without spawning anything on other platforms', async () => {
    const { prefersReducedMotion } = await import('../../src/ui/welcome-screen.js');

    expect(prefersReducedMotion('win32')).toBe(false);
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });
});
