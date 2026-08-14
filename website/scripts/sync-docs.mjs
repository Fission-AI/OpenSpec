#!/usr/bin/env node
// Generate the Fumadocs content set (`content/docs/**`) as a mechanical mirror
// of the repository's `docs-lab/**/*.md` files.
// Runs as the first step of `build`/`dev`, and on a cadence in CI.
//
// For each published doc (see docs.sync.config.mjs) it:
//   - derives the page title from the leading `# H1` (and strips that H1),
//   - lifts the leading `> ...` blockquote into the frontmatter description,
//   - injects Fumadocs frontmatter (title / description / githubSource),
//   - rewrites internal `*.md` links to their `/docs/...` routes,
//   - writes the result as a `.md` file (Fumadocs parses `.md` as plain
//     Markdown, so `<placeholders>` and `{braces}` in the docs stay literal),
//   - and emits `meta.json` sidebar ordering.
//
// Generated files live under content/docs/ and are git-ignored — never edit
// them by hand; edit ../docs-lab instead.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsDir, pages, sections } from '../docs.sync.config.mjs';

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(websiteRoot, 'content', 'docs');
const sourceRoot = resolve(websiteRoot, docsDir);
// The source directory's path from the repo root (e.g. `docs-lab`), for
// GitHub links.
const repoDocsDir = posix.normalize(docsDir).replace(/^\.\.\//, '');
const gitBranch = 'main';
const gitBlobBase = 'https://github.com/Fission-AI/OpenSpec/blob';

// Map every source file -> its /docs route, so cross-doc Markdown links
// resolve.
const routeBySource = new Map();
for (const page of pages) {
  const key = posix.normalize(page.source);
  if (!routeBySource.has(key)) {
    // An `index` slug (root or `<folder>/index`) serves its parent path.
    const route = page.slug === 'index' ? '' : `/${page.slug.replace(/\/index$/, '')}`;
    routeBySource.set(key, `/docs${route}`);
  }
}

// Every output file goes through here. Skipping identical writes keeps mtimes
// stable so the fumadocs-mdx dev watcher only rebuilds pages that changed;
// `written` records the full expected output set for stale-file cleanup.
const written = new Set();
function writeOutputFile(path, content) {
  written.add(path);
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function removeStaleOutputs(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      removeStaleOutputs(path);
      if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
    } else if (!written.has(path)) {
      rmSync(path);
    }
  }
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

// Authoring convention: a `> ...` blockquote directly after the H1 is the
// page's one-line description. Lift it into frontmatter and strip it from
// the body so the sentence doesn't render twice (Fumadocs already shows the
// description under the title).
function extractLeadingQuote(markdown) {
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length || !lines[i].startsWith('>')) return { quote: '', rest: markdown };
  const buffer = [];
  while (i < lines.length && lines[i].startsWith('>')) {
    buffer.push(lines[i].replace(/^>\s?/, '').trim());
    i++;
  }
  const quote = buffer.join(' ').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  return { quote, rest: lines.slice(i).join('\n').replace(/^\n+/, '') };
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
// `sourceRel` is the current doc's path relative to the source directory.
function rewriteLinks(markdown, sourceRel) {
  const sourceFileDir = posix.dirname(sourceRel);
  return markdown.replace(/\]\(([^)]+)\)/g, (whole, target) => {
    // Leave external, anchor-only, and non-.md links untouched.
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole;
    const [rawPath, hash] = target.split('#');
    if (!/\.md$/i.test(rawPath)) return whole;
    const resolved = posix.normalize(posix.join(sourceFileDir, rawPath)).replace(/^\.\//, '');
    const route = routeBySource.get(resolved);
    const suffix = hash ? `#${hash}` : '';
    if (route) return `](${route}${suffix})`;
    // A link we don't publish (e.g. the repo-root README) — fall back to the
    // source on GitHub, normalizing any `../` that escapes the source folder.
    const repoPath = posix.join(repoDocsDir, resolved);
    return `](${gitBlobBase}/${gitBranch}/${repoPath}${suffix})`;
  });
}

