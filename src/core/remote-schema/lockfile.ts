import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { isValidSchemaSourceName, validateGitSource } from './config.js';
import { normalizeBundlePath } from './bundle.js';
import type { RemoteSchemaLock } from './types.js';

export const SCHEMA_LOCK_FILE_NAME = 'schemas.lock.yaml';

export function getSchemaLockPath(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', SCHEMA_LOCK_FILE_NAME);
}

const LockEntrySchema = z
  .object({
    git: z
      .string()
      .min(1)
      .refine(
        (value) => validateGitSource(value) === 'valid',
        'must be a credential-free HTTPS, SSH, scp-style SSH, or file URL'
      ),
    requestedRef: z.string().min(1),
    resolvedCommit: z.string().regex(/^[0-9a-f]{40}$/),
    bundlePath: z.string().min(1).refine((value) => {
      try {
        normalizeBundlePath(value);
        return true;
      } catch {
        return false;
      }
    }, 'must be a repository-relative portable Git path'),
    integrity: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();

const LockSchema = z
  .object({
    version: z.literal(1),
    schemas: z.record(
      z.string().refine(isValidSchemaSourceName, 'must be a valid schema name'),
      LockEntrySchema
    ),
  })
  .strict();

export function readSchemaLock(projectRoot: string): RemoteSchemaLock | null {
  const lockPath = getSchemaLockPath(projectRoot);
  if (!fs.existsSync(lockPath)) {
    return null;
  }

  try {
    const parsed = parseYaml(fs.readFileSync(lockPath, 'utf8'));
    const result = LockSchema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(details);
    }
    return result.data;
  } catch (error) {
    throw new Error(
      `Invalid remote schema lockfile at '${lockPath}': ${
        error instanceof Error ? error.message.split('\n')[0] : String(error)
      }`
    );
  }
}

function sortedLock(lock: RemoteSchemaLock): RemoteSchemaLock {
  const schemas = Object.fromEntries(
    Object.entries(lock.schemas).sort(([left], [right]) => left.localeCompare(right))
  );
  return { version: 1, schemas };
}

export function writeSchemaLock(projectRoot: string, lock: RemoteSchemaLock): void {
  const result = LockSchema.safeParse(lock);
  if (!result.success) {
    throw new Error(`Invalid remote schema lockfile data: ${result.error.message}`);
  }

  const lockPath = getSchemaLockPath(projectRoot);
  const lockDir = path.dirname(lockPath);
  fs.mkdirSync(lockDir, { recursive: true });
  const tempPath = path.join(
    lockDir,
    `.${SCHEMA_LOCK_FILE_NAME}.${process.pid}.${randomUUID()}.tmp`
  );

  try {
    fs.writeFileSync(tempPath, stringifyYaml(sortedLock(result.data)), {
      encoding: 'utf8',
      flag: 'wx',
    });
    fs.renameSync(tempPath, lockPath);
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    throw error;
  }
}
