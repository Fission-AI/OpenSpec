import { describe, expect, it } from 'vitest';
import {
  getDisplayCommandReferenceStyle,
  getToolCommandReferenceStyle,
  transformCommandContentsForTool,
} from '../../src/core/command-invocation-style.js';
import type { CommandContent } from '../../src/core/command-generation/types.js';

describe('command-invocation-style', () => {
  it('should resolve command reference style from tool metadata', () => {
    expect(getToolCommandReferenceStyle('claude')).toBe('opsx-colon');
    expect(getToolCommandReferenceStyle('codex')).toBe('opsx-hyphen');
    expect(getToolCommandReferenceStyle('trae')).toBe('openspec-hyphen');
  });

  it('should transform command bodies for hyphen-style tools', () => {
    const contents: CommandContent[] = [{
      id: 'new',
      name: 'OpenSpec New',
      description: 'Start a new change',
      category: 'Workflow',
      tags: [],
      body: 'Run /opsx:new then /opsx:apply',
    }];

    const transformed = transformCommandContentsForTool(contents, 'codex');
    expect(transformed[0].body).toContain('/opsx-new');
    expect(transformed[0].body).toContain('/opsx-apply');
  });

  it('should transform command bodies for openspec-style tools', () => {
    const contents: CommandContent[] = [{
      id: 'new',
      name: 'OpenSpec New',
      description: 'Start a new change',
      category: 'Workflow',
      tags: [],
      body: 'Run /opsx:new then /opsx:continue',
    }];

    const transformed = transformCommandContentsForTool(contents, 'trae');
    expect(transformed[0].body).toContain('/openspec-new-change');
    expect(transformed[0].body).toContain('/openspec-continue-change');
  });

  it('should keep display style only when all tools agree', () => {
    expect(getDisplayCommandReferenceStyle(['codex', 'cursor'])).toBe('opsx-hyphen');
    expect(getDisplayCommandReferenceStyle(['claude', 'cursor'])).toBe('opsx-colon');
  });
});
