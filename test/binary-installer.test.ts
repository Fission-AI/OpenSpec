import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';

// scripts/binary/install.sh against a local stand-in for GitHub's releases
// page: its .atom feed plus /download/<tag>/<file>. The "binaries" are tiny
// scripts that print their version, so no real build is needed.
const installer = path.resolve('scripts/binary/install.sh');
const ASSETS = [
  'openspec-darwin-arm64',
  'openspec-darwin-x64',
  'openspec-linux-arm64',
  'openspec-linux-x64',
  'openspec-linux-arm64-musl',
  'openspec-linux-x64-musl',
];

describe.skipIf(process.platform === 'win32')('standalone installer (install.sh)', () => {
  let root: string;
  let server: http.Server;
  let base: string;

  /** A release whose files are attached; `complete: false` leaves out SHA256SUMS, as mid-upload. */
  function release(site: string, tag: string, options: { complete?: boolean; tamper?: boolean } = {}) {
    const dir = path.join(root, site, 'releases', 'download', tag);
    fs.mkdirSync(dir, { recursive: true });
    const sums: string[] = [];
    for (const asset of ASSETS) {
      const body = `#!/bin/sh\necho ${tag.replace(/^v/, '')}\n`;
      fs.writeFileSync(path.join(dir, asset), options.tamper ? `${body}# changed\n` : body);
      sums.push(`${createHash('sha256').update(body).digest('hex')}  ${asset}`);
    }
    if (options.complete !== false) fs.writeFileSync(path.join(dir, 'SHA256SUMS'), sums.join('\n') + '\n');
  }

  /** The releases feed, newest first, as GitHub lists it. */
  function feed(site: string, tags: string[]) {
    fs.mkdirSync(path.join(root, site), { recursive: true });
    const entries = tags.map(
      (tag) => `<entry><link rel="alternate" type="text/html" href="https://github.com/Fission-AI/OpenSpec/releases/tag/${tag}"/></entry>`
    );
    fs.writeFileSync(path.join(root, site, 'releases.atom'), `<feed>${entries.join('')}</feed>`);
  }

  function install(site: string, env: Record<string, string> = {}) {
    const home = fs.mkdtempSync(path.join(root, 'home-'));
    return new Promise<{ code: number; out: string; installed: string | null }>((resolve) => {
      execFile(
        'sh',
        [installer],
        {
          env: {
            PATH: process.env.PATH,
            HOME: home,
            OPENSPEC_RELEASES_URL: `${base}/${site}/releases`,
            OPENSPEC_INSTALL_DIR: path.join(home, 'bin'),
            ...env,
          },
        },
        (error, stdout, stderr) => {
          const target = path.join(home, 'bin', 'openspec');
          resolve({
            code: error ? Number(error.code ?? 1) : 0,
            out: stdout + stderr,
            installed: fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null,
          });
        }
      );
    });
  }

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-installer-'));
    server = http.createServer((req, res) => {
      const file = path.join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
      // Read, rather than check and then read: missing files and folders are a 404.
      let body: Buffer;
      try {
        if (!file.startsWith(root + path.sep)) throw new Error('outside the site');
        body = fs.readFileSync(file);
      } catch {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200).end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    feed('current', ['v1.2.0', 'v1.1.0']);
    release('current', 'v1.2.0');
    release('current', 'v1.1.0');

    // v1.2.0 published, its files still uploading (or the upload failed).
    feed('mid-release', ['v1.2.0', 'v1.1.0']);
    release('mid-release', 'v1.2.0', { complete: false });
    release('mid-release', 'v1.1.0');

    feed('nothing-complete', ['v1.2.0']);
    release('nothing-complete', 'v1.2.0', { complete: false });

    // Betas and the scoped tag changesets creates first are not stable v-tags.
    feed('noise', ['v1.3.0-beta.1', '%40fission-ai%2Fopenspec%401.3.0', 'v1.2.0']);
    release('noise', 'v1.3.0-beta.1');
    release('noise', 'v1.2.0');

    feed('tampered', ['v1.2.0']);
    release('tampered', 'v1.2.0', { tamper: true });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('installs the newest release when its files are all attached', async () => {
    const result = await install('current');
    expect(result.code, result.out).toBe(0);
    expect(result.installed).toContain('echo 1.2.0');
    expect(result.out).not.toContain('still being prepared');
  });

  it('keeps installing the previous release while the newest is incomplete', async () => {
    const result = await install('mid-release');
    expect(result.code, result.out).toBe(0);
    expect(result.installed).toContain('echo 1.1.0');
    expect(result.out).toContain('v1.2.0 is still being prepared; installing v1.1.0.');
  });

  it('fails clearly, pointing at npm, when no release is complete', async () => {
    const result = await install('nothing-complete');
    expect(result.code).not.toBe(0);
    expect(result.installed).toBeNull();
    expect(result.out).toContain('found no release with the standalone files');
    expect(result.out).toContain('npm install -g @fission-ai/openspec');
  });

  it('installs a pinned version even when it is not the newest', async () => {
    const result = await install('current', { OPENSPEC_VERSION: '1.1.0' });
    expect(result.code, result.out).toBe(0);
    expect(result.installed).toContain('echo 1.1.0');
  });

  it('ignores betas and scoped tags when choosing the newest release', async () => {
    const result = await install('noise');
    expect(result.code, result.out).toBe(0);
    expect(result.installed).toContain('echo 1.2.0');
  });

  it('refuses a file that does not match SHA256SUMS', async () => {
    const result = await install('tampered');
    expect(result.code).not.toBe(0);
    expect(result.installed).toBeNull();
    expect(result.out).toContain('checksum mismatch');
  });

  it.each([
    'http://localhost:80@evil.example/releases',
    'http://localhost@evil.example',
    'https://user@mirror.example.com',
    'http://user:pw@127.0.0.1@evil.example/',
    'http://127.0.0.1.evil.example/',
    'http://localhost.evil.example',
    'http://localhost:80.evil.example/',
    'http://[::1].evil.example/',
    'http://evil.example/?h=localhost',
    'ftp://localhost/',
  ])('refuses %s as a download source, before downloading anything', async (url) => {
    for (const variable of ['OPENSPEC_RELEASES_URL', 'OPENSPEC_DOWNLOAD_URL']) {
      const result = await install('current', { [variable]: url });
      expect(result.code).not.toBe(0);
      expect(result.out).toMatch(/must use https|invalid port/);
      expect(result.out).not.toContain('Downloading');
    }
  });
});
