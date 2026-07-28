import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { createRequire } from 'module';
import {
  compareVersions,
  getAvailableCliUpdate,
  registryUrl,
  getInstallDir,
  isProjectLocalInstall,
  isEphemeralRunnerInstall,
  isNpmGlobalInstall,
  isSourceCheckout,
  detectPackageManager,
  npmGlobalRoots,
  npmPrefixFromInstallDir,
  upgradedBinPath,
  buildUpgradeCommandLines,
  canSelfUpgrade,
  shouldOfferUpgrade,
  offerCliUpgrade,
  readCliVersion,
  rerunUpdateWithUpgradedCli,
  buildCliUpdateLines,
  displayCliUpdateNote,
} from '../../src/core/version-check.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

// Resolved so the fixtures carry a drive letter on Windows, where an
// unresolved POSIX path can never prefix-match a resolved one.
const PROJECT_ROOT = path.resolve(path.join('tmp-fixture', 'proj'));
const GLOBAL_ROOT = path.resolve(path.join('tmp-fixture', 'global'));
const HOME_ROOT = path.resolve(path.join('tmp-fixture', 'home'));

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

/**
 * Every case runs against a local registry rather than a stubbed HTTP client.
 * A mocked client cannot catch a request the real registry rejects — an Accept
 * header that made npm answer 406 on this endpoint shipped past mocks once
 * already — and it cannot prove that an opt-out sent nothing.
 */
