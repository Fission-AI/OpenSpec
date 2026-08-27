import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { remarkMdxMermaid, remarkNpm } from 'fumadocs-core/mdx-plugins';
import { remarkGfmAlert } from './lib/remark-gfm-alert';
import { remarkFileSteps } from './lib/remark-file-steps';
import { remarkFaq } from './lib/remark-faq';
import { z } from 'zod';

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // `githubSource` is injected by scripts/sync-docs.mjs and points at the
    // canonical `docs/*.md` this page was generated from, so the "edit this
    // page" link opens the real source rather than the generated mirror.
    schema: pageSchema.extend({ githubSource: z.string().optional() }),
    postprocess: {
      includeProcessedMarkdown: {
        mdxAsPlaceholder: ['Mermaid', 'Callout', 'FileSteps', 'Accordions', 'Accordion'],
      },
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // `npm`-language fences become package-manager tabs (npm/pnpm/yarn/bun) with
    // per-tab copy buttons; persist remembers the reader's choice across blocks.
    // `remarkGfmAlert` renders GitHub-style `> [!NOTE]` blockquotes as callouts.
    remarkPlugins: [remarkMdxMermaid, remarkGfmAlert, remarkFileSteps, remarkFaq, [remarkNpm, { persist: { id: 'package-manager' } }]],
  },
});
