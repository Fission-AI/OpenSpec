export interface GitSchemaSource {
  git: string;
  ref: string;
  path: string;
}

export interface RemoteSchemaLockEntry {
  git: string;
  requestedRef: string;
  resolvedCommit: string;
  bundlePath: string;
  integrity: string;
}

export interface RemoteSchemaLock {
  version: 1;
  schemas: Record<string, RemoteSchemaLockEntry>;
}
