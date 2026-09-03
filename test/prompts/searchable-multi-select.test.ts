import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for searchable-multi-select keybinding behavior.
 *
 * We mock @inquirer/core to intercept the prompt's render function and
 * keypress handler, then simulate key events to verify:
 *   - Space toggles selection (add/remove)
 *   - Enter confirms and submits
 *   - Tab does NOT confirm (removed)
 *   - Hint text is updated
 */

// State store for the mock hook system
const state: Record<number, unknown> = {};
let stateIndex = 0;
let keypressHandler: ((key: Record<string, unknown>) => void) | null = null;
let renderOutput = '';

function resetState() {
  for (const k of Object.keys(state)) delete state[k as unknown as number];
  stateIndex = 0;
  keypressHandler = null;
  renderOutput = '';
  currentRenderFn = null;
  currentConfig = null;
  currentDone = null;
}

// Re-render: reset hook index, re-invoke the render function
let currentRenderFn: ((config: Record<string, unknown>, done: (v: string[]) => void) => string) | null = null;
let currentConfig: Record<string, unknown> | null = null;
let currentDone: ((v: string[]) => void) | null = null;

function rerender() {
  if (!currentRenderFn || !currentConfig || !currentDone) return;
  stateIndex = 0;
  renderOutput = currentRenderFn(currentConfig, currentDone);
}

vi.mock('@inquirer/core', () => {
  return {
    createPrompt: (fn: (config: Record<string, unknown>, done: (v: string[]) => void) => string) => {
      currentRenderFn = fn;
      return (config: Record<string, unknown>) => {
        return new Promise<string[]>((resolve) => {
          currentConfig = config;
          currentDone = resolve;
          stateIndex = 0;
          renderOutput = fn(config, resolve);
        });
      };
    },
    useState: (initial: unknown) => {
      const idx = stateIndex++;
      if (!(idx in state)) {
        state[idx] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      }
      const setter = (value: unknown) => {
        state[idx] = value;
        // Re-render after state change
        rerender();
      };
      return [state[idx], setter];
    },
    useKeypress: (handler: (key: Record<string, unknown>) => void) => {
      keypressHandler = handler;
    },
    useMemo: (fn: () => unknown, _deps: unknown[]) => fn(),
    usePrefix: () => '?',
    isEnterKey: (key: Record<string, unknown>) => key.name === 'return' || key.name === 'enter',
    isBackspaceKey: (key: Record<string, unknown>) => key.name === 'backspace',
    isUpKey: (key: Record<string, unknown>) => key.name === 'up',
    isDownKey: (key: Record<string, unknown>) => key.name === 'down',
  };
});

function pressKey(name: string) {
  if (!keypressHandler) throw new Error('No keypress handler registered');
  keypressHandler({ name, ctrl: false });
}

/**
 * Types one printable character. Node's readline leaves `name` undefined for
 * punctuation such as `.` or `-` and only reports it in `sequence`, so the
 * two arrive at the handler differently.
 */
function typeChar(sequence: string, name?: string) {
  if (!keypressHandler) throw new Error('No keypress handler registered');
  keypressHandler({ name, sequence, ctrl: false });
}

function typeSearch(text: string) {
  for (const char of text) {
    typeChar(char, /^[a-z0-9]$/.test(char) ? char : undefined);
  }
}

function getSearchText(): string {
  return (state[0] as string) ?? '';
}

function visibleNames(): string[] {
  return renderOutput
    .split('\n')
    .filter((line) => line.includes('[ ]') || line.includes('[x]'))
    .map((line) => line.replace(/.*\[[ x]\]\s*/, '').trim());
}

function getSelectedValues(): string[] {
  return (state[1] as string[]) ?? [];
}

function getStatus(): string {
  return (state[3] as string) ?? 'idle';
}

function getError(): string | null {
  return (state[4] as string | null) ?? null;
}

const testChoices = [
  { name: 'Tool A', value: 'tool-a' },
  { name: 'Tool B', value: 'tool-b' },
  { name: 'Tool C', value: 'tool-c' },
];

const searchChoices = [
  { name: 'Claude Code', value: 'claude' },
  { name: 'Amazon Q Developer', value: 'amazon-q' },
  {
    name: 'Other / Universal',
    value: 'agents',
    searchAliases: ['unlisted', 'generic', '.agents'],
  },
];

async function setup(
  choices = testChoices,
  validate?: (selected: string[]) => boolean | string,
  emptyHint?: string
) {
  resetState();

  const mod = await import('../../src/prompts/searchable-multi-select.js');

  // Fire and forget - the promise resolves only when done() is called via Enter
  // We just need the side effect of registering the keypress handler
  mod.searchableMultiSelect({
    message: 'Select tools',
    choices,
    validate,
    emptyHint,
  });

  // The async chain in searchableMultiSelect involves:
  //   1. await createSearchableMultiSelect() -> await import('@inquirer/core')
  //   2. prompt(config) which registers the keypress handler synchronously
  // Flush enough microtask ticks for the full chain to settle.
  await vi.waitFor(() => {
    if (!keypressHandler) throw new Error('Keypress handler not yet registered');
  }, { timeout: 500 });
}

