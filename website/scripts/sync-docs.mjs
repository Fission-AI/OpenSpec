#!/usr/bin/env node
// Generate the Fumadocs content set (`content/docs/**`) from the repository's
// canonical Markdown in `../docs`. This is the mechanical mirror: docs/*.md is
// the single source of truth, and the site is a faithful, always-current view
// of it. Runs as the first step of `build`/`dev`, and on a cadence in CI.
//
// For each published doc (see docs.sync.config.mjs) it:
//   - derives the page title from the leading `# H1` (and strips that H1),
//   - derives a short description from the first paragraph,
//   - injects Fumadocs frontmatter (title / description / icon / githubSource),
//   - rewrites internal `*.md` links to their `/docs/...` routes,
//   - writes the result as a `.md` file (Fumadocs parses `.md` as plain
//     Markdown, so `<placeholders>` and `{braces}` in the docs stay literal),
//   - and emits `meta.json` sidebar ordering for the root and the reference folder.
//
// Generated files live under content/docs/ and are git-ignored — never edit
// them by hand; edit ../docs instead.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsDir, pages, sections } from '../docs.sync.config.mjs';

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = resolve(websiteRoot, docsDir);
const outRoot = join(websiteRoot, 'content', 'docs');
const gitBranch = 'main';
const gitBlobBase = 'https://github.com/Fission-AI/OpenSpec/blob';

// Map every source path (relative to docs/, normalized) -> its /docs route,
// so cross-doc `.md` links resolve to on-site pages.
const routeBySource = new Map();
for (const page of pages) {
  const normalized = posix.normalize(page.source);
  routeBySource.set(normalized, page.slug === 'index' ? '/docs' : `/docs/${page.slug}`);
}

function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Pull the first `# Heading` out of the body; return { title, rest }.
function extractTitle(markdown, fallback) {
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = /^#\s+(.+?)\s*$/.exec(lines[i]);
    if (match) {
      lines.splice(0, i + 1);
      return { title: match[1].trim(), rest: lines.join('\n').replace(/^\n+/, '') };
    }
    if (lines[i].trim() !== '') break; // content before any H1 — leave as-is
  }
  return { title: fallback, rest: markdown };
}

// First real paragraph, flattened to a one-line meta description.
function extractDescription(markdown) {
  const lines = markdown.split('\n');
  const buffer = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (buffer.length === 0) {
      if (trimmed === '') continue;
      // Skip non-paragraph openers (headings, quotes, lists, tables, fences).
      if (/^(#|>|[-*+]\s|\d+\.\s|\||```|:::)/.test(trimmed)) return '';
      buffer.push(trimmed);
    } else {
      if (trimmed === '') break;
      buffer.push(trimmed);
    }
  }
  let text = buffer.join(' ');
  text = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/[*_`]/g, '') // emphasis / code ticks
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > 200) {
    text = text.slice(0, 200).replace(/\s+\S*$/, '') + '…';
  }
  return text;
}

// Rewrite internal Markdown links that point at other docs.
// `sourceRel` is the current doc's path relative to docs/ (for resolving ../).
function rewriteLinks(markdown, sourceRel) {
  const sourceDir = posix.dirname(sourceRel);
  return markdown.replace(/\]\(([^)]+)\)/g, (whole, target) => {
    // Leave external, anchor-only, and non-.md links untouched.
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole;
    const [rawPath, hash] = target.split('#');
    if (!/\.md$/i.test(rawPath)) return whole;
    const resolved = posix.normalize(posix.join(sourceDir, rawPath)).replace(/^\.\//, '');
    const route = routeBySource.get(resolved);
    const suffix = hash ? `#${hash}` : '';
    if (route) return `](${route}${suffix})`;
    // A link we don't publish (e.g. the repo-root README) — fall back to the
    // source on GitHub, normalizing any `../` that escapes the docs/ folder.
    const repoPath = posix.normalize(`docs/${resolved}`);
    return `](${gitBlobBase}/${gitBranch}/${repoPath}${suffix})`;
  });
}

function buildFrontmatter({ title, description, icon, source }) {
  const fm = [`title: ${yamlQuote(title)}`];
  if (description) fm.push(`description: ${yamlQuote(description)}`);
  if (icon) fm.push(`icon: ${icon}`);
  fm.push(`githubSource: ${yamlQuote(`docs/${source}`)}`);
  return `---\n${fm.join('\n')}\n---\n`;
}

function generatePage(page) {
  const srcPath = join(docsRoot, page.source);
  if (!existsSync(srcPath)) {
    throw new Error(`Missing source doc: docs/${page.source} (referenced by slug "${page.slug}")`);
  }
  const raw = readFileSync(srcPath, 'utf8');
  const fallbackTitle = page.slug.split('/').pop().replace(/-/g, ' ');
  const { title, rest } = extractTitle(raw, fallbackTitle);
  const description = extractDescription(rest);
  const body = rewriteLinks(rest, posix.normalize(page.source));

  const frontmatter = buildFrontmatter({
    title,
    description,
    icon: page.icon,
    source: posix.normalize(page.source),
  });

  const outPath = join(outRoot, `${page.slug}.md`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${frontmatter}\n${body.replace(/\s*$/, '')}\n`, 'utf8');
  return outPath;
}

// meta.json for the docs root: labeled section separators + page slugs, with
// the reference folder inserted as a single entry.
function writeRootMeta() {
  const items = [];
  for (const section of sections) {
    items.push(`---${section.label}---`);
    if (section.folder) {
      items.push(section.folder);
    } else {
      for (const page of section.pages) items.push(page.slug);
    }
  }
  const meta = { title: 'Documentation', root: true, pages: items };
  writeFileSync(join(outRoot, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

// meta.json for each folder section (e.g. reference/).
function writeFolderMetas() {
  for (const section of sections) {
    if (!section.folder) continue;
    const meta = {
      title: section.label,
      ...(section.icon ? { icon: section.icon } : {}),
      pages: section.pages.map((page) => page.slug.split('/').pop()),
    };
    const dir = join(outRoot, section.folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  }
}

function main() {
  // Start clean so removed/renamed docs don't leave stale pages behind.
  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  let count = 0;
  for (const page of pages) {
    generatePage(page);
    count++;
  }
  writeRootMeta();
  writeFolderMetas();

  const rel = relative(process.cwd(), outRoot);
  console.log(`sync-docs: generated ${count} pages from ${docsDir} into ${rel}/`);
}

main();
