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

function removeSshOption(command: string, option: string): string {
  const assignment = `${option}(?:\\s*=\\s*|\\s+)`;
  return command
    .replace(
      new RegExp(
        `(^|\\s)-o\\s*(?:"${assignment}[^"]*"|'${assignment}[^']*'|${assignment}(?:"[^"]*"|'[^']*'|\\S+))`,
        'gi'
      ),
      '$1'
    )
    .trim();
}

export function buildNonInteractiveGitEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  let sshCommand = environment.GIT_SSH_COMMAND?.trim() || 'ssh';
  sshCommand = removeSshOption(sshCommand, 'BatchMode');
  sshCommand = removeSshOption(sshCommand, 'StrictHostKeyChecking');
  return {
    ...environment,
    GIT_TERMINAL_PROMPT: '0',
    GIT_SSH_COMMAND: `${sshCommand} -o BatchMode=yes -o StrictHostKeyChecking=accept-new`,
  };
}

function runGit(
  cwd: string,
  args: string[],
  operation: string,
  timeoutMs: number,
  input?: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      args,
      {
        cwd,
        env: buildNonInteractiveGitEnvironment(),
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
    if (input !== undefined) {
      child.stdin?.end(input);
    }
  });
}

export async function verifyLockedCommitIsAncestor(
  repositoryDir: string,
  lockedCommit: string,
  fetchedRef: string,
  timeoutMs: number
): Promise<string> {
  let verifiedCommit: string;
  try {
    verifiedCommit = (
      await runGit(
        repositoryDir,
        ['rev-parse', `${lockedCommit}^{commit}`],
        'locked commit presence verification',
        timeoutMs
      )
    ).toString('utf8').trim();
  } catch {
    throw new Error(
      'Locked commit verification failed: the commit is not present after fetching the requested ref'
    );
  }

  try {
    await runGit(
      repositoryDir,
      ['merge-base', '--is-ancestor', verifiedCommit, fetchedRef],
      'locked commit ancestry verification',
      timeoutMs
    );
  } catch {
    throw new Error(
      'Locked commit verification failed: the commit is not reachable from the requested ref'
    );
  }
  return verifiedCommit;
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

function parseBatchBlobs(
  output: Buffer,
  entries: GitTreeEntry[]
): Array<GitTreeEntry & { content: Buffer }> {
  const blobs: Array<GitTreeEntry & { content: Buffer }> = [];
  let offset = 0;
  for (const entry of entries) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) {
      throw new Error('Git returned an incomplete blob batch for remote schema bundle');
    }
    const header = output.subarray(offset, headerEnd).toString('ascii');
    const [objectId, type, sizeText] = header.split(' ');
    const size = Number(sizeText);
    if (
      objectId !== entry.objectId ||
      type !== 'blob' ||
      !Number.isSafeInteger(size) ||
      size < 0
    ) {
      throw new Error('Git returned an invalid blob batch for remote schema bundle');
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (contentEnd >= output.length || output[contentEnd] !== 0x0a) {
      throw new Error('Git returned an incomplete blob batch for remote schema bundle');
    }
    blobs.push({ ...entry, content: output.subarray(contentStart, contentEnd) });
    offset = contentEnd + 1;
  }
  if (offset !== output.length) {
    throw new Error('Git returned unexpected data after the remote schema blob batch');
  }
  return blobs;
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
    await runGit(
      repositoryDir,
      options.lockedCommit
        ? ['fetch', '--quiet', '--no-tags', 'origin', options.requestedRef]
        : ['fetch', '--quiet', '--depth=1', '--no-tags', 'origin', options.requestedRef],
      'fetch',
      timeoutMs
    );
    let resolvedCommit: string;
    if (options.lockedCommit) {
      resolvedCommit = await verifyLockedCommitIsAncestor(
        repositoryDir,
        options.lockedCommit,
        'FETCH_HEAD^{commit}',
        timeoutMs
      );
    } else {
      resolvedCommit = (
        await runGit(
          repositoryDir,
          ['rev-parse', 'FETCH_HEAD^{commit}'],
          'commit resolution',
          timeoutMs
        )
      ).toString('utf8').trim();
    }
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

    const batchInput = Buffer.from(
      `${entries.map((entry) => entry.objectId).join('\n')}\n`,
      'ascii'
    );
    const blobs = parseBatchBlobs(
      await runGit(
        repositoryDir,
        ['cat-file', '--batch'],
        'blob extraction',
        timeoutMs,
        batchInput
      ),
      entries
    );
    let totalBytes = 0;
    for (const blob of blobs) {
      totalBytes += blob.content.length;
      if (totalBytes > MAX_SCHEMA_BUNDLE_BYTES) {
        throw new Error(
          `Remote schema bundle contains more than ${MAX_SCHEMA_BUNDLE_BYTES} bytes`
        );
      }
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
