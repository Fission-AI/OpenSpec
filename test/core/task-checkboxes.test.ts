import { describe, expect, it } from 'vitest';
import { findMissingTaskCheckboxIssues } from '../../src/core/validation/task-checkboxes.js';

const findInSingleFile = (content: string) =>
  findMissingTaskCheckboxIssues([{ path: 'tasks.md', content }]).map(
    ({ path: _path, ...issue }) => issue
  );

describe('findMissingTaskCheckboxIssues', () => {
  it('reports a task list written as plain bullets', () => {
    const issues = findInSingleFile(
      ['# Tasks', '', '## 1. Implementation', '', '- Add the parser', '- Add the tests', ''].join(
        '\n'
      )
    );

    expect(issues).toEqual([
      {
        line: 5,
        message: expect.stringContaining('counts as 0 tasks'),
      },
    ]);
  });

  it('reports a task list written as a numbered list', () => {
    expect(findInSingleFile('# Tasks\n\n1. Add the parser\n2. Add the tests\n')).toEqual([
      { line: 3, message: expect.any(String) },
    ]);
    expect(findInSingleFile('1) Add the parser\n')).toEqual([
      { line: 1, message: expect.any(String) },
    ]);
  });

  it('stays silent when checkboxes are present', () => {
    expect(findInSingleFile('- [ ] 1.1 Add the parser\n- Supporting note\n')).toEqual([]);
    expect(findInSingleFile('- [x] 1.1 Add the parser\n')).toEqual([]);
    expect(findInSingleFile('  - [ ] 1.1.1 A nested task\n')).toEqual([]);
  });

  it('stays silent on prose and on an empty file', () => {
    expect(findInSingleFile('# Tasks\n\nNothing planned yet.\n')).toEqual([]);
    expect(findInSingleFile('')).toEqual([]);
    expect(findMissingTaskCheckboxIssues([])).toEqual([]);
  });

  it('ignores list items inside fenced blocks', () => {
    expect(
      findInSingleFile(['# Tasks', '', '```md', '- an example bullet', '```', ''].join('\n'))
    ).toEqual([]);
    expect(
      findInSingleFile(
        ['~~~', '- fenced with tildes', '~~~', '', '- a real bullet', ''].join('\n')
      )
    ).toEqual([{ line: 5, message: expect.any(String) }]);
  });

  it('closes a fence only on a matching, long enough, bare delimiter', () => {
    // A three-marker sample nested inside a four-marker block: the inner run is
    // content, so the bullets after it are still fenced.
    expect(
      findInSingleFile(
        ['````md', '```', '- an example bullet', '```', '````', ''].join('\n')
      )
    ).toEqual([]);
    // An annotated run is an opener's shape, never a closer's.
    expect(
      findInSingleFile(['```', '```js', '- an example bullet', '```', ''].join('\n'))
    ).toEqual([]);
    // Tildes do not close a backtick fence.
    expect(findInSingleFile(['```', '~~~', '- an example bullet', ''].join('\n'))).toEqual([]);
    // A longer closing run still closes.
    expect(
      findInSingleFile(['```', 'sample', '`````', '', '- a real bullet', ''].join('\n'))
    ).toEqual([{ line: 5, message: expect.any(String) }]);
  });

  it('tracks fences in CRLF files', () => {
    expect(
      findInSingleFile(['```md', '- an example bullet', '```', '', '- a real bullet', ''].join('\r\n'))
    ).toEqual([{ line: 5, message: expect.any(String) }]);
  });

  it('does not treat a horizontal rule or emphasis as a list item', () => {
    expect(findInSingleFile('# Tasks\n\n---\n\n***\n')).toEqual([]);
  });

  it('reports every file only when the whole change has no checkbox', () => {
    const withoutCheckboxes = [
      { path: 'backend/tasks.md', content: '- build the api\n' },
      { path: 'frontend/tasks.md', content: '- build the ui\n' },
    ];
    expect(findMissingTaskCheckboxIssues(withoutCheckboxes).map((issue) => issue.path)).toEqual([
      'backend/tasks.md',
      'frontend/tasks.md',
    ]);

    const oneRealChecklist = [
      { path: 'backend/tasks.md', content: '- [ ] 1.1 build the api\n' },
      { path: 'frontend/tasks.md', content: '- build the ui\n' },
    ];
    expect(findMissingTaskCheckboxIssues(oneRealChecklist)).toEqual([]);
  });

  it('handles CRLF files', () => {
    expect(findInSingleFile('# Tasks\r\n\r\n- Add the parser\r\n')).toEqual([
      { line: 3, message: expect.any(String) },
    ]);
    expect(findInSingleFile('- [ ] 1.1 Add the parser\r\n')).toEqual([]);
  });
});
