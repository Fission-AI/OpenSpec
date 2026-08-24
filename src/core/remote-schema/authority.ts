import * as fs from 'node:fs';
import * as path from 'node:path';
import { readProjectConfig } from '../project-config.js';

export type RemoteSchemaResolutionErrorCode =
  | 'schema_name_conflict'
  | 'remote_lock_invalid'
  | 'remote_not_locked'
  | 'remote_lock_mismatch'
  | 'remote_cache_invalid';

export class RemoteSchemaResolutionError extends Error {
  constructor(
    public readonly code: RemoteSchemaResolutionErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RemoteSchemaResolutionError';
  }
}

export function getProjectSchemaConflictPath(
  projectRoot: string,
  name: string
): string | null {
  const schemaDir = path.join(projectRoot, 'openspec', 'schemas', name);
  return fs.existsSync(path.join(schemaDir, 'schema.yaml')) ? schemaDir : null;
}

export function assertNoProjectSchemaConflict(
  projectRoot: string,
  name: string
): void {
  const conflictPath = getProjectSchemaConflictPath(projectRoot, name);
  if (conflictPath) {
    throw new RemoteSchemaResolutionError(
      'schema_name_conflict',
      `Project-local schema '${name}' at '${conflictPath}' conflicts with declared remote schema '${name}'; rename the local schema or remove the remote declaration`
    );
  }
}

export function assertProjectSchemaNameUnclaimed(
  projectRoot: string,
  name: string
): void {
  if (readProjectConfig(projectRoot)?.schemaSources?.[name]) {
    throw new RemoteSchemaResolutionError(
      'schema_name_conflict',
      `Cannot create project-local schema '${name}' because that name is declared by a remote schema source; choose a different name or remove the remote declaration`
    );
  }
}
