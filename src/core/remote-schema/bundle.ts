import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface BundleLimits {
  maxFiles: number;
  maxBytes: number;
}

export interface BundleIntegrity {
  integrity: string;
  fileCount: number;
  totalBytes: number;
}

export const MAX_SCHEMA_BUNDLE_FILES = 1_000;
export const MAX_SCHEMA_BUNDLE_BYTES = 10 * 1024 * 1024;

const WINDOWS_RESERVED_SEGMENT =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function invalidBundlePath(value: string, reason: string): never {
  throw new Error(`Invalid schema bundle path '${value}': ${reason}`);
}

export function normalizeBundlePath(value: string): string {
  if (
    value.length === 0 ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[a-zA-Z]:/.test(value)
  ) {
    return invalidBundlePath(value, 'must be a repository-relative portable Git path');
  }

  const segments = value.split('/');
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === '.' ||
      segment === '..' ||
      segment.endsWith('.') ||
      segment.endsWith(' ') ||
      segment.includes(':') ||
      /[<>"|?*]/.test(segment) ||
      WINDOWS_RESERVED_SEGMENT.test(segment)
    ) {
      return invalidBundlePath(value, `unsafe path segment '${segment}'`);
    }
  }
  return segments.join('/');
}

export function assertPortableBundleEntries(entries: string[]): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const normalized = normalizeBundlePath(entry);
    const segments = normalized.split('/');
    for (let index = 0; index < segments.length; index++) {
      const originalPrefix = segments.slice(0, index + 1).join('/');
      const portableKey = originalPrefix.normalize('NFC').toLocaleLowerCase('en-US');
      const previous = seen.get(portableKey);
      if (previous !== undefined && previous !== originalPrefix) {
        throw new Error(
          `Remote schema bundle has a portable path collision between '${previous}' and '${originalPrefix}'`
        );
      }
      seen.set(portableKey, originalPrefix);
    }
  }
}

export function computeBundleIntegrity(
  bundleDir: string,
  limits: BundleLimits = {
    maxFiles: MAX_SCHEMA_BUNDLE_FILES,
    maxBytes: MAX_SCHEMA_BUNDLE_BYTES,
  }
): BundleIntegrity {
  const rootStat = fs.lstatSync(bundleDir);
  if (rootStat.isSymbolicLink()) {
    throw new Error('Remote schema bundle root must not be a symbolic link');
  }
  if (!rootStat.isDirectory()) {
    throw new Error('Remote schema bundle root must be a directory');
  }

  const files: Array<{ relativePath: string; content: Buffer }> = [];
  let totalBytes = 0;
  const visit = (currentDir: string, relativeDir: string): void => {
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((left, right) =>
        Buffer.compare(Buffer.from(left.name, 'utf8'), Buffer.from(right.name, 'utf8'))
      );
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;
      if (entry.isSymbolicLink()) {
        throw new Error(`Remote schema bundle contains symbolic link '${relativePath}'`);
      }
      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`Remote schema bundle contains non-regular file '${relativePath}'`);
      }
      if (files.length + 1 > limits.maxFiles) {
        throw new Error(`Remote schema bundle contains more than ${limits.maxFiles} files`);
      }
      const size = fs.statSync(absolutePath).size;
      if (totalBytes + size > limits.maxBytes) {
        throw new Error(`Remote schema bundle contains more than ${limits.maxBytes} bytes`);
      }
      const content = fs.readFileSync(absolutePath);
      if (totalBytes + content.length > limits.maxBytes) {
        throw new Error(`Remote schema bundle contains more than ${limits.maxBytes} bytes`);
      }
      files.push({ relativePath, content });
      totalBytes += content.length;
    }
  };
  visit(bundleDir, '');

  const relativePaths = files.map((file) => file.relativePath);
  assertPortableBundleEntries(relativePaths);
  const hash = createHash('sha256');
  for (const file of files.sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.relativePath, 'utf8'),
      Buffer.from(right.relativePath, 'utf8')
    )
  )) {
    const pathBytes = Buffer.from(file.relativePath, 'utf8');
    const pathLength = Buffer.allocUnsafe(4);
    pathLength.writeUInt32BE(pathBytes.length);
    const contentLength = Buffer.allocUnsafe(8);
    contentLength.writeBigUInt64BE(BigInt(file.content.length));
    hash.update(pathLength);
    hash.update(pathBytes);
    hash.update(contentLength);
    hash.update(file.content);
  }

  return {
    integrity: `sha256:${hash.digest('hex')}`,
    fileCount: files.length,
    totalBytes,
  };
}
