import { describe, expect, it } from 'vitest';
import { findTaskNumberingIssues } from '../../src/core/validation/task-numbering.js';

describe('findTaskNumberingIssues', () => {
  it('matches duplicate ids at full depth', () => {
    const issues = findTaskNumberingIssues(
      [
        '## 3. Work',
        '- [ ] 3.2.1 first child',
        '- [ ] 3.2.2 second child',
        '- [ ] 3.2.1 duplicate child',
        '',
      ].join('\n')
    );

    expect(issues).toEqual([
      {
        line: 4,
        message: 'Task ID "3.2.1" is duplicated; it was first declared on line 2.',
      },
    ]);
  });

  it('accepts alphabetic suffixes and numbering gaps', () => {
    const issues = findTaskNumberingIssues(
      ['## 4. Work', '- [ ] 4.2a inserted', '- [ ] 4.2b another', '- [ ] 4.7 gap'].join(
        '\r\n'
      )
    );

    expect(issues).toEqual([]);
  });

  it('resets group context at an unnumbered level-two heading', () => {
    const issues = findTaskNumberingIssues(
      ['## 1. Work', '- [ ] 1.1 task', '## Notes', '- [ ] 9.1 external note'].join('\n')
    );

    expect(issues).toEqual([]);
  });

  it('skips every check in files without numbered groups', () => {
    const issues = findTaskNumberingIssues(
      [
        '# Tasks',
        '- [ ] plain task',
        '- [ ] 7.1 numbered but ungrouped',
        '- [ ] 7.1 duplicate but still ungrouped',
      ].join('\n')
    );

    expect(issues).toEqual([]);
  });

  it('compares group prefixes as integers', () => {
    const issues = findTaskNumberingIssues('## 01. Work\n- [ ] 1.1 task\n');

    expect(issues).toEqual([]);
  });
});
