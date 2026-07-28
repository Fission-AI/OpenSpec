import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

interface SchemaSyncParticipant {
  token: string;
  pid: number;
  hostname: string;
  startedAt: string;
  number?: number;
}

export interface SchemaSyncLockOptions {
  timeoutMs?: number;
  retryDelayMs?: number;
}

export class SchemaSyncLockError extends Error {
  readonly code = 'schema_sync_locked';

  constructor(message: string) {
    super(message);
    this.name = 'SchemaSyncLockError';
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 50;
const CHOOSING_SUFFIX = '.choosing.json';
const TICKET_SUFFIX = '.ticket.json';

export function getSchemaSyncLockPath(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', '.schemas.lock');
}

function readParticipant(filePath: string): SchemaSyncParticipant | null {
  try {
    const value = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    ) as Partial<SchemaSyncParticipant>;
    if (
      typeof value.token !== 'string' ||
      typeof value.pid !== 'number' ||
      typeof value.hostname !== 'string' ||
      typeof value.startedAt !== 'string' ||
      (value.number !== undefined &&
        (!Number.isSafeInteger(value.number) || value.number < 1))
    ) {
      return null;
    }
    return value as SchemaSyncParticipant;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

function isAbandonedSameHost(
  participant: SchemaSyncParticipant | null
): boolean {
  return (
    participant !== null &&
    participant.hostname === os.hostname() &&
    !isProcessAlive(participant.pid)
  );
}

function removeOwnFile(filePath: string, token: string): void {
  if (readParticipant(filePath)?.token === token) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

function removeLockDirectoryIfEmpty(lockPath: string): void {
  try {
    fs.rmdirSync(lockPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTEMPTY' && code !== 'EEXIST') {
      throw error;
    }
  }
}

function listParticipantFiles(
  lockPath: string,
  suffix: string
): Array<{ filePath: string; participant: SchemaSyncParticipant | null }> {
  let names: string[];
  try {
    names = fs.readdirSync(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const participants: Array<{
    filePath: string;
    participant: SchemaSyncParticipant | null;
  }> = [];
  for (const name of names.filter((candidate) => candidate.endsWith(suffix))) {
    const filePath = path.join(lockPath, name);
    const participant = readParticipant(filePath);
    if (isAbandonedSameHost(participant)) {
      removeOwnFile(filePath, participant!.token);
      continue;
    }
    participants.push({ filePath, participant });
  }
  return participants;
}

function createParticipantFile(
  lockPath: string,
  fileName: string,
  participant: SchemaSyncParticipant
): string {
  const filePath = path.join(lockPath, fileName);
  while (true) {
    fs.mkdirSync(lockPath, { recursive: true });
    try {
      fs.writeFileSync(filePath, JSON.stringify(participant), {
        encoding: 'utf8',
        flag: 'wx',
      });
      return filePath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function precedes(
  left: SchemaSyncParticipant,
  right: SchemaSyncParticipant
): boolean {
  const numberDifference = left.number! - right.number!;
  return numberDifference < 0 ||
    (numberDifference === 0 && left.token < right.token);
}

async function acquireSchemaSyncLock(
  projectRoot: string,
  options: SchemaSyncLockOptions
): Promise<{ lockPath: string; token: string; ticketPath: string }> {
  const lockPath = getSchemaSyncLockPath(projectRoot);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const deadline = Date.now() + timeoutMs;
  const token = randomUUID();
  const baseParticipant = {
    token,
    pid: process.pid,
    hostname: os.hostname(),
    startedAt: new Date().toISOString(),
  };
  const choosingPath = createParticipantFile(
    lockPath,
    `claim-${token}${CHOOSING_SUFFIX}`,
    baseParticipant
  );
  let ticketPath: string | null = null;

  try {
    const highestNumber = listParticipantFiles(lockPath, TICKET_SUFFIX)
      .reduce(
        (highest, entry) =>
          Math.max(highest, entry.participant?.number ?? 0),
        0
      );
    const participant = {
      ...baseParticipant,
      number: highestNumber + 1,
    };
    ticketPath = createParticipantFile(
      lockPath,
      `claim-${token}${TICKET_SUFFIX}`,
      participant
    );
    removeOwnFile(choosingPath, token);

    while (true) {
      const anotherIsChoosing = listParticipantFiles(
        lockPath,
        CHOOSING_SUFFIX
      ).some((entry) => entry.participant?.token !== token);
      const predecessorExists = listParticipantFiles(
        lockPath,
        TICKET_SUFFIX
      ).some(
        (entry) =>
          entry.participant === null ||
          (entry.participant.token !== token &&
            precedes(entry.participant, participant))
      );
      if (!anotherIsChoosing && !predecessorExists) {
        return { lockPath, token, ticketPath };
      }
      if (Date.now() >= deadline) {
        throw new SchemaSyncLockError(
          `schema_sync_locked: another schema synchronization owns '${lockPath}'`
        );
      }
      await delay(retryDelayMs);
    }
  } catch (error) {
    removeOwnFile(choosingPath, token);
    if (ticketPath) {
      removeOwnFile(ticketPath, token);
    }
    removeLockDirectoryIfEmpty(lockPath);
    throw error;
  }
}

function releaseSchemaSyncLock(
  lockPath: string,
  ticketPath: string,
  token: string
): void {
  removeOwnFile(ticketPath, token);
  removeLockDirectoryIfEmpty(lockPath);
}

export async function withSchemaSyncLock<T>(
  projectRoot: string,
  callback: () => Promise<T>,
  options: SchemaSyncLockOptions = {}
): Promise<T> {
  const { lockPath, token, ticketPath } = await acquireSchemaSyncLock(
    projectRoot,
    options
  );
  try {
    return await callback();
  } finally {
    releaseSchemaSyncLock(lockPath, ticketPath, token);
  }
}
