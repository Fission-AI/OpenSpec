import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import {
  compareVersions,
  getAvailableCliUpdate,
  getInstallDir,
  isProjectLocalInstall,
  isEphemeralRunnerInstall,
  buildCliUpdateLines,
  displayCliUpdateNote,
} from '../../src/core/version-check.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

// Resolved so the fixtures carry a drive letter on Windows, where an
// unresolved POSIX path can never prefix-match a resolved one.
const PROJECT_ROOT = path.resolve(path.join('tmp-fixture', 'proj'));
const GLOBAL_ROOT = path.resolve(path.join('tmp-fixture', 'global'));

function bumpMajor(version: string): string {
  const major = Number.parseInt(version.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

describe('compareVersions', () => {
  it('orders release versions numerically', () => {
    expect(compareVersions('1.7.0', '1.6.0')).toBe(1);
    expect(compareVersions('1.6.0', '1.7.0')).toBe(-1);
    expect(compareVersions('1.6.0', '1.6.0')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });

  it('sorts prereleases below their release', () => {
    expect(compareVersions('1.7.0-beta.1', '1.7.0')).toBe(-1);
    expect(compareVersions('1.7.0', '1.7.0-beta.1')).toBe(1);
    expect(compareVersions('1.7.0-beta.1', '1.6.0')).toBe(1);
  });

  it('compares prerelease identifiers per SemVer', () => {
    expect(compareVersions('1.7.0-beta.10', '1.7.0-beta.2')).toBe(1);
    expect(compareVersions('1.7.0-beta.2', '1.7.0-beta.10')).toBe(-1);
    expect(compareVersions('1.7.0-beta.2', '1.7.0-beta.2')).toBe(0);
    // Numeric identifiers rank below alphanumeric ones.
    expect(compareVersions('1.7.0-1', '1.7.0-alpha')).toBe(-1);
    // A longer identifier list wins an otherwise equal comparison.
    expect(compareVersions('1.7.0-beta.1.1', '1.7.0-beta.1')).toBe(1);
    expect(compareVersions('1.7.0-alpha', '1.7.0-beta')).toBe(-1);
  });

  it('tolerates a leading v, build metadata, and partial versions', () => {
    expect(compareVersions('v1.7.0', '1.6.0')).toBe(1);
    expect(compareVersions('1.7', '1.7.0')).toBe(0);
    expect(compareVersions('1.7.0+build.5', '1.7.0')).toBe(0);
  });
});

describe('getAvailableCliUpdate', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      OPENSPEC_NO_UPDATE_CHECK: process.env.OPENSPEC_NO_UPDATE_CHECK,
      DO_NOT_TRACK: process.env.DO_NOT_TRACK,
      OPENSPEC_TELEMETRY: process.env.OPENSPEC_TELEMETRY,
      npm_config_registry: process.env.npm_config_registry,
    };
    // The check is disabled under test/CI by design; opt back in to exercise it.
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.OPENSPEC_NO_UPDATE_CHECK;
    delete process.env.DO_NOT_TRACK;
    delete process.env.OPENSPEC_TELEMETRY;
    delete process.env.npm_config_registry;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.restoreAllMocks();
  });

  function mockRegistry(version: string) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ version }), { status: 200 })
    );
  }

  it('reports the published version when the installed CLI is behind', async () => {
    const newer = bumpMajor(OPENSPEC_VERSION);
    mockRegistry(newer);
    await expect(getAvailableCliUpdate()).resolves.toBe(newer);
  });

  it('returns null when the installed CLI is current', async () => {
    mockRegistry(OPENSPEC_VERSION);
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null and never throws when the registry is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ENOTFOUND'));
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null on a non-OK registry response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('rejects a version that is not plain SemVer', async () => {
    // A hostile or broken response must never reach the terminal: this one
    // carries ANSI cursor controls that would repaint the lines around it.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ version: '9.9.9\u001b[1A\u001b[2K malicious' }), {
        status: 200,
      })
    );
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null when the registry payload has no usable version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ version: 42 }), { status: 200 })
    );
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('skips the check entirely when opted out', async () => {
    const fetchSpy = mockRegistry(bumpMajor(OPENSPEC_VERSION));

    for (const [key, value] of [
      ['OPENSPEC_NO_UPDATE_CHECK', '1'],
      ['OPENSPEC_NO_UPDATE_CHECK', ''],
      ['CI', 'true'],
      ['CI', '1'],
      ['CI', 'TRUE'],
      ['NODE_ENV', 'test'],
      ['DO_NOT_TRACK', '1'],
      ['OPENSPEC_TELEMETRY', '0'],
    ] as const) {
      process.env[key] = value;
      await expect(getAvailableCliUpdate()).resolves.toBeNull();
      delete process.env[key];
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still runs when CI is set to a disabled value', async () => {
    const newer = bumpMajor(OPENSPEC_VERSION);
    mockRegistry(newer);
    process.env.CI = 'false';
    await expect(getAvailableCliUpdate()).resolves.toBe(newer);
  });
});

