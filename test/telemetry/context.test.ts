import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { detectInvoker, detectInstallKind, collectRunContext } from '../../src/telemetry/context.js';
import { sanitizeProperties, setRegistryChecks } from '../../src/telemetry/properties.js';

setRegistryChecks({ isCommand: () => true, isTool: () => true });

describe('detectInvoker', () => {
  it('names a recognized agent', () => {
    expect(detectInvoker({ CLAUDECODE: '1' }, false)).toBe('claude_code');
    expect(detectInvoker({ CURSOR_TRACE_ID: 'abc' }, false)).toBe('cursor');
  });

  it('falls back to terminal when stdout is a tty', () => {
    expect(detectInvoker({}, true)).toBe('terminal');
  });

  it('collapses an unrecognized environment to unknown', () => {
    expect(detectInvoker({ ACME_INTERNAL_AGENT: '1' }, false)).toBe('unknown');
  });

  it('ignores an empty marker', () => {
    expect(detectInvoker({ CLAUDECODE: '' }, true)).toBe('terminal');
  });
});

describe('detectInstallKind', () => {
  it('recognizes npx', () => {
    expect(detectInstallKind('/Users/j/.npm/_npx/abc/node_modules/openspec', {})).toBe('npx');
    expect(detectInstallKind(null, { npm_command: 'exec' })).toBe('npx');
  });

  it('falls back to global', () => {
    expect(detectInstallKind('/usr/local/lib/node_modules/openspec', {})).toBe('global');
  });
});

describe('collectRunContext', () => {
  it('buckets the change count and keeps no names', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-ctx-'));
    const changes = path.join(root, 'changes');
    await fs.mkdir(path.join(changes, 'acme-billing-rewrite'), { recursive: true });
    await fs.mkdir(path.join(changes, 'secret-project-x'), { recursive: true });
    await fs.mkdir(path.join(changes, 'archive'), { recursive: true });

    const context = await collectRunContext({
      projectRoot: root,
      stdoutIsTty: false,
      jsonMode: true,
      prompted: false,
      firstRun: false,
      storeInUse: true,
      toolCount: 3,
      env: {},
    });

    expect(context.changes).toBe('01-03');
    expect(context.tools_count).toBe('2-3');
    expect(context.store_in_use).toBe(true);

    const serialized = JSON.stringify(sanitizeProperties(context));
    expect(serialized).not.toContain('acme-billing-rewrite');
    expect(serialized).not.toContain('secret-project-x');
    expect(serialized).not.toContain(root);

    await fs.rm(root, { recursive: true, force: true });
  });

  it('omits the count when the directory cannot be read', async () => {
    const context = await collectRunContext({
      projectRoot: '/nonexistent-openspec-root',
      stdoutIsTty: true,
      jsonMode: false,
      prompted: false,
      firstRun: true,
      storeInUse: false,
      env: {},
    });
    expect(context.changes).toBeUndefined();
    // The event still carries everything else.
    expect(context.platform).toBeDefined();
    expect(context.first_run).toBe(true);
  });

  it('produces only allowlisted properties', async () => {
    const context = await collectRunContext({
      stdoutIsTty: false,
      jsonMode: false,
      prompted: true,
      firstRun: false,
      storeInUse: false,
      schemaSource: 'user',
      toolCount: 0,
      env: { CLAUDECODE: '1' },
    });
    // Nothing is dropped: every key collectRunContext emits is on the allowlist.
    expect(sanitizeProperties(context)).toEqual(context);
    expect(context.invoker).toBe('claude_code');
    expect(context.schema_source).toBe('user');
  });
});
