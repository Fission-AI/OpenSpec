# OpenSpec documentation site

The marketing and documentation site for [OpenSpec](https://github.com/Fission-AI/OpenSpec), built with [Fumadocs](https://fumadocs.dev) and [Next.js](https://nextjs.org). It is configured as a **static export**, so it deploys to Cloudflare Pages (or any static host) with no server.

> **The doc pages are generated, not authored here.** The repository's `docs/*.md` files are the single source of truth. `scripts/sync-docs.mjs` mirrors them into `content/docs/` (as `.md`) on every build, so the site stays current automatically — locally and in CI. Edit `../docs`, not `content/docs/`. Only the marketing landing page (`app/(home)/page.tsx`) is hand-authored. See [Keeping docs in sync](#keeping-docs-in-sync).

## Quick start

```bash
cd website
pnpm install
pnpm run dev      # http://localhost:3000
```

| Script | What it does |
|--------|--------------|
| `pnpm run sync:docs` | Mirror `../docs/*.md` into `content/docs/` |
| `pnpm run dev` | Sync docs, then start the dev server with hot reload |
| `pnpm run build` | Sync docs, then produce the static site in `out/` |
| `pnpm run start` | Serve the built `out/` directory locally |
| `pnpm run types:check` | Sync docs, generate types, and run `tsc --noEmit` |

`sync:docs` runs automatically inside `dev`, `build`, and `types:check`, so you rarely call it directly.

## Deploy to Cloudflare Pages

This site is a pure static export — `pnpm run build` writes plain HTML, CSS, JS, a
prebuilt search index, and `llms.txt` into `out/`. Point Cloudflare Pages at this
directory and use these settings:

| Setting | Value |
|---------|-------|
| Root directory | `website` |
| Build command | `pnpm run build` |
| Build output directory | `out` |
| Node version | `22` |

Set one environment variable so social/Open Graph image URLs resolve to your real
domain:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://openspec.dev` |

The site itself needs no server runtime. A small routing Worker exposes the
separate Pages project at `openspec.dev/docs` while the Astro landing project
continues to own the rest of `openspec.dev`. It also routes the supporting
`/_next`, search, Open Graph, icon, and `llms` paths. Its source and Wrangler
configuration live in `cloudflare/router/`.

Cloudflare's Free plan cannot override the Host header or DNS origin in an
Origin Rule, so the routing Worker proxies these paths to
`openspec-docs.pages.dev` instead. Deploy routing changes from `website/` with:

```bash
npx wrangler deploy --config cloudflare/router/wrangler.jsonc
```

### Deploy with Wrangler (optional)

```bash
pnpm run build
npx wrangler pages deploy out --project-name openspec-docs
```

## Keeping docs in sync

The doc pages are a **mechanical mirror** of the repository's `docs/*.md`. There
is nothing to hand-edit under `content/docs/` — those files are generated and
git-ignored.

**To change a page's content:** edit the corresponding file in `../docs`. The
next `pnpm run build`/`pnpm run dev` regenerates the site from it.

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
re-mirrors them before producing the static export.

## Automated deploys

The `openspec-docs` Cloudflare Pages project is connected directly to
`Fission-AI/OpenSpec`. Cloudflare rebuilds and deploys `main` when `docs/**` or
`website/**` changes, and creates preview deployments for pull requests.

Once the site changes, that's it — a `docs/*.md` edit merged to `main` re-mirrors
and redeploys with no manual step.

No GitHub Actions workflow, deployment secrets, or repository variables are
required for the Git-connected Pages project. Cloudflare reports production and
preview build statuses directly to GitHub.

### Landing page

The current [openspec.dev](https://openspec.dev) landing page remains in the
separate Astro project. The routing Worker sends only documentation-owned paths
to this Pages project, so its Fumadocs landing page at `app/(home)/page.tsx` is
built but is not served at the public root. The projects can be consolidated
later without changing the mirrored documentation workflow.

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
├── cloudflare/router/        # Worker that mounts this site on openspec.dev/docs
├── next.config.mjs          # static export config
└── source.config.ts         # Fumadocs MDX collection config
```

Built with [Fumadocs](https://fumadocs.dev).
