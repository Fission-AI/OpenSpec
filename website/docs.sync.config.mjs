// Single source of truth for the documentation site's content.
//
// The pages under `content/docs/` are NOT authored by hand. They are generated
// from the repository's `docs-lab/**/*.md` files by `scripts/sync-docs.mjs`
// (which runs as the first step of `npm run build` / `npm run dev`). Edit the
// docs in `../docs-lab`, and the site mirrors them automatically, both locally
// and in CI.
//
// This manifest is the only place that decides which docs are published, their
// slug/URL, and their sidebar section and order.
//
// `source` is a path relative to the repo root's `docs-lab/` directory.
// `slug`   is the page path under `/docs/`.
//
// A section's `pages` list may also hold a folder entry
// (`{ folder, label, pages }`): its pages publish under `<folder>/...` slugs
// and the sidebar shows them as a collapsible group inside the section. A page
// with slug `<folder>/index` is the folder's landing page (served at
// `/docs/<folder>`). Folder entries may nest: a folder's `pages` list may hold
// another folder entry (`folder` is always the full path, e.g.
// `schemas/spec-driven`), rendered as a collapsible group inside the group.
//
// Page descriptions come from each page's leading `> ...` blockquote, lifted
// into frontmatter by sync-docs.mjs. Don't duplicate them here.
export const docsDir = '../docs-lab';

/** Ordered sections; each becomes a labeled group in the sidebar. */
export const sections = [
  {
    label: 'Start',
    pages: [
      // The `index` slug is a router requirement (it serves /docs); the
      // authored source file is overview.md.
      { source: 'start/overview.md', slug: 'index' },
      { source: 'start/installation.md', slug: 'installation' },
      { source: 'start/setup.md', slug: 'setup' },
      { source: 'start/quickstart.md', slug: 'quickstart' },
    ],
  },
  {
    label: 'Guides',
    pages: [
      {
        folder: 'understanding',
        label: 'Understanding OpenSpec',
        defaultOpen: true,
        pages: [{ source: 'guides/concepts.md', slug: 'understanding/concepts' }],
      },
      {
        folder: 'using',
        label: 'Using OpenSpec',
        defaultOpen: true,
        pages: [
          { source: 'guides/explore.md', slug: 'using/explore' },
          { source: 'guides/review-the-plan.md', slug: 'using/review-the-plan' },
          { source: 'guides/apply.md', slug: 'using/apply' },
          { source: 'guides/change-course.md', slug: 'using/change-course' },
        ],
      },
      {
        folder: 'adopting',
        label: 'Adopting OpenSpec',
        defaultOpen: true,
        pages: [
          { source: 'guides/existing-codebases.md', slug: 'adopting/existing-codebases' },
          { source: 'guides/teams.md', slug: 'adopting/teams' },
        ],
      },
    ],
  },
  {
    label: 'Customize',
    pages: [
      { source: 'customize/overview.md', slug: 'customize' },
      { source: 'customize/profiles.md', slug: 'profiles' },
      { source: 'customize/project-config.md', slug: 'project-config' },
      { source: 'customize/schemas.md', slug: 'customize-schemas' },
    ],
  },
  {
    label: 'Multi-repo (beta)',
    pages: [{ source: 'multi-repo/stores.md', slug: 'stores' }],
  },
  {
    label: 'Reference',
    pages: [
      { source: 'reference/skills.md', slug: 'skills' },
      { source: 'reference/cli.md', slug: 'cli' },
      {
        folder: 'schemas',
        label: 'Schemas',
        pages: [
          { source: 'reference/schemas/index.md', slug: 'schemas/index' },
          { source: 'reference/schemas/schema-yaml.md', slug: 'schemas/schema-yaml' },
          { source: 'reference/schemas/spec-driven/index.md', slug: 'schemas/spec-driven' },
        ],
      },
      {
        folder: 'configuration',
        label: 'Configuration',
        pages: [
          { source: 'reference/configuration/index.md', slug: 'configuration/index' },
          { source: 'reference/configuration/config-yaml.md', slug: 'configuration/config-yaml' },
          { source: 'reference/configuration/change-metadata.md', slug: 'configuration/change-metadata' },
          { source: 'reference/configuration/config-json.md', slug: 'configuration/config-json' },
          { source: 'reference/configuration/environment-variables.md', slug: 'configuration/environment-variables' },
          { source: 'reference/configuration/stores.md', slug: 'configuration/stores' },
        ],
      },
      { source: 'reference/supported-tools.md', slug: 'supported-tools' },
      { source: 'reference/glossary.md', slug: 'glossary' },
      {
        folder: 'architecture',
        label: 'Architecture',
        pages: [
          { source: 'reference/architecture/index.md', slug: 'architecture/index' },
          { source: 'reference/architecture/workflow-runs.md', slug: 'architecture/workflow-runs' },
          { source: 'reference/architecture/design-decisions.md', slug: 'architecture/design-decisions' },
        ],
      },
    ],
  },
  {
    label: 'Help',
    pages: [
      { source: 'help/faq.md', slug: 'faq' },
      { source: 'help/troubleshooting.md', slug: 'troubleshooting' },
    ],
  },
  {
    label: 'Legacy',
    pages: [{ source: 'help/legacy/migration.md', slug: 'migration' }],
  },
];

/** Flat list of every published route (folder entries expanded recursively). */
const expandEntry = (entry) => (entry.folder ? entry.pages.flatMap(expandEntry) : [entry]);
export const pages = sections.flatMap((section) => section.pages.flatMap(expandEntry));
