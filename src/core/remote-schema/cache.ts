import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobalDataDir } from '../global-config.js';
import { computeBundleIntegrity } from './bundle.js';

const INTEGRITY_PATTERN = /^sha256:([0-9a-f]{64})$/;

function integrityHash(integrity: string): string {
  const match = INTEGRITY_PATTERN.exec(integrity);
  if (!match) {
    throw new Error('Remote schema cache requires a valid SHA-256 integrity value');
  }
  return match[1];
}

export function getRemoteSchemaCacheDir(
  integrity: string,
  globalDataDir = getGlobalDataDir()
): string {
  return path.join(
    globalDataDir,
    'schema-cache',
    'v1',
    'sha256',
    integrityHash(integrity)
  );
}

export function verifyRemoteSchemaCache(
  integrity: string,
  globalDataDir = getGlobalDataDir()
): string {
  const cacheDir = getRemoteSchemaCacheDir(integrity, globalDataDir);
  if (!fs.existsSync(cacheDir)) {
    throw new Error(
      `Remote schema cache is missing for ${integrity}; run 'openspec schema sync'`
    );
  }
  const actual = computeBundleIntegrity(cacheDir).integrity;
  if (actual !== integrity) {
    throw new Error(
      `Remote schema cache at '${cacheDir}' does not match its locked integrity; run 'openspec schema sync --locked'`
    );
  }
  return cacheDir;
}

export function installRemoteSchemaCache(
  sourceDir: string,
  integrity: string,
  globalDataDir = getGlobalDataDir()
): string {
  const actual = computeBundleIntegrity(sourceDir).integrity;
  if (actual !== integrity) {
    throw new Error('Remote schema bundle does not match the expected integrity');
  }

  const cacheDir = getRemoteSchemaCacheDir(integrity, globalDataDir);
  if (fs.existsSync(cacheDir)) {
    try {
      return verifyRemoteSchemaCache(integrity, globalDataDir);
    } catch {
      // A verified extraction can repair the content-addressed entry below.
    }
  }

  const parentDir = path.dirname(cacheDir);
  fs.mkdirSync(parentDir, { recursive: true });
  const tempDir = path.join(parentDir, `.install-${process.pid}-${randomUUID()}`);
  const displacedDir = path.join(
    parentDir,
    `.displaced-${process.pid}-${randomUUID()}`
  );
  let displaced = false;
  try {
    fs.cpSync(sourceDir, tempDir, {
      recursive: true,
      errorOnExist: true,
      force: false,
      verbatimSymlinks: true,
    });
    if (computeBundleIntegrity(tempDir).integrity !== integrity) {
      throw new Error('Remote schema cache copy failed integrity verification');
    }
    if (fs.existsSync(cacheDir)) {
      fs.renameSync(cacheDir, displacedDir);
      displaced = true;
    }
    try {
      fs.renameSync(tempDir, cacheDir);
    } catch (error) {
      if (!displaced && fs.existsSync(cacheDir)) {
        return verifyRemoteSchemaCache(integrity, globalDataDir);
      }
      throw error;
    }
    const verified = verifyRemoteSchemaCache(integrity, globalDataDir);
    if (displaced) {
      fs.rmSync(displacedDir, { recursive: true, force: true });
      displaced = false;
    }
    return verified;
  } catch (error) {
    if (displaced) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.renameSync(displacedDir, cacheDir);
      displaced = false;
    }
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
