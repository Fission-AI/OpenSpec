---
'@fission-ai/openspec': patch
---

Preview the built docs site with a first-party static server instead of `serve`.
`pnpm start` in `website/` now runs `scripts/preview.mjs`, a dependency-free
server that mirrors Cloudflare Pages routing for a Next static export. This
drops the `serve` dev dependency whose transitive tree kept publishing
advisories (brace-expansion x3, fast-uri, compression) that had to be pinned by
hand even though none of that code ever reached the published site.
