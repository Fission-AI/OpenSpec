import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, links } from './shared';

/**
 * Shared layout options for both the home (marketing) layout and the docs
 * layout. Keeping nav links in one place means the header stays consistent
 * everywhere.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-semibold tracking-tight">
          Open<span className="text-fd-primary">Spec</span>
        </span>
      ),
    },
    links: [
      {
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'Discord',
        url: links.discord,
        external: true,
      },
    ],
    githubUrl: links.github,
  };
}
