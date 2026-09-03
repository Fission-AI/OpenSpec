import { parseTaskLines } from '../../utils/task-progress.js';

export interface TaskCheckboxDocument {
  path: string;
  content: string;
}

export interface TaskCheckboxIssue {
  path: string;
  line: number;
  message: string;
}

/**
 * A list item that carries text but no checkbox: `- item`, `* item`, `+ item`,
 * `1. item`, `1) item`. Checkbox lines match this too, so callers must rule the
 * document set out on checkbox count first.
 *
 * A thematic break (`---`, `***`, `- - -`) is not a list item: the run has no
 * text after it, and this pattern requires a non-space character. `* * *` is
 * the one break spelled like a list of `*` items, and it is accepted as a list
 * item rather than special-cased, because a file whose only list-shaped line is
 * a horizontal rule still has zero tasks — the warning stays true, it just
 * points at an odd line.
 */
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\S/;

/**
 * A fenced block delimiter: a run of three or more backticks or tildes, plus
 * whatever follows it on the line (an info string on an opener, nothing on a
 * valid closer).
 *
 * Indented by at most three spaces, as CommonMark requires: at four, the line is
 * an indented code block rather than a fence, and treating it as an opener would
 * leave the scan inside a block that never began and hide every list below it.
 *
 * Deliberately unanchored at the end: `.` does not match `\r`, so `(.*)$` would
 * fail on every line of a CRLF file and blind the scan to fences entirely.
 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)/;

/**
 * The YAML front-matter delimiter: exactly three dashes. A longer run is a
 * thematic break, so `----` must not open a block that swallows the list under
 * it until the next `---`.
 */
const FRONT_MATTER = /^-{3}\s*$/;

const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';

/**
 * Reports tracked task files that list work as plain bullets or numbered items
 * instead of checkboxes (#354).
 *
 * Progress counts checkboxes and nothing else, so a tasks file written as a
 * bare list is worse than an empty one: `openspec list` prints "No tasks",
 * `openspec status` treats the change as having no work left, and
 * `openspec archive` has no incomplete task to warn about. The file looks
 * finished to the tool and unfinished to the reader.
 *
 * Reported only when the change's *whole* tracked set has zero checkboxes.
 * One nested tasks file of prose beside a real checklist is not the failure
 * this catches, and a change that is mid-authoring keeps its progress the
 * moment a single checkbox exists.
 *
 * The scan for the offending line looks at rendered content only: fenced
 * blocks, HTML comments and YAML front matter are skipped. Every one of those
 * exclusions can only *silence* a warning, never drop a real task — that is the
 * opposite trade from the task parser, where fence awareness would hide work
 * that `archive` must still refuse, and it is why the parser stays literal
 * while this scan does not.
 */
export function findMissingTaskCheckboxIssues(
  documents: readonly TaskCheckboxDocument[]
): TaskCheckboxIssue[] {
  if (documents.length === 0) return [];
  if (documents.some((document) => parseTaskLines(document.content).length > 0)) return [];

  const issues: TaskCheckboxIssue[] = [];
  for (const document of documents) {
    const line = findFirstListItemLine(document.content);
    if (line === undefined) continue;
    issues.push({
      path: document.path,
      line,
      message:
        'This change counts as 0 tasks: no line in its tracked task files is a checkbox, ' +
        'so "openspec list" and "openspec status" report no work and "openspec archive" ' +
        'has nothing to flag as incomplete. Write each task as "- [ ] 1.1 Description".',
    });
  }

  return issues;
}

/** 1-based line of the first list item in rendered content, if any. */
function findFirstListItemLine(content: string): number | undefined {
  const lines = content.split('\n');
  let openFence: { marker: string; length: number } | undefined;
  let inComment = false;
  let index = skipFrontMatter(lines);

  for (; index < lines.length; index++) {
    const line = lines[index];

    if (inComment) {
      if (line.includes(COMMENT_CLOSE)) inComment = false;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const marker = fence[1][0];
      const length = fence[1].length;
      if (openFence === undefined) {
        openFence = { marker, length };
      } else if (
        marker === openFence.marker &&
        length >= openFence.length &&
        fence[2].trim() === ''
      ) {
        // CommonMark: a closer matches its opener's character, runs at least as
        // long, and carries no info string. A shorter or annotated run inside a
        // block is content, so a ```` ``` ```` sample nested in a ```` ```` ````
        // block does not end the block early and expose its bullets.
        openFence = undefined;
      }
      continue;
    }
    if (openFence !== undefined) continue;

    // Only a comment that opens the line hides it. `- [ ] 1.1 do it <!-- note`
    // is a task line first, and the template's own `## 1. <!-- Task Group -->`
    // must not swallow the checklist that follows it.
    if (line.trimStart().startsWith(COMMENT_OPEN)) {
      if (!line.includes(COMMENT_CLOSE, line.indexOf(COMMENT_OPEN) + COMMENT_OPEN.length)) {
        inComment = true;
      }
      continue;
    }

    if (LIST_ITEM.test(line)) return index + 1;
  }

  return undefined;
}

/**
 * Index of the first line after a YAML front-matter block, or 0 when the
 * document does not open with one. A list under `tags:` is metadata about the
 * file, never the work it tracks, and pointing a "write checkboxes" warning at
 * it would name the wrong line.
 */
function skipFrontMatter(lines: readonly string[]): number {
  if (lines.length === 0 || !FRONT_MATTER.test(lines[0].trimEnd())) return 0;

  for (let index = 1; index < lines.length; index++) {
    if (FRONT_MATTER.test(lines[index].trimEnd())) return index + 1;
  }

  // An unterminated opener is a thematic break, not front matter: rewinding to
  // the top keeps every list in the document visible to the scan.
  return 0;
}