function buildFrontmatter({ title, description, repoSource }) {
  const fm = [`title: ${yamlQuote(title)}`];
  if (description) fm.push(`description: ${yamlQuote(description)}`);
  fm.push(`githubSource: ${yamlQuote(repoSource)}`);
  return `---\n${fm.join('\n')}\n---\n`;
}

function generatePage(page) {
  const repoSource = posix.join(repoDocsDir, posix.normalize(page.source));
  const srcPath = join(sourceRoot, page.source);
  if (!existsSync(srcPath)) {
    throw new Error(`Missing source doc: ${repoSource} (referenced by slug "${page.slug}")`);
  }
  const raw = readFileSync(srcPath, 'utf8');
  const fallbackTitle = page.slug.split('/').pop().replace(/-/g, ' ');
  const { title, rest } = extractTitle(raw, fallbackTitle);
  const { quote, rest: dequoted } = extractLeadingQuote(rest);
  const description = page.description ?? (quote || extractDescription(dequoted));
  const body = rewriteLinks(dequoted, posix.normalize(page.source));

  const frontmatter = buildFrontmatter({
    title,
    description,
    repoSource,
  });

  const outPath = join(outRoot, `${page.slug}.md`);
  writeOutputFile(outPath, `${frontmatter}\n${body.replace(/\s*$/, '')}\n`);
  return outPath;
}

// meta.json for the docs root: labeled section separators + page slugs. A
// folder entry contributes its folder name; the folder's own meta.json
// (written below) labels it and orders its pages.
function writeRootMeta() {
  const items = [];
  for (const section of sections) {
    items.push(`---${section.label}---`);
    for (const entry of section.pages) items.push(entry.folder ?? entry.slug);
  }
  const meta = { title: 'Documentation', root: true, pages: items };
  writeOutputFile(join(outRoot, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
}

// meta.json for each folder entry: the sidebar renders it as a collapsible
// group (collapsed by default) labeled with the entry's `label`. Folder
// entries nest, so recurse into each folder's pages; a nested folder shows up
// in its parent's `pages` list by its base name.
function writeFolderMetasFor(entries) {
  for (const entry of entries) {
    if (!entry.folder) continue;
    const meta = {
      title: entry.label,
      defaultOpen: entry.defaultOpen ?? false,
      pages: entry.pages.map((page) => posix.basename(page.folder ?? page.slug)),
    };
    writeOutputFile(
      join(outRoot, entry.folder, 'meta.json'),
      `${JSON.stringify(meta, null, 2)}\n`
    );
    writeFolderMetasFor(entry.pages);
  }
}

function writeFolderMetas() {
  for (const section of sections) writeFolderMetasFor(section.pages);
}

// Diagram images: docs-lab/diagrams/*.png|svg is copied to public/diagrams/
// so the markdown can embed them as /diagrams/<name>.png.
function copyDiagramAssets() {
  const srcDir = join(sourceRoot, 'diagrams');
  if (!existsSync(srcDir)) return 0;
  const outDir = join(websiteRoot, 'public', 'diagrams');
  mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const name of readdirSync(srcDir)) {
    if (!/\.(png|svg)$/i.test(name)) continue;
    copyFileSync(join(srcDir, name), join(outDir, name));
    count++;
  }
  return count;
}

function main() {
  mkdirSync(outRoot, { recursive: true });

  let count = 0;
  for (const page of pages) {
    generatePage(page);
    count++;
  }
  writeRootMeta();
  writeFolderMetas();
  // Removed/renamed docs must not leave stale pages behind. Deleting only the
  // leftovers (rather than starting from an empty dir) keeps the untouched
  // files' mtimes stable for the dev watcher.
  removeStaleOutputs(outRoot);
  const assets = copyDiagramAssets();

  const rel = relative(process.cwd(), outRoot);
  console.log(`sync-docs: generated ${count} pages into ${rel}/ (${assets} diagram assets)`);
}

main();
