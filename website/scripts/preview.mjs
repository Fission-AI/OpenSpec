// Serve the built static site in `out/` for a local look at what Cloudflare
// Pages will publish. Backs `pnpm start`.
//
// Deliberately dependency-free. This replaced `serve`, whose transitive tree
// kept publishing advisories into a dev-only tool: four of them (brace-expansion
// x3, fast-uri) turned the Security workflow red on `main` and had to be pinned
// by hand, and none of that code ever reached the published site. A preview
// server for a static export is small enough to own outright.
//
// Routing approximates Cloudflare Pages for a Next static export:
//   /             -> out/index.html
//   /docs/cli     -> out/docs/cli.html (or out/docs/cli/index.html)
//   /docs/cli/    -> the same, so links work with or without a trailing slash
//   anything else -> out/404.html with status 404
//
// `out/_redirects` is a Cloudflare feature and is not applied here, same as
// before: the preview serves the exported files as they are.

import { createServer } from 'node:http';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(websiteRoot, 'out');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

export function contentTypeFor(filePath) {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Resolves a request path to a file inside `root`, or null when nothing matches.
 *
 * Escaping `root` is never a match: the decoded path is normalized and the
 * result is checked to still sit under `root`, so `..` segments and an
 * encoded `%2e%2e` both fall through to the 404 page. A candidate is then
 * checked again after resolving symlinks, so a link under `root` that points
 * outside it is not served either.
 */
export function resolveStaticFile(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null; // Malformed percent-encoding.
  }
  if (decoded.includes('\0')) return null;

  // Normalize in POSIX terms first: a request path is URL-shaped, so its
  // separator is `/` on every platform.
  // Trailing separators are dropped so a directory request and the `.html`
  // fallback for it build the same base path.
  const relativePath = normalize(decoded.replace(/^\/+/, '').split('/').join(sep)).replace(
    new RegExp(`\\${sep}+$`),
    ''
  );
  const base = relativePath === '' || relativePath === '.' ? root : join(root, relativePath);
  if (base !== root && !base.startsWith(root + sep)) return null;

  // Next's export writes a route as `docs/cli.html`, not `docs/cli/index.html`,
  // so both spellings have to resolve either way the link was written.
  const candidates = decoded.endsWith('/')
    ? [join(base, 'index.html'), `${base}.html`]
    : [base, join(base, 'index.html'), `${base}.html`];

  let realRoot;
  try {
    realRoot = realpathSync(root);
  } catch {
    return null;
  }
  for (const candidate of candidates) {
    if (candidate !== root && !candidate.startsWith(root + sep)) continue;
    try {
      // The lexical check above does not see symlinks; the real path does.
      const real = realpathSync(candidate);
      if (real !== realRoot && !real.startsWith(realRoot + sep)) continue;
      if (statSync(real).isFile()) return candidate;
    } catch {
      // Missing, or removed since the request arrived: not a match.
    }
  }
  return null;
}

/**
 * Streams a file, sending headers only once it is open. A file that is gone or
 * unreadable by then gets a plain error response instead of crashing the
 * server with an unhandled stream error.
 */
function sendFile(response, status, filePath) {
  const stream = createReadStream(filePath);
  stream.once('open', () => {
    response.writeHead(status, { 'content-type': contentTypeFor(filePath) });
    stream.pipe(response);
  });
  stream.once('error', () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    const failed = status === 404 ? [404, 'Not found\n'] : [500, 'Could not read file\n'];
    response.writeHead(failed[0], { 'content-type': 'text/plain; charset=utf-8' });
    response.end(failed[1]);
  });
}

/** The preview server for a built export directory. Exported for tests. */
export function createPreviewServer(root) {
  return createServer((request, response) => {
    const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
    const filePath = resolveStaticFile(root, requestPath);

    if (!filePath) {
      const notFound = resolveStaticFile(root, '/404.html');
      if (notFound) {
        sendFile(response, 404, notFound);
        return;
      }
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found\n');
      return;
    }

    sendFile(response, 200, filePath);
  });
}

function main() {
  if (!existsSync(outDir)) {
    console.error(`No build found at ${outDir}. Run "pnpm build" first.`);
    process.exit(1);
  }

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? 'localhost';

  createPreviewServer(outDir).listen(port, host, () => {
    console.log(`Serving ${outDir} at http://${host}:${port}`);
  });
}

// Importing this file for its helpers must not start a server.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
