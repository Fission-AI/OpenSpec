/**
 * Dashboard Command
 *
 * Spins up a local web server serving an interactive HTML dashboard
 * that displays active changes, specs organized by domain, and archive history.
 * Users can view any artifact's rendered markdown content.
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import chalk from 'chalk';
import { getTaskProgressForChange } from '../utils/task-progress.js';
import { MarkdownParser } from './parsers/markdown-parser.js';
import {
  loadChangeContext,
  formatChangeStatus,
} from './artifact-graph/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeEntry {
  name: string;
  status: 'draft' | 'active' | 'completed';
  completedTasks: number;
  totalTasks: number;
  artifacts: ArtifactEntry[];
}

interface ArtifactEntry {
  id: string;
  outputPath: string;
  status: 'done' | 'ready' | 'blocked';
  missingDeps?: string[];
}

interface SpecEntry {
  name: string;
  domain: string;
  requirementCount: number;
}

interface ArchiveEntry {
  name: string;
  date: string;
  changeName: string;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function getChanges(openspecDir: string): Promise<ChangeEntry[]> {
  const changesDir = path.join(openspecDir, 'changes');
  if (!fs.existsSync(changesDir)) return [];

  const entries = fs.readdirSync(changesDir, { withFileTypes: true });
  const changes: ChangeEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;

    const progress = await getTaskProgressForChange(changesDir, entry.name);
    let status: 'draft' | 'active' | 'completed' = 'draft';
    if (progress.total > 0 && progress.completed === progress.total) {
      status = 'completed';
    } else if (progress.total > 0) {
      status = 'active';
    }

    let artifacts: ArtifactEntry[] = [];
    try {
      const projectRoot = path.dirname(openspecDir);
      const context = loadChangeContext(projectRoot, entry.name);
      const changeStatus = formatChangeStatus(context);
      artifacts = changeStatus.artifacts.map((a) => ({
        id: a.id,
        outputPath: a.outputPath,
        status: a.status,
        missingDeps: a.missingDeps,
      }));
    } catch {
      // If artifact graph can't be loaded, leave artifacts empty
    }

    changes.push({
      name: entry.name,
      status,
      completedTasks: progress.completed,
      totalTasks: progress.total,
      artifacts,
    });
  }

  changes.sort((a, b) => a.name.localeCompare(b.name));
  return changes;
}

function getSpecs(openspecDir: string): SpecEntry[] {
  const specsDir = path.join(openspecDir, 'specs');
  if (!fs.existsSync(specsDir)) return [];

  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  const specs: SpecEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specFile = path.join(specsDir, entry.name, 'spec.md');
    if (!fs.existsSync(specFile)) continue;

    let requirementCount = 0;
    try {
      const content = fs.readFileSync(specFile, 'utf-8');
      const parser = new MarkdownParser(content);
      const spec = parser.parseSpec(entry.name);
      requirementCount = spec.requirements.length;
    } catch {
      // parse failure - include with 0
    }

    // Derive domain from the spec name prefix (e.g., "cli-init" -> "cli")
    const parts = entry.name.split('-');
    const domain = parts.length > 1 ? parts[0] : 'general';

    specs.push({ name: entry.name, domain, requirementCount });
  }

  specs.sort((a, b) => a.name.localeCompare(b.name));
  return specs;
}

function getArchive(openspecDir: string): ArchiveEntry[] {
  const archiveDir = path.join(openspecDir, 'changes', 'archive');
  if (!fs.existsSync(archiveDir)) return [];

  const entries = fs.readdirSync(archiveDir, { withFileTypes: true });
  const archives: ArchiveEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Parse date from "YYYY-MM-DD-change-name" format
    const match = entry.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    const date = match ? match[1] : '';
    const changeName = match ? match[2] : entry.name;

    archives.push({ name: entry.name, date, changeName });
  }

  // Sort by date descending (most recent first)
  archives.sort((a, b) => b.name.localeCompare(a.name));
  return archives;
}

function readArtifact(openspecDir: string, artifactPath: string): string | null {
  // Resolve to prevent path traversal
  const resolved = path.resolve(openspecDir, artifactPath);
  if (!resolved.startsWith(path.resolve(openspecDir))) return null;
  if (!fs.existsSync(resolved)) return null;
  try {
    return fs.readFileSync(resolved, 'utf-8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenSpec Dashboard</title>
<style>
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --border: #30363d;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --accent: #58a6ff;
    --green: #3fb950;
    --yellow: #d29922;
    --red: #f85149;
    --orange: #db6d28;
    --purple: #bc8cff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 0; border-bottom: 1px solid var(--border); margin-bottom: 24px;
  }
  header h1 { font-size: 20px; font-weight: 600; }
  header h1 span { color: var(--accent); }
  .refresh-btn {
    background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
    padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
  }
  .refresh-btn:hover { border-color: var(--accent); color: var(--text); }
  .tabs {
    display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 20px;
  }
  .tab {
    padding: 8px 16px; cursor: pointer; color: var(--text-muted); font-size: 14px;
    border-bottom: 2px solid transparent; transition: all 0.15s;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--accent); }
  .tab .badge {
    background: var(--surface); border: 1px solid var(--border);
    padding: 0 6px; border-radius: 10px; font-size: 12px; margin-left: 6px;
  }
  .panel { display: none; }
  .panel.active { display: block; }

  /* Cards */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; margin-bottom: 12px; overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; cursor: pointer; user-select: none;
  }
  .card-header:hover { background: rgba(88,166,255,0.04); }
  .card-title { font-weight: 600; font-size: 14px; }
  .card-body { padding: 0 16px 12px 16px; }
  .card.collapsed .card-body { display: none; }

  /* Status badges */
  .status {
    display: inline-block; padding: 2px 8px; border-radius: 12px;
    font-size: 12px; font-weight: 500;
  }
  .status.draft { background: rgba(139,148,158,0.15); color: var(--text-muted); }
  .status.active { background: rgba(210,153,34,0.15); color: var(--yellow); }
  .status.completed { background: rgba(63,185,80,0.15); color: var(--green); }

  /* Progress bar */
  .progress-wrap { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .progress-bar {
    flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;
  }
  .progress-fill { height: 100%; background: var(--green); border-radius: 3px; transition: width 0.3s; }
  .progress-text { font-size: 12px; color: var(--text-muted); min-width: 50px; text-align: right; }

  /* Artifacts */
  .artifact-list { list-style: none; margin-top: 8px; }
  .artifact-item {
    display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px;
  }
  .artifact-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .artifact-dot.done { background: var(--green); }
  .artifact-dot.ready { background: var(--yellow); }
  .artifact-dot.blocked { background: var(--red); }
  .artifact-name { color: var(--text); }
  .artifact-name.clickable { cursor: pointer; }
  .artifact-name.clickable:hover { color: var(--accent); text-decoration: underline; }
  .artifact-deps { color: var(--text-muted); font-size: 12px; }

  /* Specs */
  .domain-group { margin-bottom: 16px; }
  .domain-label {
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: var(--text-muted); margin-bottom: 6px; padding-left: 4px;
  }
  .spec-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;
  }
  .spec-item:hover { background: rgba(88,166,255,0.06); }
  .spec-count { color: var(--text-muted); font-size: 12px; }

  /* Archive */
  .archive-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 4px; font-size: 14px;
  }
  .archive-item:hover { background: rgba(88,166,255,0.06); }
  .archive-date { color: var(--text-muted); font-size: 12px; }
  .archive-name { cursor: pointer; }
  .archive-name:hover { color: var(--accent); text-decoration: underline; }

  /* Markdown viewer */
  .viewer-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    z-index: 100; justify-content: center; align-items: flex-start; padding: 40px;
  }
  .viewer-overlay.open { display: flex; }
  .viewer-box {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    width: 100%; max-width: 800px; max-height: calc(100vh - 80px); display: flex; flex-direction: column;
  }
  .viewer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
  }
  .viewer-title { font-size: 14px; font-weight: 600; }
  .viewer-close {
    background: none; border: none; color: var(--text-muted); font-size: 20px;
    cursor: pointer; padding: 0 4px; line-height: 1;
  }
  .viewer-close:hover { color: var(--text); }
  .viewer-content {
    padding: 16px; overflow-y: auto; flex: 1;
  }

  /* Rendered markdown */
  .md h1 { font-size: 20px; font-weight: 600; margin: 16px 0 8px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .md h2 { font-size: 17px; font-weight: 600; margin: 14px 0 6px; }
  .md h3 { font-size: 15px; font-weight: 600; margin: 12px 0 4px; }
  .md h4 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
  .md p { margin: 6px 0; }
  .md ul, .md ol { padding-left: 24px; margin: 6px 0; }
  .md li { margin: 2px 0; }
  .md code {
    background: rgba(110,118,129,0.2); padding: 2px 6px; border-radius: 3px;
    font-family: 'SF Mono', Consolas, monospace; font-size: 13px;
  }
  .md pre {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 12px; overflow-x: auto; margin: 8px 0;
  }
  .md pre code { background: none; padding: 0; }
  .md blockquote {
    border-left: 3px solid var(--border); padding-left: 12px;
    color: var(--text-muted); margin: 8px 0;
  }
  .md hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
  .md strong { font-weight: 600; }
  .md em { font-style: italic; }
  .md a { color: var(--accent); text-decoration: none; }
  .md a:hover { text-decoration: underline; }
  .md table { border-collapse: collapse; margin: 8px 0; width: 100%; }
  .md th, .md td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
  .md th { background: var(--bg); font-weight: 600; }

  /* Summary stats */
  .stats {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px; margin-bottom: 20px;
  }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 14px 16px; text-align: center;
  }
  .stat-value { font-size: 24px; font-weight: 700; }
  .stat-value.blue { color: var(--accent); }
  .stat-value.green { color: var(--green); }
  .stat-value.yellow { color: var(--yellow); }
  .stat-value.muted { color: var(--text-muted); }
  .stat-value.purple { color: var(--purple); }
  .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

  .empty-msg { color: var(--text-muted); font-style: italic; padding: 16px 0; }

  /* File tree for archive */
  .file-tree { list-style: none; margin: 6px 0; }
  .file-tree li {
    padding: 3px 0; font-size: 13px; cursor: pointer; color: var(--text-muted);
  }
  .file-tree li:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1><span>OpenSpec</span> Dashboard</h1>
    <button class="refresh-btn" onclick="refresh()">Refresh</button>
  </header>

  <div id="stats" class="stats"></div>

  <div class="tabs">
    <div class="tab active" data-tab="changes">Changes <span class="badge" id="badge-changes">0</span></div>
    <div class="tab" data-tab="specs">Specs <span class="badge" id="badge-specs">0</span></div>
    <div class="tab" data-tab="archive">Archive <span class="badge" id="badge-archive">0</span></div>
  </div>

  <div id="panel-changes" class="panel active"></div>
  <div id="panel-specs" class="panel"></div>
  <div id="panel-archive" class="panel"></div>
