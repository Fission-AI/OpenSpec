# OpenSpec documentation site

The marketing and documentation site for [OpenSpec](https://github.com/Fission-AI/OpenSpec), built with [Fumadocs](https://fumadocs.dev) and [Next.js](https://nextjs.org). It is configured as a **static export**, so it deploys to Cloudflare Pages (or any static host) with no server.

## Quick start

```bash
cd website
npm install
npm run dev      # http://localhost:3000
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Produce the static site in `out/` |
| `npm run start` | Serve the built `out/` directory locally |
| `npm run types:check` | Generate types and run `tsc --noEmit` |

## Deploy to Cloudflare Pages

This site is a pure static export — `npm run build` writes plain HTML, CSS, JS, a
prebuilt search index, and `llms.txt` into `out/`. Point Cloudflare Pages at this
directory and use these settings:

| Setting | Value |
|---------|-------|
| Root directory | `website` |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | `20.19.0` or higher (set `NODE_VERSION` if needed) |

Set one environment variable so social/Open Graph image URLs resolve to your real
domain:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://your-docs-domain.com` |

That's it. No Workers, adapters, or server runtime are required. (If you later
want server-side rendering on Cloudflare Workers instead, swap `output: 'export'`
in `next.config.mjs` for the `@opennextjs/cloudflare` adapter — but the static
path above is the simplest and is what this site is tuned for.)

### Deploy with Wrangler (optional)

```bash
npm run build
npx wrangler pages deploy out --project-name openspec-docs
```

## Editing the docs

All content lives in `content/docs/` as MDX. To add a page:

1. Create `content/docs/my-page.mdx` with frontmatter:

   ```mdx
   ---
   title: My Page
   description: One-line summary used for search and previews.
   icon: Sparkles      # optional: any lucide-react icon name
   ---

   Your content here.
   ```

2. Add its slug to the `pages` array in `content/docs/meta.json` to place it in
   the sidebar. Use `"---Section name---"` entries to add section separators.

MDX pages can use these components without importing them: `Callout`, `Card`,
`Cards`, `Tabs`/`Tab`, `Steps`/`Step`, and `Accordions`/`Accordion`.

## Project structure

```text
website/
├── app/                     # Next.js App Router
│   ├── (home)/page.tsx      # the marketing landing page
│   ├── docs/                # docs layout + catch-all page
│   ├── api/search/          # static search index route
│   ├── llms.txt / llms-full.txt / llms.mdx/   # machine-readable docs for AI
│   └── og/                  # generated Open Graph images per page
├── content/docs/            # ← all documentation MDX lives here
├── lib/
│   ├── shared.ts            # site name, URLs, GitHub/Discord links
│   ├── source.ts            # Fumadocs content source + sidebar icons
│   └── layout.shared.tsx    # shared nav/header options
├── components/              # MDX components, search dialog, root provider
├── next.config.mjs          # static export config
└── source.config.ts         # Fumadocs MDX collection config
```

Built with [Fumadocs](https://fumadocs.dev).
