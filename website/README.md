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
re-mirrors, and CI redeploys on a schedule (see below).

## Automated deploys

`.github/workflows/deploy-docs.yml` rebuilds the mirror and deploys the static
export to Cloudflare Pages via Wrangler:

- on every push to `main` that touches `docs/**` or `website/**`,
- daily on a schedule (so docs merged elsewhere still go live),
- manually via the Actions tab,
- and as a build-only check on pull requests (never deploys).

Once the site changes, that's it — a `docs/*.md` edit merged to `main` re-mirrors
and redeploys with no manual step.

### One-time deploy setup (maintainer)

The workflow is ready, but auto-deploy stays dormant until these three are done.
Until then, docs still mirror correctly on build — they just don't reach
Cloudflare on their own.

1. **Create the Cloudflare Pages project** named `openspec-docs`, with its
   production branch set to `main`. Once, via the dashboard or:

   ```bash
   npx wrangler pages project create openspec-docs --production-branch main
   ```

   (Non-interactive CI can't create it on the fly, so this must exist first.)

2. **Add two repository secrets** (Settings → Secrets and variables → Actions):

   | Secret | Where to get it |
   |--------|-----------------|
   | `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → "Edit Cloudflare Pages" template |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Account ID |

   Optional: set a repository **variable** `DOCS_SITE_URL` to the site's public URL
   (used for Open Graph / sitemap absolute links). Without it, the build falls
   back to `https://openspec.dev`, so this is not required.

3. **Merge this to `main`.** GitHub Actions only runs the `push`-to-`main` and
   scheduled triggers from workflows on the default branch, so the automation
   activates when the PR merges.

To smoke-test before merging: run the workflow by hand from the **Actions** tab
(**workflow_dispatch**) once the project and secrets exist.

### Landing page — a maintainer decision

The current [openspec.dev](https://openspec.dev) landing page is a separate Astro
site. This site ships its own Fumadocs landing page at `app/(home)/page.tsx`
(the only hand-authored page here; everything under `/docs` is mirrored). Whether
to keep this landing page, port the Astro one into it, or point Pages only at
`/docs` is a maintainer call — nothing else in this pipeline depends on it.

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
