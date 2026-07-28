import { spawn } from 'node:child_process';
import { once } from 'node:events';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getSchemaSyncLockPath,
  withSchemaSyncLock,
} from '../../../src/core/remote-schema/sync-lock.js';

describe('schema synchronization lock', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-sync-lock-'));
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  });

  function writeTicket(token: string, pid: number): string {
    const lockPath = getSchemaSyncLockPath(projectRoot);
    fs.mkdirSync(lockPath, { recursive: true });
    fs.writeFileSync(
      path.join(lockPath, `claim-${token}.ticket.json`),
      JSON.stringify({
        token,
        pid,
        hostname: os.hostname(),
        startedAt: new Date().toISOString(),
        number: 1,
      })
    );
    return lockPath;
  }

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('serializes concurrent owners of one project lock', async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withSchemaSyncLock(projectRoot, async () => {
      order.push('first-enter');
      await firstCanFinish;
      order.push('first-exit');
    });
    while (order.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    const second = withSchemaSyncLock(
      projectRoot,
      async () => {
        order.push('second-enter');
      },
      { timeoutMs: 500, retryDelayMs: 5 }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(order).toEqual(['first-enter']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first-enter', 'first-exit', 'second-enter']);
  });

  it('does not steal a lock from a live owner', async () => {
    const lockPath = writeTicket('live-owner', process.pid);

    await expect(
      withSchemaSyncLock(projectRoot, async () => undefined, {
        timeoutMs: 20,
        retryDelayMs: 5,
      })
    ).rejects.toThrow(/schema_sync_locked/);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  it('does not steal a lock held by another process', async () => {
    const child = spawn(
      process.execPath,
      [
        '-e',
        `
          const fs = require('node:fs');
          const os = require('node:os');
          const path = require('node:path');
          const lockPath = path.join(process.argv[1], 'openspec', '.schemas.lock');
          fs.mkdirSync(lockPath);
          fs.writeFileSync(
            path.join(lockPath, 'claim-child-owner.ticket.json'),
            JSON.stringify({
              token: 'child-owner',
              pid: process.pid,
              hostname: os.hostname(),
              startedAt: new Date().toISOString(),
              number: 1,
            })
          );
          process.stdout.write('ready\\n');
          setInterval(() => {}, 1_000);
        `,
        projectRoot,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    try {
      await Promise.race([
        once(child.stdout, 'data'),
        once(child, 'exit').then(([code]) => {
          throw new Error(`lock-holder child exited before ready (${code})`);
        }),
      ]);

      await expect(
        withSchemaSyncLock(projectRoot, async () => undefined, {
          timeoutMs: 50,
          retryDelayMs: 5,
        })
      ).rejects.toThrow(/schema_sync_locked/);
      expect(fs.existsSync(getSchemaSyncLockPath(projectRoot))).toBe(true);
    } finally {
      child.kill();
      if (child.exitCode === null) {
        await once(child, 'exit');
      }
    }
  });

  it('reclaims an abandoned same-host lock', async () => {
    const lockPath = writeTicket('dead-owner', 2_147_483_647);

    await expect(
      withSchemaSyncLock(projectRoot, async () => 'acquired', {
        timeoutMs: 100,
        retryDelayMs: 5,
      })
    ).resolves.toBe('acquired');
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('does not remove a successor lock when ownership changes', async () => {
    const lockPath = getSchemaSyncLockPath(projectRoot);

    await withSchemaSyncLock(projectRoot, async () => {
      fs.rmSync(lockPath, { recursive: true, force: true });
      writeTicket('successor', process.pid);
    });

    expect(fs.existsSync(lockPath)).toBe(true);
    expect(fs.readdirSync(lockPath)).toContain(
      'claim-successor.ticket.json'
    );
  });
});