describe('searchable-multi-select keybindings', () => {
  beforeEach(() => {
    resetState();
    vi.resetModules();
  });

  describe('Space to toggle', () => {
    it('should select highlighted item when Space is pressed', async () => {
      await setup();
      pressKey('space');
      expect(getSelectedValues()).toContain('tool-a');
    });

    it('should deselect highlighted item when Space is pressed on already-selected item', async () => {
      await setup();
      pressKey('space');
      expect(getSelectedValues()).toContain('tool-a');

      pressKey('space');
      expect(getSelectedValues()).not.toContain('tool-a');
    });

    it('should toggle multiple items independently', async () => {
      await setup();

      // Select Tool A
      pressKey('space');
      expect(getSelectedValues()).toEqual(['tool-a']);

      // Move down to Tool B, select it
      pressKey('down');
      pressKey('space');
      expect(getSelectedValues()).toContain('tool-a');
      expect(getSelectedValues()).toContain('tool-b');

      // Move back up to Tool A, deselect it
      pressKey('up');
      pressKey('space');
      expect(getSelectedValues()).not.toContain('tool-a');
      expect(getSelectedValues()).toContain('tool-b');
    });
  });

  describe('Enter to confirm', () => {
    it('should set status to done when Enter is pressed', async () => {
      await setup();
      pressKey('space');
      pressKey('return');
      expect(getStatus()).toBe('done');
    });

    it('should confirm with empty selection', async () => {
      await setup();
      pressKey('return');
      expect(getStatus()).toBe('done');
    });

    it('should show validation error when validation fails', async () => {
      const validate = (selected: string[]) =>
        selected.length > 0 ? true : 'Select at least one';
      await setup(testChoices, validate);

      pressKey('return');
      expect(getStatus()).toBe('idle');
      expect(getError()).toBe('Select at least one');
    });

    it('should confirm when validation passes', async () => {
      const validate = (selected: string[]) =>
        selected.length > 0 ? true : 'Select at least one';
      await setup(testChoices, validate);

      pressKey('space');
      pressKey('return');
      expect(getStatus()).toBe('done');
    });
  });

  describe('Tab does not confirm', () => {
    it('should not change status when Tab is pressed', async () => {
      await setup();
      pressKey('space');
      pressKey('tab');
      expect(getStatus()).toBe('idle');
    });
  });

  describe('checkbox markers', () => {
    it('should render unselected items with [ ] and no radio symbols', async () => {
      await setup();
      expect(renderOutput).toContain('[ ]');
      expect(renderOutput).not.toContain('◉');
      expect(renderOutput).not.toContain('○');
    });

    it('should render selected items with [x]', async () => {
      await setup();
      pressKey('space');
      expect(renderOutput).toContain('[x]');
    });

    it('should revert to [ ] when the item is deselected', async () => {
      await setup();
      pressKey('space');
      expect(renderOutput).toContain('[x]');
      pressKey('space');
      expect(renderOutput).not.toContain('[x]');
      expect(renderOutput).toContain('[ ]');
      expect(renderOutput).not.toContain('◉');
      expect(renderOutput).not.toContain('○');
    });
  });

  describe('search filtering', () => {
    it('should match a choice by an alias its name does not spell', async () => {
      await setup(searchChoices);
      typeSearch('unlisted');
      expect(getSearchText()).toBe('unlisted');
      expect(visibleNames()).toEqual(['Other / Universal']);
    });

    it('should match a second alias for the same choice', async () => {
      await setup(searchChoices);
      typeSearch('generic');
      expect(visibleNames()).toEqual(['Other / Universal']);
    });

    it('should still match on name and value', async () => {
      await setup(searchChoices);
      typeSearch('claude');
      expect(visibleNames()).toEqual(['Claude Code']);
    });

    it('should still show no matches for a term nothing carries', async () => {
      await setup(searchChoices);
      typeSearch('nonesuch');
      expect(visibleNames()).toEqual([]);
      expect(renderOutput).toContain('No matches');
    });

    it('should point at the fallback choice when a search matches nothing', async () => {
      await setup(searchChoices, undefined, 'Tool not listed? Pick "Other / Universal".');
      typeSearch('nonesuch');
      expect(renderOutput).toContain('Tool not listed?');
    });

    it('should not show the fallback hint while matches remain', async () => {
      await setup(searchChoices, undefined, 'Tool not listed? Pick "Other / Universal".');
      typeSearch('claude');
      expect(renderOutput).not.toContain('Tool not listed?');
    });
  });

  describe('search input', () => {
    it('should accept punctuation, which readline reports only in sequence', async () => {
      await setup(searchChoices);
      typeSearch('amazon-q');
      expect(getSearchText()).toBe('amazon-q');
      expect(visibleNames()).toEqual(['Amazon Q Developer']);
    });

    it('should accept a leading dot so directory-shaped terms filter', async () => {
      await setup(searchChoices);
      typeSearch('.agents');
      expect(getSearchText()).toBe('.agents');
      expect(visibleNames()).toEqual(['Other / Universal']);
    });

    it('should ignore control chords rather than typing them', async () => {
      await setup(searchChoices);
      if (!keypressHandler) throw new Error('No keypress handler registered');
      keypressHandler({ name: 'c', sequence: '\u0003', ctrl: true });
      expect(getSearchText()).toBe('');
    });
  });

  describe('hint text', () => {
    it('should include Space toggle and Enter confirm in rendered output', async () => {
      await setup();
      expect(renderOutput).toContain('Space');
      expect(renderOutput).toContain('toggle');
      expect(renderOutput).toContain('Enter');
      expect(renderOutput).toContain('confirm');
      expect(renderOutput).not.toMatch(/Tab.*confirm/);
    });
  });
});