describe('getAvailableCliUpdate', () => {
  let server: http.Server;
  let requests: Array<{ url: string; method: string; headers: http.IncomingHttpHeaders }>;
  let respond: (res: http.ServerResponse) => void;
  let originalEnv: Record<string, string | undefined>;

  const ENV_KEYS = [
    'NODE_ENV',
    'CI',
    'OPENSPEC_NO_UPDATE_CHECK',
    'DO_NOT_TRACK',
    'OPENSPEC_TELEMETRY',
    'npm_config_registry',
  ] as const;

  function serveVersion(version: unknown) {
    respond = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ version }));
    };
  }

  beforeEach(async () => {
    requests = [];
    serveVersion(bumpMajor(OPENSPEC_VERSION));

    server = http.createServer((req, res) => {
      requests.push({ url: req.url ?? '', method: req.method ?? '', headers: req.headers });
      respond(res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;

    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    // The check is disabled under test/CI by design; opt back in to exercise it.
    for (const key of ENV_KEYS) delete process.env[key];
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
    vi.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reports the published version when the installed CLI is behind', async () => {
    await expect(getAvailableCliUpdate()).resolves.toBe(bumpMajor(OPENSPEC_VERSION));
  });

  it('asks the dist-tag endpoint, and never with an Accept type it answers 406 for', async () => {
    await getAvailableCliUpdate();

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe('/@fission-ai/openspec/latest');
    // npm serves application/vnd.npm.install-v1+json only on the full
    // packument; asking for it here returns 406 and silently disables the
    // whole check.
    expect(requests[0].headers.accept ?? '').not.toContain('vnd.npm.install-v1+json');
  });

  it('returns null when the installed CLI is current', async () => {
    serveVersion(OPENSPEC_VERSION);
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null when the registry is unreachable', async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('follows a redirect, as mirrors and corporate front-ends send', async () => {
    let hop = 0;
    respond = (res) => {
      hop += 1;
      if (hop === 1) {
        res.writeHead(302, { location: '/elsewhere/@fission-ai/openspec/latest' });
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ version: bumpMajor(OPENSPEC_VERSION) }));
    };

    await expect(getAvailableCliUpdate()).resolves.toBe(bumpMajor(OPENSPEC_VERSION));
    expect(requests[1].url).toBe('/elsewhere/@fission-ai/openspec/latest');
  });

  it('gives up rather than following a redirect loop', async () => {
    respond = (res) => {
      res.writeHead(302, { location: '/round/and/round' });
      res.end();
    };

    await expect(getAvailableCliUpdate()).resolves.toBeNull();
    // Bounded: the first request plus a fixed number of hops.
    expect(requests.length).toBeLessThanOrEqual(5);
  });

  it('returns null on a non-OK registry response', async () => {
    respond = (res) => {
      res.writeHead(500);
      res.end('nope');
    };
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null on a response that is not JSON', async () => {
    respond = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('<html>proxy login</html>');
    };
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('rejects a version that is not plain SemVer', async () => {
    // A hostile or broken response must never reach the terminal: this one
    // carries ANSI cursor controls that would repaint the lines around it.
    serveVersion('9.9.9[1A[2K malicious');
    await expect(getAvailableCliUpdate()).resolves.toBeNull();

    serveVersion(42);
    await expect(getAvailableCliUpdate()).resolves.toBeNull();

    serveVersion(`9.9.9-${'a'.repeat(500)}`);
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('tears down a redirected connection when the overall budget expires', async () => {
    // The redirect target trickles bytes forever: steady data keeps resetting
    // the per-request idle timeout, so only the overall budget timer can end
    // the exchange — and it must destroy the redirected request, not the
    // already-dead first hop, or the socket outlives the check.
    let hop = 0;
    let trickleClosed = false;
    respond = (res) => {
      hop += 1;
      if (hop === 1) {
        res.writeHead(302, { location: '/mirror/@fission-ai/openspec/latest' });
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"ver');
      const trickle = setInterval(() => res.write('x'), 200);
      res.on('close', () => {
        trickleClosed = true;
        clearInterval(trickle);
      });
    };

    const startedAt = Date.now();
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(5000);
    await vi.waitFor(() => expect(trickleClosed).toBe(true), { timeout: 2000 });
  }, 10000);

  it('gives up rather than hanging when the registry stalls mid-response', async () => {
    respond = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"ver');
      // Never finishes the body; only the request timeout can end this.
    };

    const startedAt = Date.now();
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(5000);
  }, 10000);

  it('sends nothing at all when opted out', async () => {
    for (const [key, value] of [
      ['OPENSPEC_NO_UPDATE_CHECK', '1'],
      ['OPENSPEC_NO_UPDATE_CHECK', ''],
      ['CI', 'true'],
      ['CI', '1'],
      ['CI', 'TRUE'],
      // An unknown value still means CI: suppressing is the safe direction,
      // and it keeps this in step with isInteractive() in utils/interactive.
      ['CI', 'yes'],
      ['NODE_ENV', 'test'],
      ['DO_NOT_TRACK', '1'],
      ['OPENSPEC_TELEMETRY', '0'],
    ] as const) {
      process.env[key] = value;
      await expect(getAvailableCliUpdate()).resolves.toBeNull();
      delete process.env[key];
    }

    expect(requests).toHaveLength(0);
  });

  it('still runs when CI is explicitly switched off', async () => {
    for (const value of ['false', '0', 'no', '']) {
      process.env.CI = value;
      await expect(getAvailableCliUpdate()).resolves.toBe(bumpMajor(OPENSPEC_VERSION));
    }
  });

  it('asks the registry npm exported, and only that', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-npmrc-'));
    try {
      // A .npmrc must not steer the request: file contents choosing an
      // outbound destination is a flow this deliberately does not have.
      fs.writeFileSync(path.join(home, '.npmrc'), 'registry=https://from-file.example.com/\n');
      vi.spyOn(os, 'homedir').mockReturnValue(home);
      vi.spyOn(process, 'cwd').mockReturnValue(home);
      delete process.env.npm_config_registry;

      expect(registryUrl()).toBe('https://registry.npmjs.org/@fission-ai/openspec/latest');

      process.env.npm_config_registry = 'https://env.example.com';
      expect(registryUrl()).toBe('https://env.example.com/@fission-ai/openspec/latest');
    } finally {
      fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it('falls back to the public registry when the override is not an http(s) URL', () => {
    // Asserted on the URL rather than by calling: the fallback would send a
    // real request to npmjs.org, which no test should depend on.
    // No '   ' case: a blank value falls through to ~/.npmrc, and this test
    // must not depend on whatever the machine has configured there.
    for (const bogus of ['not-a-url', 'file:///etc/passwd', 'javascript:alert(1)']) {
      process.env.npm_config_registry = bogus;
      expect(registryUrl()).toBe('https://registry.npmjs.org/@fission-ai/openspec/latest');
    }

    process.env.npm_config_registry = 'https://npm.internal.example.com/';
    expect(registryUrl()).toBe('https://npm.internal.example.com/@fission-ai/openspec/latest');
  });
});

/**
 * Guards the teardown, which no in-process assertion can prove: aborting a
 * request still completing its TCP handshake used to leave a ref'd connect
 * handle, so the CLI sat for ~10s after printing everything.
 */
describe('getAvailableCliUpdate against an unroutable registry', () => {
  it('lets the process exit as soon as it gives up', async () => {
    // A file:// URL, not a path: import() rejects a bare Windows path.
    const distModule = new URL('../../dist/core/version-check.js', import.meta.url).href;

    const env = { ...process.env, npm_config_registry: 'http://192.0.2.1:81/' };
    // TEST-NET-1 (RFC 5737) is routable nowhere, so the connection can only
    // end by our own teardown. Windows drops empty env vars, so unset rather
    // than blank the guards that would otherwise skip the check.
    delete env.NODE_ENV;
    delete env.CI;

    const startedAt = Date.now();
    const { code, stderr } = await new Promise<{ code: number; stderr: string }>((resolve) => {
      let stderr = '';
      const child = execFile(
        process.execPath,
        ['-e', `import(${JSON.stringify(distModule)}).then((m) => m.getAvailableCliUpdate())`],
        { env },
        () => undefined
      );
      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('close', (exitCode) => resolve({ code: exitCode ?? 0, stderr }));
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(Date.now() - startedAt).toBeLessThan(process.platform === 'win32' ? 12000 : 6000);
  }, 30000);
});

/**
 * The upgrade is offered, never performed unasked: a CLI that mutates the
 * user's global environment without consent is the wrong default.
 */
describe('offerCliUpgrade', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@inquirer/prompts');
    vi.resetModules();
  });

  it('offers only for an npm-owned global install', () => {
    // Anchored on this machine's real npm root so the case is not fictional.
    const npmGlobal = path.join(npmGlobalRoots()[0], '@fission-ai', 'openspec');
    expect(canSelfUpgrade(npmGlobal, PROJECT_ROOT)).toBe(true);

    // `npm install -g` is the only command we run, so anything npm does not
    // own would get a second copy that may not be the one on PATH.
    const notOurs = [
      path.join(HOME_ROOT, 'Library', 'pnpm', 'global', '5', 'node_modules', 'pkg'),
      path.join(HOME_ROOT, '.volta', 'tools', 'image', 'packages', 'x', 'node_modules', 'pkg'),
      path.join(HOME_ROOT, '.bun', 'install', 'global', 'node_modules', 'pkg'),
      path.join(HOME_ROOT, '.npm', '_npx', 'a', 'node_modules', 'pkg'),
      path.join(PROJECT_ROOT, 'node_modules', '@fission-ai', 'openspec'),
      null,
    ];
    for (const dir of notOurs) {
      expect(canSelfUpgrade(dir, PROJECT_ROOT)).toBe(false);
    }
  });

  it('asks only where the answer can be given and acted on', () => {
    const npmGlobal = path.join(npmGlobalRoots()[0], '@fission-ai', 'openspec');
    const base = { installDir: npmGlobal, projectPath: PROJECT_ROOT };

    expect(shouldOfferUpgrade({ ...base, interactive: true, stdoutIsTty: true })).toBe(true);

    // A prompt on a redirected stdout is a question nobody sees, and the
    // command would wait on it forever.
    expect(shouldOfferUpgrade({ ...base, interactive: true, stdoutIsTty: false })).toBe(false);
    expect(shouldOfferUpgrade({ ...base, interactive: false, stdoutIsTty: true })).toBe(false);

    // Interactive, but nothing `npm install -g` can fix.
    expect(
      shouldOfferUpgrade({
        installDir: path.join(HOME_ROOT, 'Library', 'pnpm', 'global', '5', 'node_modules', 'pkg'),
        projectPath: PROJECT_ROOT,
        interactive: true,
        stdoutIsTty: true,
      })
    ).toBe(false);
  });

  it('never offers to install over a source checkout', () => {
    const clone = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-clone-'));
    try {
      fs.mkdirSync(path.join(clone, '.git'));
      expect(isSourceCheckout(clone)).toBe(true);
      expect(canSelfUpgrade(clone, PROJECT_ROOT)).toBe(false);

      const installed = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-installed-'));
      try {
        expect(isSourceCheckout(installed)).toBe(false);
      } finally {
        fs.rmSync(installed, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
    } finally {
      fs.rmSync(clone, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
    expect(isSourceCheckout(null)).toBe(false);
  });

  it('recognizes an npm prefix that the node binary does not point at', () => {
    // Homebrew realpaths node into the Cellar, so a root derived from
    // process.execPath never matches the prefix npm actually installs into.
    // The install's own shape is what settles it.
    const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-brew-'));
    try {
      const isWindows = process.platform === 'win32';
      const installed = isWindows
        ? path.join(prefix, 'node_modules', '@fission-ai', 'openspec')
        : path.join(prefix, 'lib', 'node_modules', '@fission-ai', 'openspec');
      fs.mkdirSync(installed, { recursive: true });
      if (isWindows) {
        // npm writes the .cmd shim beside node_modules; it is what separates
        // a real prefix from a hand-copied portable tree.
        fs.writeFileSync(path.join(prefix, 'openspec.cmd'), '@echo off\n');
      } else {
        fs.mkdirSync(path.join(prefix, 'bin'), { recursive: true });
      }

      expect(npmPrefixFromInstallDir(installed)).toBe(prefix);
      // Deliberately an unrelated root, standing in for the Cellar path.
      expect(isNpmGlobalInstall(installed, [path.join(GLOBAL_ROOT, 'lib', 'node_modules')])).toBe(
        true
      );

      expect(npmPrefixFromInstallDir(path.join(HOME_ROOT, 'not', 'an', 'install'))).toBeNull();
      expect(npmPrefixFromInstallDir(null)).toBeNull();

      // The same shape with nothing npm wrote (no bin dir, no .cmd shim) is a
      // hand-copied portable tree, not an npm install — no upgrade offer.
      const portable = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-portable-'));
      try {
        const copied = isWindows
          ? path.join(portable, 'node_modules', '@fission-ai', 'openspec')
          : path.join(portable, 'lib', 'node_modules', '@fission-ai', 'openspec');
        fs.mkdirSync(copied, { recursive: true });
        expect(
          isNpmGlobalInstall(copied, [path.join(GLOBAL_ROOT, 'lib', 'node_modules')])
        ).toBe(false);
      } finally {
        fs.rmSync(portable, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
    } finally {
      fs.rmSync(prefix, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it('does not mistake another manager\'s npm-shaped layout for an npm install', () => {
    // volta nests a whole node install, so its packages sit in exactly the
    // <prefix>/lib/node_modules shape npm uses.
    const volta = path.join(
      HOME_ROOT,
      '.volta',
      'tools',
      'image',
      'node',
      '22.0.0',
      'lib',
      'node_modules',
      '@fission-ai',
      'openspec'
    );

    expect(isNpmGlobalInstall(volta, [path.join(GLOBAL_ROOT, 'lib', 'node_modules')])).toBe(false);
    expect(canSelfUpgrade(volta, PROJECT_ROOT)).toBe(false);
    // And the printed command matches the manager that does own it.
    expect(buildUpgradeCommandLines(volta, PROJECT_ROOT)[0]).toContain('volta install');
  });

  it('does not read a package manager into an incidental directory name', () => {
    // A user directory called "pnpm", or a project called "yarn", is not a
    // global install of either.
    expect(detectPackageManager('/home/pnpm/npm-global/lib/node_modules/pkg')).toBe('npm');
    expect(detectPackageManager(path.join(HOME_ROOT, 'projects', 'yarn', 'node_modules', 'pkg'))).toBe(
      'npm'
    );
    // The real layouts still resolve.
    expect(detectPackageManager(path.join(HOME_ROOT, 'Library', 'pnpm', 'global', '5', 'pkg'))).toBe(
      'pnpm'
    );
    expect(
      detectPackageManager(path.join(HOME_ROOT, '.config', 'yarn', 'global', 'node_modules', 'pkg'))
    ).toBe('yarn');
  });

  it('recognizes npm global roots without shelling out', () => {
    const roots = [path.join(GLOBAL_ROOT, 'lib', 'node_modules')];

    expect(isNpmGlobalInstall(path.join(roots[0], '@fission-ai', 'openspec'), roots)).toBe(true);
    expect(isNpmGlobalInstall(path.join(GLOBAL_ROOT, 'lib', 'node_modules'), roots)).toBe(false);
    expect(isNpmGlobalInstall(path.join(HOME_ROOT, 'elsewhere', 'pkg'), roots)).toBe(false);
    expect(isNpmGlobalInstall(null, roots)).toBe(false);
    // A sibling whose name merely starts with the root.
    expect(isNpmGlobalInstall(`${roots[0]}-other${path.sep}pkg`, roots)).toBe(false);
  });

  it('names the command the owning package manager understands', () => {
    const cases: Array<[string, string]> = [
      [path.join(HOME_ROOT, 'Library', 'pnpm', 'global', '5', 'node_modules', 'pkg'), 'pnpm add -g'],
      [path.join(HOME_ROOT, '.bun', 'install', 'global', 'node_modules', 'pkg'), 'bun add -g'],
      [path.join(HOME_ROOT, '.volta', 'tools', 'image', 'packages', 'x', 'pkg'), 'volta install'],
      [path.join(HOME_ROOT, '.config', 'yarn', 'global', 'node_modules', 'pkg'), 'yarn global add'],
      [path.join(GLOBAL_ROOT, 'lib', 'node_modules', 'pkg'), 'npm install -g'],
    ];

    for (const [dir, expected] of cases) {
      expect(buildUpgradeCommandLines(dir, PROJECT_ROOT)[0]).toContain(expected);
    }

    expect(detectPackageManager(null)).toBe('npm');
  });

  it('does not let a user or project directory named after a manager steal the install', () => {
    // A person named volta with a plain npm prefix in their home directory:
    // the undotted segment alone must not turn the hint into `volta install`.
    expect(detectPackageManager('/home/volta/.npm-global/lib/node_modules/pkg')).toBe('npm');
    expect(detectPackageManager('/srv/volta/apps/node_modules/pkg')).toBe('npm');
  });

  it('recognizes the Windows spellings of those install directories', () => {
    // %LOCALAPPDATA%\Volta, \Yarn\Data, \pnpm-cache — capitalized, undotted,
    // and nothing like their POSIX equivalents.
    expect(detectPackageManager('C:\\Users\\me\\AppData\\Local\\Volta\\tools\\image\\pkg')).toBe(
      'volta'
    );
    expect(detectPackageManager('C:\\Users\\me\\AppData\\Local\\pnpm\\global\\5\\pkg')).toBe('pnpm');
    expect(detectPackageManager('C:\\Users\\me\\AppData\\Local\\Yarn\\Data\\global\\pkg')).toBe(
      'yarn'
    );
    expect(isEphemeralRunnerInstall('C:\\Users\\me\\AppData\\Local\\pnpm-cache\\dlx\\a\\pkg')).toBe(
      true
    );
  });

  it('asks before touching anything, and does nothing when declined', async () => {
    const confirm = vi.fn(async () => false);
    vi.doMock('@inquirer/prompts', () => ({ confirm }));
    const { offerCliUpgrade: offer } = await import('../../src/core/version-check.js?decline');

    await expect(offer('9.9.9')).resolves.toBe('declined');
    // Proves the prompt drove the result rather than an unrelated failure.
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatchObject({ message: expect.stringContaining('9.9.9') });
  });

  it('reports Ctrl-C as cancelled, so the caller can stop instead of prompting on', async () => {
    const cancellation = Object.assign(new Error('User force closed the prompt'), {
      name: 'ExitPromptError',
    });
    const confirm = vi.fn(async () => {
      throw cancellation;
    });
    vi.doMock('@inquirer/prompts', () => ({ confirm }));
    const { offerCliUpgrade: offer } = await import('../../src/core/version-check.js?ctrlc');

    await expect(offer('9.9.9')).resolves.toBe('cancelled');
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('treats an unexpected prompt failure as a decline rather than a crash', async () => {
    const confirm = vi.fn(async () => {
      throw new Error('tty exploded');
    });
    vi.doMock('@inquirer/prompts', () => ({ confirm }));
    const { offerCliUpgrade: offer } = await import('../../src/core/version-check.js?boom');

    await expect(offer('9.9.9')).resolves.toBe('declined');
  });

  it('reads the version line, not the first version-shaped token in a banner', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-banner-'));
    try {
      const isWindows = process.platform === 'win32';
      const bin = path.join(dir, isWindows ? 'banner.cmd' : 'banner.sh');
      // A wrapper that greets before answering: taking the first match would
      // report the Node version as OpenSpec's.
      fs.writeFileSync(
        bin,
        isWindows
          ? '@echo Node.js v25.8.1 ^| OpenSpec\r\n@echo 1.7.0\r\n'
          : '#!/bin/sh\necho "Node.js v25.8.1 | OpenSpec"\necho "1.7.0"\n'
      );
      fs.chmodSync(bin, 0o755);

      await expect(readCliVersion(bin)).resolves.toBe('1.7.0');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 30000);

  it('reads a version back from a binary rather than trusting an exit code', async () => {
    // `npm install -g` exits 0 even when it installed nothing, so the version
    // has to be read from whatever now answers.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-bin-'));
    try {
      const isWindows = process.platform === 'win32';
      const bin = path.join(dir, isWindows ? 'fake.cmd' : 'fake.sh');
      fs.writeFileSync(bin, isWindows ? '@echo 9.9.9\r\n' : '#!/bin/sh\necho 9.9.9\n');
      fs.chmodSync(bin, 0o755);

      await expect(readCliVersion(bin)).resolves.toBe('9.9.9');
      await expect(readCliVersion(path.join(dir, 'does-not-exist'))).resolves.toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 20000);
});

/**
 * The re-run stands in for the command the user typed, so what it forwards and
 * what it reports are both load-bearing.
 */
describe('rerunUpdateWithUpgradedCli', () => {
  let dir: string;
  const isWindows = process.platform === 'win32';

  function writeFakeCli(body: string): string {
    const bin = path.join(dir, isWindows ? 'openspec.cmd' : 'openspec');
    fs.writeFileSync(bin, body);
    fs.chmodSync(bin, 0o755);
    return bin;
  }

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-rerun-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('forwards --force and separates the path from any flag-shaped value', async () => {
    const log = path.join(dir, 'args.txt');
    const bin = writeFakeCli(
      isWindows
        ? `@echo %* > "${log}"\r\n@exit /b 0\r\n`
        : `#!/bin/sh\necho "$@" > "${log}"\nexit 0\n`
    );

    await expect(
      rerunUpdateWithUpgradedCli('--weird-path', { force: true, binPath: bin })
    ).resolves.toBe(0);

    // cmd.exe echoes each argument quoted, so compare on tokens rather than
    // on the raw line.
    const args = fs
      .readFileSync(log, 'utf-8')
      .trim()
      .split(/\s+/)
      .map((token) => token.replace(/^"|"$/g, ''));

    expect(args).toContain('--force');
    // Without the separator the path would be parsed as an option.
    expect(args.indexOf('--')).toBeGreaterThan(-1);
    expect(args[args.indexOf('--') + 1]).toBe('--weird-path');
  }, 30000);

  it('disables the check in the child, so a stale PATH cannot loop forever', async () => {
    const log = path.join(dir, 'env.txt');
    const bin = writeFakeCli(
      isWindows
        ? `@echo %OPENSPEC_NO_UPDATE_CHECK% > "${log}"\r\n@exit /b 0\r\n`
        : `#!/bin/sh\necho "$OPENSPEC_NO_UPDATE_CHECK" > "${log}"\nexit 0\n`
    );

    await rerunUpdateWithUpgradedCli('.', { binPath: bin });

    // Without this, a PATH still resolving to the old binary would prompt
    // again, and again.
    expect(fs.readFileSync(log, 'utf-8').trim()).toBe('1');
  }, 30000);

  it('passes the child exit code through instead of claiming success', async () => {
    const bin = writeFakeCli(isWindows ? '@exit /b 7\r\n' : '#!/bin/sh\nexit 7\n');

    await expect(rerunUpdateWithUpgradedCli('.', { binPath: bin })).resolves.toBe(7);
  }, 30000);

  it('reports a failure when there is no upgraded CLI to hand off to', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
      lines.push(String(line ?? ''));
    });

    await expect(
      rerunUpdateWithUpgradedCli('.', { binPath: path.join(dir, 'not-installed') })
    ).resolves.toBe(1);
    expect(lines.join('\n')).toContain('were not regenerated');
  }, 30000);
});

describe('displayCliUpdateNote', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    // No npm command: the project's own package manager owns its lockfile.
    expect(local).toContain('Update the @fission-ai/openspec dependency in this project.');
    expect(local).not.toContain('npm install');

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
    // A sibling directory whose name merely starts with the project path.
    expect(
      isProjectLocalInstall(
        `${PROJECT_ROOT}-other${path.sep}node_modules${path.sep}pkg`,
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

  it('does not tell npx users to run an update they were just handed', () => {
    // `npx …@latest update` IS the update, so a "then run it again" line
    // would be nonsense.
    const npx = buildUpgradeCommandLines(
      path.join(HOME_ROOT, '.npm', '_npx', 'abc', 'node_modules', 'pkg'),
      PROJECT_ROOT
    );
    expect(npx).toEqual(['  npx @fission-ai/openspec@latest update']);

    // Every other flavor does need the second pass.
    expect(buildUpgradeCommandLines(path.join(GLOBAL_ROOT, 'lib', 'node_modules', 'pkg'), PROJECT_ROOT))
      .toContain('  Then run "openspec update" again to pick up new workflows.');
  });

  it('finds the binary npm installs beside its global root', () => {
    const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-prefix-'));
    try {
      const isWindows = process.platform === 'win32';
      // npm's layout: <prefix>/lib/node_modules on POSIX, <prefix>/node_modules
      // on Windows, with the shim one level up from the root's parent.
      const root = isWindows
        ? path.join(prefix, 'node_modules')
        : path.join(prefix, 'lib', 'node_modules');
      fs.mkdirSync(root, { recursive: true });

      // Nothing installed yet: nothing to hand off to.
      expect(upgradedBinPath([root])).toBeNull();

      const bin = isWindows
        ? path.join(prefix, 'openspec.cmd')
        : path.join(prefix, 'bin', 'openspec');
      fs.mkdirSync(path.dirname(bin), { recursive: true });
      fs.writeFileSync(bin, '');

      expect(upgradedBinPath([root])).toBe(bin);
    } finally {
      fs.rmSync(prefix, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it('tells npx and dlx users to re-run rather than install globally', () => {
    // Matched on whole path segments, and "dlx" only under its package
    // manager's own cache — a user directory named "dlx" is not a throwaway one.
    expect(
      isEphemeralRunnerInstall(path.join(GLOBAL_ROOT, '.npm', '_npx', 'abc', 'node_modules', 'pkg'))
    ).toBe(true);
    expect(
      isEphemeralRunnerInstall(path.join(GLOBAL_ROOT, 'pnpm', 'dlx', 'abc', 'node_modules', 'pkg'))
    ).toBe(true);
    expect(
      isEphemeralRunnerInstall(
        path.join(GLOBAL_ROOT, 'lib', 'node_modules', '@fission-ai', 'openspec')
      )
    ).toBe(false);
    expect(
      isEphemeralRunnerInstall(path.join(path.sep, 'Users', 'dlx', 'app', 'node_modules', 'pkg'))
    ).toBe(false);
    expect(isEphemeralRunnerInstall(null)).toBe(false);
  });
});
