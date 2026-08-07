export const appName = 'OpenSpec';

// Absolute base URL of the deployed site, used to resolve Open Graph / social
// image URLs. Set NEXT_PUBLIC_SITE_URL in your deploy environment (e.g. on
// Cloudflare Pages) to your real domain. The fallback covers local builds and
// CI runs where the variable is unset or empty (an empty string would otherwise
// crash `new URL()` at build time).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://openspec.dev';

export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// OpenSpec source repository, used for "edit this page" and GitHub links.
export const gitConfig = {
  user: 'Fission-AI',
  repo: 'OpenSpec',
  branch: 'main',
};

export const links = {
  github: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  discord: 'https://discord.gg/YctCnvvshC',
  npm: 'https://www.npmjs.com/package/@fission-ai/openspec',
  x: 'https://x.com/0xTab',
};
