export type StoreDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface StoreDiagnostic {
  severity: StoreDiagnosticSeverity;
  code: string;
  message: string;
  target?: string;
  fix?: string;
}

export class StoreError extends Error {
  readonly diagnostic: StoreDiagnostic;

  constructor(
    message: string,
    code: string,
    options: { target?: string; fix?: string } = {}
  ) {
    super(message);
    this.name = 'StoreError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...options,
    };
  }
}

export function makeStoreDiagnostic(
  severity: StoreDiagnosticSeverity,
  code: string,
  message: string,
  options: { target?: string; fix?: string } = {}
): StoreDiagnostic {
  return {
    severity,
    code,
    message,
    ...options,
  };
}
