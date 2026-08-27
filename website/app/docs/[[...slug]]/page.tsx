import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';

// TEMPORARY (2026-08-21): the Overview page (the docs index, served at /docs)
// is pulled from docs.sync.config.mjs while it's rewritten, so there is no
// index page. Cloudflare redirects /docs via public/_redirects; this
// meta-refresh page is the fallback for local dev and the static export (which
// can't issue HTTP redirects), mirroring app/page.tsx. Remove this constant,
// the two uses below, and the `{ slug: [] }` param once the Overview is back.
const TEMP_DOCS_INDEX_REDIRECT = '/docs/installation';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    if (!params.slug?.length) {
      return (
        <>
          <meta httpEquiv="refresh" content={`0; url=${TEMP_DOCS_INDEX_REDIRECT}`} />
          <p>
            Redirecting to <a href={TEMP_DOCS_INDEX_REDIRECT}>installation</a>…
          </p>
        </>
      );
    }
    notFound();
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      breadcrumb={{ enabled: true, includeRoot: false, includePage: false }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${
            page.data.githubSource ?? `website/content/docs/${page.path}`
          }`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params: { slug: string[] }[] = source.generateParams();
  // TEMPORARY: emit /docs even without an index page so the static export
  // carries the meta-refresh fallback above.
  if (!params.some((p) => !p.slug?.length)) params.push({ slug: [] });
  return params;
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    // TEMPORARY: metadata for the /docs redirect fallback (see Page above).
    if (!params.slug?.length) return { title: 'Documentation', robots: { index: false } };
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
