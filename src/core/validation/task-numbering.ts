import { parseTaskLines } from '../../utils/task-progress.js';

export interface TaskNumberingIssue {
  line: number;
  message: string;
}

const LEVEL_TWO_HEADING = /^ {0,3}##(?!#)(?:[ \t]+|[ \t]*\r?$)/;
const NUMBERED_GROUP_HEADING = /^ {0,3}##[ \t]+(\d+)\.(?:[ \t]|\r?$)/;
const TASK_ID = /^(\d+(?:\.\d+)+(?:[A-Za-z]+)?)(?=\s|$)/;

/**
 * Finds ambiguous task references without imposing a contiguous numbering
 * scheme. Unnumbered tasks and tasks outside a `## N.` group are intentionally
 * ignored because both forms already exist in real projects.
 */
export function findTaskNumberingIssues(content: string): TaskNumberingIssue[] {
  const lines = content.split('\n');
  if (!lines.some((line) => NUMBERED_GROUP_HEADING.test(line))) return [];

  const issues: TaskNumberingIssue[] = [];
  const firstLineById = new Map<string, number>();
  let currentGroup: string | undefined;

  lines.forEach((line, index) => {
    if (LEVEL_TWO_HEADING.test(line)) {
      currentGroup = line.match(NUMBERED_GROUP_HEADING)?.[1];
    }

    const task = parseTaskLines(line)[0];
    const id = task?.description.match(TASK_ID)?.[1];
    if (!id) return;

    const lineNumber = index + 1;
    const taskGroup = id.split('.')[0];
    const normalizedTaskGroup = taskGroup.replace(/^0+(?=\d)/, '');
    const normalizedCurrentGroup = currentGroup?.replace(/^0+(?=\d)/, '');
    if (normalizedCurrentGroup !== undefined && normalizedTaskGroup !== normalizedCurrentGroup) {
      issues.push({
        line: lineNumber,
        message: `Task "${id}" is under group ${currentGroup}, but its leading number points to group ${taskGroup}. Move it to group ${taskGroup} or renumber it.`,
      });
    }

    const firstLine = firstLineById.get(id);
    if (firstLine !== undefined) {
      issues.push({
        line: lineNumber,
        message: `Task ID "${id}" is duplicated; it was first declared on line ${firstLine}.`,
      });
    } else {
      firstLineById.set(id, lineNumber);
    }
  });

  return issues;
}
