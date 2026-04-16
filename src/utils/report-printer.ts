export interface ReportIssue {
  level: 'ERROR' | 'WARNING' | 'INFO';
  path: string;
  message: string;
}

export function issueSeverityPrefix(level: ReportIssue['level']): string {
  if (level === 'ERROR') return '✗';
  if (level === 'WARNING') return '⚠';
  return 'ℹ';
}

/**
 * Print a validation report's issues in the standard text format.
 *
 * Handles the three-way branch:
 *   1. invalid  → stderr "has issues" + all issues + optional next-steps callback
 *   2. valid with warnings → stdout "is valid" + warnings/info to stderr
 *   3. clean    → stdout "is valid"
 *
 * Returns true when the report is invalid (caller should set exitCode = 1).
 */
export function printReportIssues(
  label: string,
  report: { valid: boolean; issues: ReportIssue[] },
): void {
  if (!report.valid) {
    console.error(`${label} has issues`);
  } else {
    console.log(`${label} is valid`);
  }
  for (const issue of report.issues) {
    console.error(`${issueSeverityPrefix(issue.level)} [${issue.level}] ${issue.path}: ${issue.message}`);
  }
}
