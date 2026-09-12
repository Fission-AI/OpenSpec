import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, links } from './shared';

/** Shared layout options for the docs layout. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // The site is documentation-only, so the logo links to the docs index
      // rather than `/` (which just redirects there).
      url: '/docs',
      title: (
        <img
          src="/openspec-pixel.svg"
          alt={appName}
          className="h-3 w-auto dark:invert [#nd-sidebar_&]:ml-2"
        />
      ),
    },
    // No "Documentation" link here: the navbar layout tabs already cover it.
    links: [
      {
        text: 'Discord',
        url: links.discord,
        external: true,
        on: 'nav',
      },
    ],
    githubUrl: links.github,
  };
}
