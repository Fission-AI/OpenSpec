import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  // Static HTML export — the `out/` directory deploys directly to Cloudflare Pages.
  output: 'export',
  // Static export has no Image Optimization API; serve images as-is. Required
  // for the diagram images the docs pipeline embeds via next/image.
  images: { unoptimized: true },
  reactStrictMode: true,
  // This site has its own lockfile and lives inside the OpenSpec monorepo, so
  // pin the workspace root to silence Next's multi-lockfile inference warning.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withMDX(config);
