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
 */
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\S/;

/**
 * A fenced block delimiter: a run of three or more backticks or tildes, plus
 * whatever follows it on the line (an info string on an opener, nothing on a
 * valid closer).
 *
 * Deliberately unanchored at the end: `.` does not match `\r`, so `(.*)$` would
 * fail on every line of a CRLF file and blind the scan to fences entirely.
 */
const FENCE = /^\s*(`{3,}|~{3,})(.*)/;

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
 * Fenced blocks are skipped when looking for the offending list item. Unlike
 * the task parser — where fence awareness would silently drop real tasks — the
 * only thing a mis-read fence costs here is the warning itself, and a tasks
 * file whose sole list lives inside a code sample is a documented example, not
 * a checklist someone forgot to tick.
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
        'Tasks are listed without checkboxes, so this change counts as 0 tasks: ' +
        '"openspec list" and "openspec status" report no work, and "openspec archive" ' +
        'has nothing to flag as incomplete. Rewrite each task as "- [ ] 1.1 Description".',
    });
  }

  return issues;
}

/** 1-based line of the first list item outside a fenced block, if any. */
function findFirstListItemLine(content: string): number | undefined {
  let openFence: { marker: string; length: number } | undefined;

  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
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
    if (LIST_ITEM.test(line)) return index + 1;
  }

  return undefined;
}
