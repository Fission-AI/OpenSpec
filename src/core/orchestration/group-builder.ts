/**
 * Group Builder
 *
 * Parses `## N.` section headers from tasks.md into TaskGroup[] with
 * intra-group parallel: true, default depends_on: [N-1], and
 * `<!-- parallel-with: N -->` comment parsing for explicit inter-group parallelism.
 */

import type { TaskGroup } from './types.js';

/** Regex to match `## N.` section headers, optionally with `<!-- parallel-with: N,M -->` */
const SECTION_HEADER_RE = /^##\s+(\d+)\.\s*/;
const PARALLEL_WITH_RE = /<!--\s*parallel-with:\s*([\d,\s]+)\s*-->/;

/** Regex to match task lines (checkbox items) */
const TASK_LINE_RE = /^[-*]\s*\[[ xX]\]\s+(.+)/;

/**
 * Extract the task ID from a task line description.
 * Looks for patterns like `1.1`, `2.3`, etc. at the start.
 * Falls back to the full description if no ID pattern is found.
 */
function extractTaskId(description: string): string {
  const idMatch = description.match(/^(\d+\.\d+)\s/);
  return idMatch ? idMatch[1] : description.trim();
}

/**
 * Parse tasks.md content into TaskGroup[].
 *
 * Rules:
 * - Each `## N.` header starts a new group with id = N.
 * - Task lines (checkboxes) under a section belong to that group.
 * - Intra-group tasks are marked parallel: true.
 * - Default depends_on: [N-1] for inter-group ordering (except group 0 or first group).
 * - `<!-- parallel-with: N -->` comments override depends_on to [] for the group,
 *   indicating it can run in parallel with group N.
 * - If no `## N.` headers exist, all tasks go into a single group with id: 0.
 */
export function buildTaskGroups(content: string): TaskGroup[] {
  const lines = content.split(/\r?\n/);
  const groups: TaskGroup[] = [];
  let currentGroup: { id: number; tasks: string[]; dependsOverride: number[] | null } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(SECTION_HEADER_RE);
    if (headerMatch) {
      // Save previous group
      if (currentGroup) {
        groups.push(finalizeGroup(currentGroup, groups));
      }

      const groupId = parseInt(headerMatch[1], 10);
      let dependsOverride: number[] | null = null;

      // Check for <!-- parallel-with: N --> in the same line or header
      const parallelMatch = line.match(PARALLEL_WITH_RE);
      if (parallelMatch) {
        dependsOverride = parallelMatch[1]
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
      }

      currentGroup = { id: groupId, tasks: [], dependsOverride };
      continue;
    }

    // Check for parallel-with comment on its own line (under current header)
    if (currentGroup && !headerMatch) {
      const parallelMatch = line.match(PARALLEL_WITH_RE);
      if (parallelMatch) {
        currentGroup.dependsOverride = parallelMatch[1]
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        continue;
      }
    }

    // Check for task lines
    const taskMatch = line.match(TASK_LINE_RE);
    if (taskMatch) {
      const taskId = extractTaskId(taskMatch[1]);
      if (currentGroup) {
        currentGroup.tasks.push(taskId);
      } else {
        // No section header yet — create a fallback group
        currentGroup = { id: 0, tasks: [taskId], dependsOverride: null };
      }
    }
  }

  // Save last group
  if (currentGroup) {
    groups.push(finalizeGroup(currentGroup, groups));
  }

  return groups;
}

/**
 * Finalize a raw group into a TaskGroup with proper depends_on.
 */
function finalizeGroup(
  raw: { id: number; tasks: string[]; dependsOverride: number[] | null },
  existingGroups: TaskGroup[]
): TaskGroup {
  let dependsOn: number[];

  if (raw.dependsOverride !== null) {
    // Explicit parallel-with overrides to empty depends (runs in parallel)
    dependsOn = [];
  } else if (existingGroups.length === 0) {
    // First group has no dependencies
    dependsOn = [];
  } else {
    // Default: depends on previous group
    const prevGroup = existingGroups[existingGroups.length - 1];
    dependsOn = [prevGroup.id];
  }

  return {
    id: raw.id,
    tasks: raw.tasks,
    parallel: true,
    depends_on: dependsOn,
  };
}
