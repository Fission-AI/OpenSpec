// Single source of truth for the documentation site's content.
//
// The pages under `content/docs/` are NOT authored by hand. They are generated
// from the repository's `docs/*.md` files by `scripts/sync-docs.mjs` (which runs
// as the first step of `npm run build` / `npm run dev`). Edit the docs in
// `../docs`, and the site mirrors them automatically — locally and in CI.
//
// This manifest is the only place that decides which docs are published, their
// slug/URL, their sidebar section and order, and their sidebar icon.
//
// `source` is a path relative to the repo root's `docs/` directory.
// `slug`   is the page path under `/docs/` (may contain a folder, e.g. reference/cli).
// `icon`   is any lucide-react icon name (unknown names simply render no icon).

export const docsDir = '../docs';

/** Ordered sections; each becomes a labeled group in the sidebar. */
export const sections = [
  {
    label: 'Start here',
    pages: [
      { source: 'README.md', slug: 'index', icon: 'Sparkles' },
      { source: 'installation.md', slug: 'installation', icon: 'Download' },
      { source: 'getting-started.md', slug: 'getting-started', icon: 'Rocket' },
      { source: 'how-commands-work.md', slug: 'how-commands-work', icon: 'Terminal' },
    ],
  },
  {
    label: 'Understand it',
    pages: [
      { source: 'overview.md', slug: 'overview', icon: 'Map' },
      { source: 'concepts.md', slug: 'core-concepts', icon: 'Boxes' },
      { source: 'workflows.md', slug: 'the-workflow', icon: 'Workflow' },
      { source: 'opsx.md', slug: 'opsx', icon: 'GitBranch' },
      { source: 'explore.md', slug: 'explore', icon: 'Compass' },
    ],
  },
  {
    label: 'Guides',
    pages: [
      { source: 'examples.md', slug: 'examples', icon: 'ListChecks' },
      { source: 'writing-specs.md', slug: 'writing-specs', icon: 'PenLine' },
      { source: 'reviewing-changes.md', slug: 'reviewing-changes', icon: 'SearchCheck' },
      { source: 'existing-projects.md', slug: 'existing-projects', icon: 'FolderGit2' },
      { source: 'editing-changes.md', slug: 'editing-changes', icon: 'Pencil' },
      { source: 'customization.md', slug: 'customization', icon: 'Settings2' },
      { source: 'multi-language.md', slug: 'multi-language', icon: 'Languages' },
      { source: 'team-workflow.md', slug: 'team-workflow', icon: 'GitPullRequest' },
      { source: 'stores-beta/user-guide.md', slug: 'stores', icon: 'Store' },
    ],
  },
  {
    // Rendered as a collapsible folder (its own meta.json) rather than a label.
    label: 'Reference',
    folder: 'reference',
    icon: 'BookMarked',
    pages: [
      { source: 'commands.md', slug: 'reference/slash-commands', icon: 'SquareSlash' },
      { source: 'cli.md', slug: 'reference/cli', icon: 'SquareTerminal' },
      { source: 'supported-tools.md', slug: 'reference/supported-tools', icon: 'Wrench' },
      { source: 'agent-contract.md', slug: 'reference/agents', icon: 'Bot' },
    ],
  },
  {
    label: 'Help',
    pages: [
      { source: 'faq.md', slug: 'faq', icon: 'CircleHelp' },
      { source: 'troubleshooting.md', slug: 'troubleshooting', icon: 'LifeBuoy' },
      { source: 'glossary.md', slug: 'glossary', icon: 'BookA' },
      { source: 'migration-guide.md', slug: 'migration-guide', icon: 'ArrowLeftRight' },
    ],
  },
];

/** Flat list of every published page, in sidebar order. */
export const pages = sections.flatMap((section) => section.pages);
