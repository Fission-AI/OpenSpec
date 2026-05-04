export type StatusSeverity = 'error' | 'warning';

export interface WorkspaceStatus {
  severity: StatusSeverity;
  code: string;
  message: string;
  target?: string;
  fix?: string;
}

export interface WorkspaceLinkOutput {
  name: string;
  path: string | null;
  repo_specs_path?: string | null;
  status: WorkspaceStatus[];
}

export interface WorkspaceOutput {
  name: string;
  root: string;
  planning_path: string;
  links: WorkspaceLinkOutput[];
  status: WorkspaceStatus[];
}

export interface WorkspaceListOutput {
  name: string;
  root: string;
  links: WorkspaceLinkOutput[];
  status: WorkspaceStatus[];
}

export interface WorkspaceSetupOptions {
  name?: string;
  link?: string[];
  json?: boolean;
  noInteractive?: boolean;
  interactive?: boolean;
}

export interface WorkspaceSelectionOptions {
  workspace?: string;
  json?: boolean;
  noInteractive?: boolean;
  interactive?: boolean;
}

export type WorkspaceLinkOptions = WorkspaceSelectionOptions;

export interface WorkspaceListOptions {
  json?: boolean;
}

export interface SelectedWorkspace {
  name: string;
  root: string;
  status: WorkspaceStatus[];
  unregisteredCurrentWorkspace: boolean;
}

export interface WorkspaceLinkMutationPayload {
  workspace: WorkspaceOutput;
  link: {
    name: string;
    path: string;
    status: WorkspaceStatus[];
  };
  status: WorkspaceStatus[];
}

export class WorkspaceCliError extends Error {
  readonly status: WorkspaceStatus;

  constructor(message: string, code: string, options: { target?: string; fix?: string } = {}) {
    super(message);
    this.status = {
      severity: 'error',
      code,
      message,
      ...options,
    };
  }
}

export function makeStatus(
  severity: StatusSeverity,
  code: string,
  message: string,
  options: { target?: string; fix?: string } = {}
): WorkspaceStatus {
  return {
    severity,
    code,
    message,
    ...options,
  };
}

export function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function asStatus(error: unknown): WorkspaceStatus {
  if (error instanceof WorkspaceCliError) {
    return error.status;
  }

  return makeStatus('error', 'workspace_error', asErrorMessage(error));
}

export function appendStatus<T extends { status: WorkspaceStatus[] }>(
  payload: T,
  status: WorkspaceStatus
): T {
  return {
    ...payload,
    status: [...payload.status, status],
  };
}
