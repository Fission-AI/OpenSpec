import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  assertPortableBundleEntries,
  computeBundleIntegrity,
  MAX_SCHEMA_BUNDLE_BYTES,
  MAX_SCHEMA_BUNDLE_FILES,
  normalizeBundlePath,
  type BundleIntegrity,
} from './bundle.js';
import { validateGitSource } from './config.js';

export interface FetchSchemaBundleOptions {
  git: string;
  requestedRef: string;
  lockedCommit?: string;
  bundlePath: string;
  destinationDir: string;
  timeoutMs?: number;
}

export interface FetchSchemaBundleResult extends BundleIntegrity {
  resolvedCommit: string;
}

interface GitTreeEntry {
  mode: string;
  type: string;
  objectId: string;
  relativePath: string;
}

const DEFAULT_GIT_TIMEOUT_MS = 120_000;
const GIT_OUTPUT_LIMIT = MAX_SCHEMA_BUNDLE_BYTES + 1024 * 1024;

function runGit(
  cwd: string,
  args: string[],
  operation: string,
  timeoutMs: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      {
        cwd,
        encoding: 'buffer',
        maxBuffer: GIT_OUTPUT_LIMIT,
        timeout: timeoutMs,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) {
          const credentialHint =
            operation === 'fetch'
              ? '; check the ref and system Git SSH/credential-helper access'
              : '';
          reject(
            new Error(
              `Git ${operation} failed while synchronizing remote schema${credentialHint}`
            )
          );
          return;
        }
        resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout));
      }
    );
  });
}

function parseTreeEntries(output: Buffer, bundlePath: string): GitTreeEntry[] {
  const decoded = output.toString('utf8');
  if (!Buffer.from(decoded, 'utf8').equals(output)) {
    throw new Error('Remote schema bundle contains a non-UTF-8 Git path');
  }
  const prefix = `${bundlePath}/`;
  const records = decoded.split('\0').filter(Boolean);
  const entries: GitTreeEntry[] = [];
  for (const record of records) {
    const tabIndex = record.indexOf('\t');
    if (tabIndex < 0) {
      throw new Error('Git returned an invalid tree entry for remote schema bundle');
    }
    const [mode, type, objectId] = record.slice(0, tabIndex).split(' ');
    const repositoryPath = record.slice(tabIndex + 1);
    if (!mode || !type || !objectId || !repositoryPath.startsWith(prefix)) {
      throw new Error('Git returned a tree entry outside the selected remote schema bundle');
    }
    const relativePath = repositoryPath.slice(prefix.length);
    if (mode === '120000') {
      throw new Error(`Remote schema bundle contains symbolic link '${relativePath}'`);
    }
    if (mode === '160000' || type === 'commit') {
      throw new Error(`Remote schema bundle contains Git submodule '${relativePath}'`);
    }
    if (!mode.startsWith('100') || type !== 'blob') {
      throw new Error(`Remote schema bundle contains unsupported entry '${relativePath}'`);
    }
    entries.push({ mode, type, objectId, relativePath });
  }
  if (entries.length === 0) {
    throw new Error(`Remote schema bundle path '${bundlePath}' contains no tracked files`);
  }
  if (entries.length > MAX_SCHEMA_BUNDLE_FILES) {
    throw new Error(`Remote schema bundle contains more than ${MAX_SCHEMA_BUNDLE_FILES} files`);
  }
  assertPortableBundleEntries(entries.map((entry) => entry.relativePath));
  return entries;
}

export async function fetchSchemaBundleFromGit(
  options: FetchSchemaBundleOptions
): Promise<FetchSchemaBundleResult> {
  const bundlePath = normalizeBundlePath(options.bundlePath);
  const timeoutMs = options.timeoutMs ?? DEFAULT_GIT_TIMEOUT_MS;
  if (validateGitSource(options.git) !== 'valid') {
    throw new Error(
      'Invalid remote schema Git source; use a credential-free HTTPS, SSH, scp-style SSH, or file URL'
    );
  }
  if (
    options.requestedRef.length === 0 ||
    options.requestedRef.startsWith('-') ||
    /[\u0000-\u001f\u007f]/.test(options.requestedRef)
  ) {
    throw new Error('Invalid remote schema ref');
  }
  if (
    options.lockedCommit !== undefined &&
    !/^[0-9a-f]{40}$/.test(options.lockedCommit)
  ) {
    throw new Error('Locked remote schema commit must be a 40-character hexadecimal SHA');
  }

  const repositoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-fetch-'));
  try {
    await runGit(repositoryDir, ['init', '--quiet'], 'initialization', timeoutMs);
    await runGit(
      repositoryDir,
      ['remote', 'add', 'origin', options.git],
      'remote setup',
      timeoutMs
    );
    const fetchTarget = options.lockedCommit ?? options.requestedRef;
    await runGit(
      repositoryDir,
      ['fetch', '--quiet', '--depth=1', '--no-tags', 'origin', fetchTarget],
      'fetch',
      timeoutMs
    );
    const resolvedCommit = (
      await runGit(
        repositoryDir,
        ['rev-parse', 'FETCH_HEAD^{commit}'],
        'commit resolution',
        timeoutMs
      )
    )
      .toString('utf8')
      .trim();
    if (!/^[0-9a-f]{40}$/.test(resolvedCommit)) {
      throw new Error('Git did not resolve the remote schema ref to a commit SHA');
    }
    if (options.lockedCommit !== undefined && resolvedCommit !== options.lockedCommit) {
      throw new Error('Fetched remote schema commit does not match the lockfile');
    }

    const treeOutput = await runGit(
      repositoryDir,
      ['ls-tree', '-r', '-z', resolvedCommit, '--', bundlePath],
      'tree inspection',
      timeoutMs
    );
    const entries = parseTreeEntries(treeOutput, bundlePath);

    const blobs: Array<GitTreeEntry & { content: Buffer }> = [];
    let totalBytes = 0;
    for (const entry of entries) {
      const content = await runGit(
        repositoryDir,
        ['cat-file', 'blob', entry.objectId],
        'blob extraction',
        timeoutMs
      );
      totalBytes += content.length;
      if (totalBytes > MAX_SCHEMA_BUNDLE_BYTES) {
        throw new Error(
          `Remote schema bundle contains more than ${MAX_SCHEMA_BUNDLE_BYTES} bytes`
        );
      }
      blobs.push({ ...entry, content });
    }

    fs.mkdirSync(options.destinationDir, { recursive: true });
    for (const blob of blobs) {
      const destinationPath = path.join(
        options.destinationDir,
        ...blob.relativePath.split('/')
      );
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, blob.content, { flag: 'wx' });
    }

    return {
      resolvedCommit,
      ...computeBundleIntegrity(options.destinationDir),
    };
  } finally {
    fs.rmSync(repositoryDir, { recursive: true, force: true });
  }
}
