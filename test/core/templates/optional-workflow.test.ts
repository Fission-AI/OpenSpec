import { describe, expect, it } from 'vitest';

import {
  optionalWorkflow,
  resolveOptionalWorkflows,
} from '../../../src/core/templates/optional-workflow.js';

const installed = (...ids: string[]) => new Set<string>(ids);

describe('optionalWorkflow / resolveOptionalWorkflows', () => {
  it('keeps the installed branch and drops the other', () => {
    const text = `Next: ${optionalWorkflow('continue', 'run `/opsx:continue`', 'run `openspec status`')}.`;

    expect(resolveOptionalWorkflows(text, installed('continue'))).toBe(
      'Next: run `/opsx:continue`.'
    );
  });

  it('keeps the fallback branch when the workflow is not installed', () => {
    const text = `Next: ${optionalWorkflow('continue', 'run `/opsx:continue`', 'run `openspec status`')}.`;

    expect(resolveOptionalWorkflows(text, installed('apply'))).toBe(
      'Next: run `openspec status`.'
    );
  });

  it('resolves every block independently, including multiline branches', () => {
    const text = [
      optionalWorkflow('continue', 'A-yes', 'A-no'),
      optionalWorkflow('new', 'B-yes\nsecond line', 'B-no'),
      optionalWorkflow('continue', 'C-yes', 'C-no'),
    ].join('\n');

    expect(resolveOptionalWorkflows(text, installed('new'))).toBe(
      'A-no\nB-yes\nsecond line\nC-no'
    );
  });

  it('leaves text without conditionals untouched', () => {
    const text = 'Plain body naming `/opsx:apply` only.';

    expect(resolveOptionalWorkflows(text, installed())).toBe(text);
  });

  // A branch that is dropped must leave nothing behind: a surviving marker
  // would ship as literal noise in a generated SKILL.md.
  it('throws on a malformed block rather than emitting a marker', () => {
    const truncated = '[[opsx:if-workflow continue]]yes';

    expect(() => resolveOptionalWorkflows(truncated, installed('continue'))).toThrow(
      /Malformed optional-workflow conditional/
    );
  });
});
