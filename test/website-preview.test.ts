import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type PreviewModule = {
  resolveStaticFile(root: string, requestPath: string): string | null;
  contentTypeFor(filePath: string): string;
  createPreviewServer(root: string): import('http').Server;
};

// A literal relative specifier, so the runner resolves it the same way it
// resolves every other import in this suite. Building the path at runtime
// instead handed it a Windows absolute path, which is not a module specifier:
// the suite failed to load on windows-pwsh with `SyntaxError: Invalid or
// unexpected token`, and a `file://` URL did not fix it either.
// `test/pnpm-workspace-config.test.ts` pins the script's location.
const preview = (await import(
  '../website/scripts/preview.mjs'
)) as unknown as PreviewModule;

/**
 * Mirrors a Next static export: a route is written as `docs/cli.html`, and a
 * directory of the same name holds its data files but no index.html.
 */
function buildFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-preview-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<html>home</html>');
  fs.writeFileSync(path.join(root, '404.html'), '<html>missing</html>');
  fs.writeFileSync(path.join(root, 'robots.txt'), 'User-agent: *\n');
  fs.mkdirSync(path.join(root, 'docs', 'cli'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'cli.html'), '<html>cli</html>');
  fs.writeFileSync(path.join(root, 'docs', 'cli', 'data.txt'), 'data');
  fs.mkdirSync(path.join(root, 'guide'), { recursive: true });
  fs.writeFileSync(path.join(root, 'guide', 'index.html'), '<html>guide</html>');
  return root;
}

describe('website preview server', () => {
  let root: string;

  beforeAll(() => {
    root = buildFixture();
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('resolveStaticFile', () => {
    it('serves the root index', () => {
      expect(preview.resolveStaticFile(root, '/')).toBe(path.join(root, 'index.html'));
    });

    it('falls back to the exported .html file for a route', () => {
      expect(preview.resolveStaticFile(root, '/docs/cli')).toBe(
        path.join(root, 'docs', 'cli.html')
      );
    });

    it('resolves a route the same way with a trailing slash', () => {
      expect(preview.resolveStaticFile(root, '/docs/cli/')).toBe(
        path.join(root, 'docs', 'cli.html')
      );
    });

    it('prefers a directory index when one exists', () => {
      expect(preview.resolveStaticFile(root, '/guide')).toBe(
        path.join(root, 'guide', 'index.html')
      );
    });

    it('serves a file by its exact path', () => {
      expect(preview.resolveStaticFile(root, '/robots.txt')).toBe(path.join(root, 'robots.txt'));
    });

    it('returns null for a path with no match', () => {
      expect(preview.resolveStaticFile(root, '/nope')).toBeNull();
    });

    it('refuses to escape the export directory', () => {
      const outside = path.join(root, '..', 'escaped.txt');
      fs.writeFileSync(outside, 'secret');
      try {
        expect(preview.resolveStaticFile(root, '/../escaped.txt')).toBeNull();
        expect(preview.resolveStaticFile(root, '/%2e%2e/escaped.txt')).toBeNull();
        expect(preview.resolveStaticFile(root, '/docs/../../escaped.txt')).toBeNull();
      } finally {
        fs.rmSync(outside, { force: true });
      }
    });

    it('rejects malformed encoding and null bytes', () => {
      expect(preview.resolveStaticFile(root, '/%E0%A4%A')).toBeNull();
      expect(preview.resolveStaticFile(root, '/index.html%00.txt')).toBeNull();
    });
  });

  describe('contentTypeFor', () => {
    it('names the common static types', () => {
      expect(preview.contentTypeFor('a/b.html')).toBe('text/html; charset=utf-8');
      expect(preview.contentTypeFor('a/b.css')).toBe('text/css; charset=utf-8');
      expect(preview.contentTypeFor('a/b.svg')).toBe('image/svg+xml');
      expect(preview.contentTypeFor('a/b.woff2')).toBe('font/woff2');
    });

    it('falls back to a byte stream for anything else', () => {
      expect(preview.contentTypeFor('a/b.unknown')).toBe('application/octet-stream');
    });
  });

  describe('over HTTP', () => {
    it('serves pages and answers a miss with the 404 page', async () => {
      const server = preview.createPreviewServer(root);
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as AddressInfo;

      try {
        const page = await fetch(`http://127.0.0.1:${port}/docs/cli`);
        expect(page.status).toBe(200);
        expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
        expect(await page.text()).toBe('<html>cli</html>');

        const missing = await fetch(`http://127.0.0.1:${port}/nope`);
        expect(missing.status).toBe(404);
        expect(await missing.text()).toBe('<html>missing</html>');
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    });
  });
});
