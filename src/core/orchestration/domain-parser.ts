/**
 * Domain Parser
 *
 * Extracts `[domain: X]` tags from task lines in tasks.md.
 * Builds a `domains: Record<string, string[]>` mapping per group,
 * where keys are domain names and values are task IDs belonging to that domain.
 */

import type { TaskGroup } from './types.js';

/** Regex to match `[domain: X]` tags in task lines */
const DOMAIN_TAG_RE = /\[domain:\s*([^\]]+)\]/;

/** Regex to match task lines (checkbox items) */
const TASK_LINE_RE = /^[-*]\s*\[[ xX]\]\s+(.+)/;

/** Regex to extract task ID from description */
const TASK_ID_RE = /^(\d+\.\d+)\s/;

/**
 * Parse domain tags from a single task line description.
 * Returns the domain name or null if no tag is found.
 */
function extractDomain(description: string): string | null {
  const match = description.match(DOMAIN_TAG_RE);
  return match ? match[1].trim() : null;
}

/**
 * Extract task ID from description.
 */
function extractTaskId(description: string): string {
  const idMatch = description.match(TASK_ID_RE);
  return idMatch ? idMatch[1] : description.trim();
}

/**
 * Parse tasks.md content and extract domain tags for each task.
 * Returns a flat mapping of domain -> task IDs across the entire file.
 */
export function parseDomainTags(content: string): Record<string, string[]> {
  const domains: Record<string, string[]> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const taskMatch = line.match(TASK_LINE_RE);
    if (!taskMatch) continue;

    const description = taskMatch[1];
    const domain = extractDomain(description);
    if (!domain) continue;

    const taskId = extractTaskId(description);

    if (!domains[domain]) {
      domains[domain] = [];
    }
    domains[domain].push(taskId);
  }

  return domains;
}

/**
 * Enrich TaskGroup[] with domain information parsed from tasks.md content.
 * Mutates the groups in-place by setting the `domains` field.
 */
export function enrichGroupsWithDomains(groups: TaskGroup[], content: string): void {
  const lines = content.split(/\r?\n/);

  // Build a map of taskId -> domain from the file
  const taskDomainMap = new Map<string, string>();
  for (const line of lines) {
    const taskMatch = line.match(TASK_LINE_RE);
    if (!taskMatch) continue;

    const description = taskMatch[1];
    const domain = extractDomain(description);
    if (!domain) continue;

    const taskId = extractTaskId(description);
    taskDomainMap.set(taskId, domain);
  }

  // Enrich each group
  for (const group of groups) {
    const groupDomains: Record<string, string[]> = {};
    for (const taskId of group.tasks) {
      const domain = taskDomainMap.get(taskId);
      if (domain) {
        if (!groupDomains[domain]) {
          groupDomains[domain] = [];
        }
        groupDomains[domain].push(taskId);
      }
    }
    if (Object.keys(groupDomains).length > 0) {
      group.domains = groupDomains;
    }
  }
}
