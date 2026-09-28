// This site is documentation-only; the marketing/landing page lives in a
// separate repo. The static export can't issue HTTP redirects itself, so
// Cloudflare Pages handles `/` via public/_redirects; this meta-refresh page
// is the fallback for local previews and hosts that ignore _redirects.
export default function Home() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/docs" />
      <p>
        Redirecting to <a href="/docs">documentation</a>…
      </p>
    </>
  );
}