</div>

<!-- Markdown Viewer Overlay -->
<div id="viewer" class="viewer-overlay" onclick="if(event.target===this)closeViewer()">
  <div class="viewer-box">
    <div class="viewer-header">
      <span class="viewer-title" id="viewer-title"></span>
      <button class="viewer-close" onclick="closeViewer()">&times;</button>
    </div>
    <div class="viewer-content md" id="viewer-content"></div>
  </div>
</div>

<script>
// ---- State ----
let data = { changes: [], specs: [], archive: [] };

// ---- Tabs ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ---- Fetch data ----
async function refresh() {
  const res = await fetch('/api/data');
  data = await res.json();
  renderStats();
  renderChanges();
  renderSpecs();
  renderArchive();
}

// ---- Markdown viewer ----
async function openViewer(path, title) {
  const res = await fetch('/api/artifact?path=' + encodeURIComponent(path));
  const json = await res.json();
  document.getElementById('viewer-title').textContent = title || path;
  document.getElementById('viewer-content').innerHTML = renderMarkdown(json.content || 'File not found.');
  document.getElementById('viewer').classList.add('open');
}
function closeViewer() {
  document.getElementById('viewer').classList.remove('open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewer(); });

// ---- Basic markdown renderer ----
function renderMarkdown(src) {
  if (!src) return '';
  let html = escapeHtml(src);

  // Code blocks
  html = html.replace(/\`\`\`(\\w*?)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Bold & italic
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/\`([^\`]+?)\`/g, '<code>$1</code>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Checkboxes
  html = html.replace(/^- \\[x\\] (.+)$/gm, '<li style="list-style:none">&#9745; $1</li>');
  html = html.replace(/^- \\[ \\] (.+)$/gm, '<li style="list-style:none">&#9744; $1</li>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Links
  html = html.replace(/\\[(.+?)\\]\\((.+?)\\)/g, '<a href="$2" target="_blank">$1</a>');

  // Paragraphs (wrap remaining plain lines)
  html = html.replace(/^(?!<[hlupbo]|<li|<hr|<pre|<code|<strong|<em|<a |<block|&#97)(\\S.+)$/gm, '<p>$1</p>');

  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Render functions ----
function renderStats() {
  const draftCount = data.changes.filter(c => c.status === 'draft').length;
  const activeCount = data.changes.filter(c => c.status === 'active').length;
  const completedCount = data.changes.filter(c => c.status === 'completed').length;
  const totalReqs = data.specs.reduce((s, sp) => s + sp.requirementCount, 0);

  document.getElementById('stats').innerHTML = \`
    <div class="stat-card"><div class="stat-value blue">\${data.specs.length}</div><div class="stat-label">Specs</div></div>
    <div class="stat-card"><div class="stat-value purple">\${totalReqs}</div><div class="stat-label">Requirements</div></div>
    <div class="stat-card"><div class="stat-value muted">\${draftCount}</div><div class="stat-label">Draft</div></div>
    <div class="stat-card"><div class="stat-value yellow">\${activeCount}</div><div class="stat-label">Active</div></div>
    <div class="stat-card"><div class="stat-value green">\${completedCount}</div><div class="stat-label">Completed</div></div>
    <div class="stat-card"><div class="stat-value muted">\${data.archive.length}</div><div class="stat-label">Archived</div></div>
  \`;

  document.getElementById('badge-changes').textContent = data.changes.length;
  document.getElementById('badge-specs').textContent = data.specs.length;
  document.getElementById('badge-archive').textContent = data.archive.length;
}

function renderChanges() {
  const el = document.getElementById('panel-changes');
  if (data.changes.length === 0) {
    el.innerHTML = '<div class="empty-msg">No active changes found.</div>';
    return;
  }

  // Group: active first, then draft, then completed
  const order = { active: 0, draft: 1, completed: 2 };
  const sorted = [...data.changes].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));

  el.innerHTML = sorted.map(change => {
    const pct = change.totalTasks > 0 ? Math.round(change.completedTasks / change.totalTasks * 100) : 0;
    const progressHtml = change.totalTasks > 0 ? \`
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:\${pct}%"></div></div>
        <div class="progress-text">\${change.completedTasks}/\${change.totalTasks}</div>
      </div>
    \` : '';

    const artifactsHtml = change.artifacts.length > 0 ? \`
      <ul class="artifact-list">
        \${change.artifacts.map(a => {
          const isClickable = a.status === 'done';
          const clickAttr = isClickable
            ? \`class="artifact-name clickable" onclick="openViewer('changes/\${change.name}/\${a.outputPath}', '\${change.name} / \${a.id}')"\`
            : \`class="artifact-name"\`;
          const depsHtml = a.missingDeps && a.missingDeps.length > 0
            ? \` <span class="artifact-deps">(blocked by: \${a.missingDeps.join(', ')})</span>\`
            : '';
          return \`<li class="artifact-item">
            <span class="artifact-dot \${a.status}"></span>
            <span \${clickAttr}>\${a.id}</span>\${depsHtml}
          </li>\`;
        }).join('')}
      </ul>
    \` : '';

    return \`<div class="card">
      <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span class="card-title">\${change.name}</span>
        <span class="status \${change.status}">\${change.status}</span>
      </div>
      <div class="card-body">
        \${progressHtml}
        \${artifactsHtml}
      </div>
    </div>\`;
  }).join('');
}

function renderSpecs() {
  const el = document.getElementById('panel-specs');
  if (data.specs.length === 0) {
    el.innerHTML = '<div class="empty-msg">No specs found.</div>';
    return;
  }

  // Group by domain
  const domains = {};
  data.specs.forEach(spec => {
    if (!domains[spec.domain]) domains[spec.domain] = [];
    domains[spec.domain].push(spec);
  });

  const sortedDomains = Object.keys(domains).sort();
  el.innerHTML = sortedDomains.map(domain => \`
    <div class="domain-group">
      <div class="domain-label">\${domain}</div>
      \${domains[domain].map(spec => \`
        <div class="spec-item" onclick="openViewer('specs/\${spec.name}/spec.md', '\${spec.name}')">
          <span>\${spec.name}</span>
          <span class="spec-count">\${spec.requirementCount} req\${spec.requirementCount !== 1 ? 's' : ''}</span>
        </div>
      \`).join('')}
    </div>
  \`).join('');
}

function renderArchive() {
  const el = document.getElementById('panel-archive');
  if (data.archive.length === 0) {
    el.innerHTML = '<div class="empty-msg">No archived changes found.</div>';
    return;
  }

  el.innerHTML = data.archive.map(a => \`
    <div class="card collapsed">
      <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed'); loadArchiveFiles(this.parentElement, '\${a.name}')">
        <span class="card-title archive-name">\${a.changeName}</span>
        <span class="archive-date">\${a.date}</span>
      </div>
      <div class="card-body" data-archive="\${a.name}"></div>
    </div>
  \`).join('');
}

async function loadArchiveFiles(card, archiveName) {
  const body = card.querySelector('.card-body');
  if (body.dataset.loaded) return;
  body.dataset.loaded = '1';

  const res = await fetch('/api/archive-files?name=' + encodeURIComponent(archiveName));
  const json = await res.json();
  if (json.files && json.files.length > 0) {
    body.innerHTML = '<ul class="file-tree">' +
      json.files.map(f => \`<li onclick="event.stopPropagation(); openViewer('changes/archive/\${archiveName}/\${f}', '\${archiveName} / \${f}')">\${f}</li>\`).join('') +
      '</ul>';
  } else {
    body.innerHTML = '<div class="empty-msg">No files found.</div>';
  }
}

// ---- Init ----
refresh();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

function listMarkdownFiles(dir: string, prefix: string = ''): string[] {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...listMarkdownFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.md')) {
      result.push(rel);
    }
  }
  return result;
}

export class DashboardCommand {
  async execute(targetPath: string = '.', options: { port?: number } = {}): Promise<void> {
    const openspecDir = path.resolve(targetPath, 'openspec');

    if (!fs.existsSync(openspecDir)) {
      throw new Error("No openspec directory found. Run 'openspec init' first.");
    }

    const port = options.port || 3000;

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      // CORS headers for local dev
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getHtml());
        return;
      }

      if (url.pathname === '/api/data') {
        try {
          const [changes, specs, archive] = await Promise.all([
            getChanges(openspecDir),
            Promise.resolve(getSpecs(openspecDir)),
            Promise.resolve(getArchive(openspecDir)),
          ]);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ changes, specs, archive }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      if (url.pathname === '/api/artifact') {
        const artifactPath = url.searchParams.get('path') || '';
        const content = readArtifact(openspecDir, artifactPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ path: artifactPath, content }));
        return;
      }

      if (url.pathname === '/api/archive-files') {
        const name = url.searchParams.get('name') || '';
        const archiveItemDir = path.join(openspecDir, 'changes', 'archive', name);
        // Prevent path traversal
        if (!path.resolve(archiveItemDir).startsWith(path.resolve(openspecDir))) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path' }));
          return;
        }
        const files = listMarkdownFiles(archiveItemDir);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ files }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    await new Promise<void>((resolve, reject) => {
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use. Try: openspec dashboard --port <other-port>`));
        } else {
          reject(err);
        }
      });

      server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(chalk.bold('\nOpenSpec Dashboard'));
        console.log(`Server running at ${chalk.cyan(url)}`);
        console.log(chalk.dim('Press Ctrl+C to stop.\n'));

        // Open browser
        const openCmd = process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
        exec(`${openCmd} ${url}`);

        resolve();
      });
    });

    // Keep process alive until interrupted
    await new Promise<void>((resolve) => {
      const shutdown = () => {
        console.log(chalk.dim('\nShutting down dashboard...'));
        server.close(() => resolve());
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });
  }
}
