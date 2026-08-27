import { describe, expect, it } from 'vitest';
import { findTaskNumberingIssues } from '../../src/core/validation/task-numbering.js';

const findInSingleFile = (content: string) =>
  findTaskNumberingIssues([{ path: 'tasks.md', content }]).map(({ path: _path, ...issue }) => issue);

describe('findTaskNumberingIssues', () => {
  it('matches duplicate ids at full depth', () => {
    const issues = findInSingleFile(
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
    const issues = findInSingleFile(
      ['## 4. Work', '- [ ] 4.2a inserted', '- [ ] 4.2b another', '- [ ] 4.7 gap'].join(
        '\r\n'
      )
    );

    expect(issues).toEqual([]);
  });

  it('resets group context at an unnumbered level-two heading', () => {
    const issues = findInSingleFile(
      [
        '## 1. Work',
        '- [ ] 1.1 task',
        '## Notes',
        '- [ ] 9.1 external note',
        '- [ ] 9.1 repeated external note',
      ].join('\n')
    );

    expect(issues).toEqual([]);
  });

  it('skips every check in files without numbered groups', () => {
    const issues = findInSingleFile(
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
    const issues = findInSingleFile('## 01. Work\n- [ ] 1.1 task\n');

    expect(issues).toEqual([]);
  });

  it('detects duplicate ids across task files', () => {
    const issues = findTaskNumberingIssues([
      {
        path: 'backend/tasks.md',
        content: '## 2. Backend\n- [ ] 2.1 shared task\n',
      },
      {
        path: 'frontend/tasks.md',
        content: '## 2. Frontend\n- [ ] 2.1 duplicate task\n',
      },
    ]);

    expect(issues).toEqual([
      {
        path: 'frontend/tasks.md',
        line: 2,
        message:
          'Task ID "2.1" is duplicated; it was first declared in backend/tasks.md on line 2.',
      },
    ]);
  });
});
