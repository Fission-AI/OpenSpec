import { describe, expect, it } from 'vitest';

import {
  onlyWithWorkflow,
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

  // A dropped table row must take its line with it. A blank line left behind
  // ends the table in markdown, so the rows after it stop rendering as a table.
  it('removes the whole line when a line-level conditional resolves to empty', () => {
    const table = [
      '| Command | What it does |',
      '|---------|--------------|',
      onlyWithWorkflow('propose', '| `/opsx:propose` | Start a change |'),
      onlyWithWorkflow('ff', '| `/opsx:ff` | Fast-forward |'),
      onlyWithWorkflow('apply', '| `/opsx:apply` | Implement tasks |'),
      '',
      'Done.',
    ].join('\n');

    expect(resolveOptionalWorkflows(table, installed('propose', 'apply'))).toBe(
      [
        '| Command | What it does |',
        '|---------|--------------|',
        '| `/opsx:propose` | Start a change |',
        '| `/opsx:apply` | Implement tasks |',
        '',
        'Done.',
      ].join('\n')
    );
  });

  it('keeps the indentation of a line-level conditional it keeps', () => {
    const text = `intro\n  ${onlyWithWorkflow('apply', '- run `/opsx:apply`')}\nouttro`;

    expect(resolveOptionalWorkflows(text, installed('apply'))).toBe(
      'intro\n  - run `/opsx:apply`\nouttro'
    );
    expect(resolveOptionalWorkflows(text, installed())).toBe('intro\nouttro');
  });

  // Only a conditional that owns its whole line takes the line with it; one
  // that sits inside a sentence must not swallow the text around it.
  it('leaves the surrounding line intact for an inline conditional', () => {
    const text = `Next: ${onlyWithWorkflow('apply', 'run `/opsx:apply`')}.`;

    expect(resolveOptionalWorkflows(text, installed())).toBe('Next: .');
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
