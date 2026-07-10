addEventListener('fetch', (event) => {
  event.respondWith(proxyDocs(event.request));
});

const ALLOWED_METHODS = new Set(['GET', 'HEAD']);
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-unmodified-since',
  'range',
  'user-agent',
];

async function proxyDocs(request) {
  const incoming = new URL(request.url);

  if (!isDocsRoute(incoming.pathname)) {
    return fetch(request);
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response(null, {
      status: 405,
      headers: { allow: 'GET, HEAD' },
    });
  }

  const upstream = new URL(
    incoming.pathname + incoming.search,
    'https://openspec-docs.pages.dev',
  );

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  const response = await fetch(upstream.toString(), init);
  const responseHeaders = new Headers(response.headers);
  const location = responseHeaders.get('location');

  if (location) {
    const redirected = new URL(location, upstream);
    if (redirected.hostname === 'openspec-docs.pages.dev') {
      redirected.protocol = incoming.protocol;
      redirected.host = incoming.host;
      responseHeaders.set('location', redirected.toString());
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function isDocsRoute(pathname) {
  return (
    pathname === '/docs' ||
    pathname.startsWith('/docs/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/api/search' ||
    pathname === '/api/search/' ||
    pathname === '/og/docs' ||
    pathname.startsWith('/og/docs/') ||
    pathname === '/llms.txt' ||
    pathname === '/llms-full.txt' ||
    pathname === '/llms.mdx/docs' ||
    pathname.startsWith('/llms.mdx/docs/') ||
    pathname === '/icon.svg'
  );
}
