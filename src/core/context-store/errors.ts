export type ContextStoreDiagnosticSeverity = 'error' | 'warning';

export interface ContextStoreDiagnostic {
  severity: ContextStoreDiagnosticSeverity;
  code: string;
  message: string;
  target?: string;
  fix?: string;
}

export class ContextStoreError extends Error {
  readonly diagnostic: ContextStoreDiagnostic;

  constructor(
    message: string,
    code: string,
    options: { target?: string; fix?: string } = {}
  ) {
    super(message);
    this.name = 'ContextStoreError';
    this.diagnostic = {
      severity: 'error',
      code,
      message,
      ...options,
    };
  }
}

export function makeContextStoreDiagnostic(
  severity: ContextStoreDiagnosticSeverity,
  code: string,
  message: string,
  options: { target?: string; fix?: string } = {}
): ContextStoreDiagnostic {
  return {
    severity,
    code,
    message,
    ...options,
  };
}
