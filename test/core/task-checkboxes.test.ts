import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';
import { findMissingTaskCheckboxIssues } from '../../src/core/validation/task-checkboxes.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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

  it('skips YAML front matter', () => {
    expect(
      findInSingleFile(
        ['---', 'tags:', '  - planning', '  - backend', '---', '', 'Nothing planned yet.', ''].join(
          '\n'
        )
      )
    ).toEqual([]);
    expect(
      findInSingleFile(
        ['---', 'tags:', '  - planning', '---', '', '- a real bullet', ''].join('\n')
      )
    ).toEqual([{ line: 6, message: expect.any(String) }]);
  });

  it('treats an unterminated front-matter opener as a thematic break', () => {
    expect(findInSingleFile(['---', '', '- a real bullet', ''].join('\n'))).toEqual([
      { line: 3, message: expect.any(String) },
    ]);
  });

  it('skips HTML comments without hiding the line that follows them', () => {
    expect(
      findInSingleFile(['<!--', '- a retired task', '-->', '', 'Nothing planned yet.', ''].join('\n'))
    ).toEqual([]);
    expect(
      findInSingleFile(['<!-- a note -->', '- a real bullet', ''].join('\n'))
    ).toEqual([{ line: 2, message: expect.any(String) }]);
    expect(
      findInSingleFile(['<!--', '- a retired task', '-->', '- a real bullet', ''].join('\n'))
    ).toEqual([{ line: 4, message: expect.any(String) }]);
  });

  it('accepts every packaged tasks template', async () => {
    // An agent writing a task file follows these. If one ever loses its
    // checkboxes, every change built from it starts life counting zero tasks.
    const templates = await fg('schemas/*/templates/tasks.md', {
      cwd: repoRoot,
      absolute: true,
    });
    expect(templates.length).toBeGreaterThan(0);

    for (const template of templates) {
      const content = await fs.readFile(template, 'utf-8');
      expect({
        template: path.relative(repoRoot, template),
        issues: findMissingTaskCheckboxIssues([{ path: 'tasks.md', content }]),
      }).toEqual({ template: path.relative(repoRoot, template), issues: [] });
    }
  });

  it('does not let the template heading comment swallow its checklist', () => {
    // The scaffolded tasks.md: a heading carrying an inline comment, then real
    // checkboxes. It must stay silent, and would not if an inline comment on a
    // heading opened a block.
    expect(
      findInSingleFile(
        [
          '## 1. <!-- Task Group Name -->',
          '',
          '- [ ] 1.1 <!-- Task description -->',
          '- [ ] 1.2 <!-- Task description -->',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });

  it('reports a list of unrecognised checkbox markers, which count as no task', () => {
    // `- [~] ...` is not a checkbox the parser recognises today, so the change
    // really does count zero tasks and the warning is the only signal.
    expect(findInSingleFile('- [~] 1.1 in progress\n')).toEqual([
      { line: 1, message: expect.any(String) },
    ]);
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
