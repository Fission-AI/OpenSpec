import { getSidebarTree } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  const { nav, ...base } = baseOptions();
  return (
    <DocsLayout
      tree={getSidebarTree()}
      {...base}
      nav={{ ...nav, mode: 'top' }}
      tabMode="navbar"
    >
      {children}
    </DocsLayout>
  );
}
