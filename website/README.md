# OpenSpec documentation site

The marketing and documentation site for [OpenSpec](https://github.com/Fission-AI/OpenSpec), built with [Fumadocs](https://fumadocs.dev) and [Next.js](https://nextjs.org). It is configured as a **static export**, so it deploys to Cloudflare Pages (or any static host) with no server.

> **The doc pages are generated, not authored here.** The repository's `docs/*.md` files are the single source of truth. `scripts/sync-docs.mjs` mirrors them into `content/docs/` (as `.md`) on every build, so the site stays current automatically — locally and in CI. Edit `../docs`, not `content/docs/`. Only the marketing landing page (`app/(home)/page.tsx`) is hand-authored. See [Keeping docs in sync](#keeping-docs-in-sync).

## Quick start

```bash
cd website
npm install
npm run dev      # http://localhost:3000
```

| Script | What it does |
|--------|--------------|
| `npm run sync:docs` | Mirror `../docs/*.md` into `content/docs/` |
| `npm run dev` | Sync docs, then start the dev server with hot reload |
| `npm run build` | Sync docs, then produce the static site in `out/` |
| `npm run start` | Serve the built `out/` directory locally |
| `npm run types:check` | Sync docs, generate types, and run `tsc --noEmit` |

`sync:docs` runs automatically inside `dev`, `build`, and `types:check`, so you rarely call it directly.

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

## Keeping docs in sync

The doc pages are a **mechanical mirror** of the repository's `docs/*.md`. There
is nothing to hand-edit under `content/docs/` — those files are generated and
git-ignored.

**To change a page's content:** edit the corresponding file in `../docs`. The
next `npm run build`/`npm run dev` regenerates the site from it.

**To add, remove, reorder, or re-slug a page, or change its sidebar section or
icon:** edit `docs.sync.config.mjs`. That manifest is the single place that
decides which docs are published and how they appear. `scripts/sync-docs.mjs`
then:

- derives each page's title from its leading `# H1` and a description from its
  first paragraph, and injects Fumadocs frontmatter (including `githubSource`, so
  the "edit this page" link opens the real `docs/*.md`);
- rewrites internal `*.md` links to their on-site `/docs/...` routes;
- writes each page as `.md` (Fumadocs parses `.md` as plain Markdown, so
  `<placeholders>` and `{braces}` in the docs are treated literally and never
  break the build);
- regenerates `content/docs/meta.json` and `content/docs/reference/meta.json`.

Because the docs are the source, the site cannot drift from them: every build
re-mirrors, and CI redeploys on a schedule (see below).

## Automated deploys

`.github/workflows/deploy-docs.yml` rebuilds the mirror and deploys to Cloudflare
Pages via Wrangler:

- on every push to `main` that touches `docs/**` or `website/**`,
- daily on a schedule (so docs merged elsewhere still go live),
- manually via the Actions tab,
- and as a build-only check on pull requests.

It needs two repository **secrets** — `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` — and one optional repository **variable**,
`DOCS_SITE_URL` (the site's public URL, used for OG/sitemap absolute links). The
Cloudflare Pages project is named `openspec-docs`.

## Project structure

```text
website/
├── app/                     # Next.js App Router
│   ├── (home)/page.tsx      # the marketing landing page
│   ├── docs/                # docs layout + catch-all page
│   ├── api/search/          # static search index route
│   ├── llms.txt / llms-full.txt / llms.mdx/   # machine-readable docs for AI
│   └── og/                  # generated Open Graph images per page
├── content/docs/            # ← GENERATED from ../docs (git-ignored, do not edit)
├── docs.sync.config.mjs     # which docs publish + their slug/section/icon
├── scripts/sync-docs.mjs    # mirrors ../docs/*.md -> content/docs/
├── lib/
│   ├── shared.ts            # site name, URLs, GitHub/Discord links
│   ├── source.ts            # Fumadocs content source + sidebar icons
│   └── layout.shared.tsx    # shared nav/header options
├── components/              # MDX components, search dialog, root provider
├── next.config.mjs          # static export config
└── source.config.ts         # Fumadocs MDX collection config
```

Built with [Fumadocs](https://fumadocs.dev).
