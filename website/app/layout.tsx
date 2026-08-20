import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import { appName, siteUrl } from '@/lib/shared';
import './global.css';

const inter = Inter({
  subsets: ['latin'],
});

const description =
  'OpenSpec is a lightweight agreement layer between you and your AI. Agree on what to build before any code is written. Works with 30+ AI coding assistants.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${appName} — Agree first, then build confidently`,
    template: `%s — ${appName}`,
  },
  description,
  openGraph: {
    title: `${appName} — Agree first, then build confidently`,
    description,
    siteName: appName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