/**
 * Exercises the real fetch path against a local server. The mocked tests above
 * cannot catch a request the registry rejects — an Accept header that made
 * npm answer 406 on this endpoint shipped past them once already.
 */
describe('getAvailableCliUpdate against a real HTTP server', () => {
  let server: http.Server;
  let requests: Array<{ url: string; headers: http.IncomingHttpHeaders }>;
  let respond: (res: http.ServerResponse) => void;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    requests = [];
    respond = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ version: bumpMajor(OPENSPEC_VERSION) }));
    };

    server = http.createServer((req, res) => {
      requests.push({ url: req.url ?? '', headers: req.headers });
      respond(res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;

    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      npm_config_registry: process.env.npm_config_registry,
    };
    delete process.env.NODE_ENV;
    delete process.env.CI;
    process.env.npm_config_registry = `http://127.0.0.1:${port}/`;
  });

  afterEach(async () => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('requests the dist-tag endpoint and parses a real response', async () => {
    const newer = bumpMajor(OPENSPEC_VERSION);
    await expect(getAvailableCliUpdate()).resolves.toBe(newer);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/@fission-ai/openspec/latest');
  });

  it('sends no Accept header the registry answers 406 for', async () => {
    await getAvailableCliUpdate();
    // npm serves application/vnd.npm.install-v1+json only on the full
    // packument; requesting it on /latest returns 406 and silently disables
    // the whole check.
    expect(requests[0].headers.accept ?? '').not.toContain('vnd.npm.install-v1+json');
  });

  it('gives up rather than hanging when the registry stalls', async () => {
    respond = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"ver');
      // Never finishes the body; only the request timeout can end this.
    };

    const startedAt = Date.now();
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(5000);
  }, 10000);

  it('ignores a registry override that is not an http(s) URL', async () => {
    process.env.npm_config_registry = 'not-a-url';
    // Falls back to the public registry, which this offline-safe test must not
    // reach — assert on the local server seeing nothing instead.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
    expect(requests).toHaveLength(0);
  });
});

