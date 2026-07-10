addEventListener('fetch', (event) => {
  event.respondWith(proxyDocs(event.request));
});

async function proxyDocs(request) {
  const incoming = new URL(request.url);
  const upstream = new URL(
    incoming.pathname + incoming.search,
    'https://openspec-docs.pages.dev',
  );

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

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
