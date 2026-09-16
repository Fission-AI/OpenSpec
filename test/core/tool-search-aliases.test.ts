import { describe, it, expect } from 'vitest';
import {
  AI_TOOLS,
  getUniversalTool,
  universalToolFallbackHint,
} from '../../src/core/config.js';

/**
 * The `openspec init` tool picker filters on a tool's name and id. A user whose
 * assistant is not on the list searches for the category, not the directory
 * OpenSpec writes to, and used to find nothing (#653). Search aliases close
 * that gap, so the vendor-neutral entry has to keep carrying them.
 */
describe('tool search aliases', () => {
  const universal = AI_TOOLS.find((tool) => tool.value === 'agents');

  it('answers the words someone with an unlisted tool searches for', () => {
    expect(universal).toBeDefined();
    const aliases = universal?.searchAliases ?? [];
    for (const term of ['universal', 'other', 'generic', 'unlisted']) {
      expect(aliases).toContain(term);
    }
  });

  it('names the entry so it reads as the escape hatch in the picker', () => {
    expect(universal?.name).toMatch(/Other \/ Universal/);
  });

  it('keeps every alias to a single word', () => {
    // Space toggles the highlighted choice instead of typing into the search
    // box, so a multi-word alias can never be entered.
    for (const tool of AI_TOOLS) {
      for (const alias of tool.searchAliases ?? []) {
        expect(alias).not.toMatch(/\s/);
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });

  it('keeps the universal target resolvable by id', () => {
    expect(getUniversalTool()?.value).toBe('agents');
  });
});

describe('universal tool fallback hint', () => {
  it('names the flag that reaches the universal target', () => {
    const hint = universalToolFallbackHint(['claude', 'agents']);

    expect(hint).toContain('--tools agents');
    expect(hint).toContain('.agents/skills/');
  });

  it('stays silent when the universal target is not on offer', () => {
    // Never point at a choice the caller cannot make.
    expect(universalToolFallbackHint(['claude', 'cursor'])).toBeUndefined();
    expect(universalToolFallbackHint([])).toBeUndefined();
  });
});