describe('displayCliUpdateNote', () => {
  function capture(run: () => void): string {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
      lines.push(String(line ?? ''));
    });
    try {
      run();
    } finally {
      spy.mockRestore();
    }
    return lines.join('\n');
  }

  it('names the global install command and the copy that answered', () => {
    const output = capture(() => displayCliUpdateNote('9.9.9'));

    expect(output).toContain(`v${OPENSPEC_VERSION} → v9.9.9`);
    expect(output).toContain('npm install -g @fission-ai/openspec@latest');
    expect(output).toContain('Then run "openspec update" again');
    expect(output).toContain(`Running from: ${getInstallDir()}`);
  });

  it('picks the upgrade command that matches how the CLI was installed', () => {
    const globalDir = path.join(GLOBAL_ROOT, 'lib', 'node_modules', '@fission-ai', 'openspec');
    const globalLines = buildCliUpdateLines('9.9.9', globalDir, PROJECT_ROOT).join('\n');
    expect(globalLines).toContain('npm install -g @fission-ai/openspec@latest');

    // Hoisted workspace layout: run from a sub-package, dependency at the root.
    const local = buildCliUpdateLines(
      '9.9.9',
      path.join(PROJECT_ROOT, 'node_modules', '@fission-ai', 'openspec'),
      path.join(PROJECT_ROOT, 'packages', 'app')
    ).join('\n');
    expect(local).toContain('npm install @fission-ai/openspec@latest');
    expect(local).not.toContain('npm install -g');
    expect(local).toContain('dependency of this project');

    const npx = buildCliUpdateLines(
      '9.9.9',
      path.join(GLOBAL_ROOT, '.npm', '_npx', 'abc123', 'node_modules', '@fission-ai', 'openspec'),
      PROJECT_ROOT
    ).join('\n');
    expect(npx).toContain('npx @fission-ai/openspec@latest update');
    expect(npx).not.toContain('npm install -g');
  });

  it('omits the install path only when it cannot be resolved', () => {
    const dir = path.join(GLOBAL_ROOT, 'openspec');
    expect(buildCliUpdateLines('9.9.9', null, '.').join('\n')).not.toContain('Running from:');
    expect(buildCliUpdateLines('9.9.9', dir, '.').join('\n')).toContain(`Running from: ${dir}`);
  });

  it('recognizes project-local installs from any directory under the project', () => {
    const local = path.join(PROJECT_ROOT, 'node_modules', '@fission-ai', 'openspec');

    expect(isProjectLocalInstall(local, PROJECT_ROOT)).toBe(true);
    // Workspace sub-package with a hoisted root node_modules.
    expect(isProjectLocalInstall(local, path.join(PROJECT_ROOT, 'packages', 'app'))).toBe(true);
    // pnpm's real path still lives under the same node_modules.
    expect(
      isProjectLocalInstall(
        path.join(PROJECT_ROOT, 'node_modules', '.pnpm', 'x', 'node_modules', 'y'),
        PROJECT_ROOT
      )
    ).toBe(true);

    expect(
      isProjectLocalInstall(
        path.join(GLOBAL_ROOT, 'lib', 'node_modules', '@fission-ai', 'openspec'),
        PROJECT_ROOT
      )
    ).toBe(false);
    expect(isProjectLocalInstall(null, PROJECT_ROOT)).toBe(false);
  });

  it('never throws when the working directory has been deleted', () => {
    const anywhere = path.join(GLOBAL_ROOT, 'node_modules', 'pkg');
    vi.spyOn(process, 'cwd').mockImplementation(() => {
      throw new Error('ENOENT: uv_cwd');
    });

    expect(() => isProjectLocalInstall(anywhere)).not.toThrow();
    expect(isProjectLocalInstall(anywhere)).toBe(false);
    expect(() => capture(() => displayCliUpdateNote('9.9.9'))).not.toThrow();
  });

  it('tells npx and dlx users to re-run rather than install globally', () => {
    // Matched on whole path segments, so a directory merely containing the
    // word (…/my-dlx-tools/…) is not mistaken for a throwaway cache.
    expect(
      isEphemeralRunnerInstall(path.join(GLOBAL_ROOT, '.npm', '_npx', 'abc', 'node_modules', 'pkg'))
    ).toBe(true);
    expect(
      isEphemeralRunnerInstall(path.join(GLOBAL_ROOT, 'pnpm', 'dlx', 'abc', 'node_modules', 'pkg'))
    ).toBe(true);
    expect(
      isEphemeralRunnerInstall(path.join(GLOBAL_ROOT, 'lib', 'node_modules', '@fission-ai', 'openspec'))
    ).toBe(false);
    expect(
      isEphemeralRunnerInstall(path.join(GLOBAL_ROOT, 'my-dlx-tools', 'node_modules', 'pkg'))
    ).toBe(false);
    expect(isEphemeralRunnerInstall(null)).toBe(false);
  });
});
