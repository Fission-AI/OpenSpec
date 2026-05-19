export interface CheckEntry {
  /** Human-readable name for this check */
  name: string;
  /** Shell command to execute */
  command: string;
  /** Optional glob patterns; if provided, check only runs when affected files match */
  files?: string[];
}

export interface CheckConfig {
  checks: CheckEntry[];
}

export interface CheckIssue {
  level: 'ERROR' | 'WARNING' | 'INFO';
  path: string;
  message: string;
  line?: number;
  column?: number;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  issues: CheckIssue[];
  skipped?: boolean;
  skipReason?: string;
}

export interface CheckReport {
  changeName?: string;
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}
