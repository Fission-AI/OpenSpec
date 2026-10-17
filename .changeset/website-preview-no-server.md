---
'@fission-ai/openspec': patch
---

Preview the built docs site with a first-party static server instead of `serve`.
`pnpm start` in `website/` now runs `scripts/preview.mjs`, a dependency-free
server that resolves routes in a Next static export (it does not apply
`out/_redirects`). This
drops the `serve` dev dependency whose transitive tree kept publishing
advisories (brace-expansion x3, fast-uri, compression) that had to be pinned by
hand even though none of that code ever reached the published site.
