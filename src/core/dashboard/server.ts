import http from 'http';
import { exec } from 'child_process';
import { URL } from 'url';
import {
  getChangesData,
  getSpecsData,
  getArchiveData,
  getSummary,
  getArtifactContent,
} from './data.js';

function sendJson(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendHtml(res: http.ServerResponse, html: string, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenSpec Dashboard</title>
<style>
  :root {
    --bg: #1a1a2e;
    --surface: #16213e;
    --surface2: #0f3460;
    --text: #e0e0e0;
    --text-dim: #8888a0;
    --accent: #00b4d8;
    --green: #06d6a0;
    --yellow: #ffd166;
    --red: #ef476f;
    --border: #2a2a4a;
    --mono: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--mono);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header h1 {
    font-size: 18px;
    font-weight: 600;
  }
  header h1 span { color: var(--accent); }
  .summary {
    display: flex;
    gap: 24px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .summary .val { color: var(--text); font-weight: 600; }
  nav {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 0;
  }
  nav button {
    background: none;
    border: none;
    color: var(--text-dim);
    padding: 12px 24px;
    font-family: var(--mono);
    font-size: 14px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  nav button:hover { color: var(--text); }
  nav button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .container {
    display: flex;
    height: calc(100vh - 97px);
  }
  .panel {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
  }
  .detail-panel {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    border-left: 1px solid var(--border);
    background: var(--surface);
    display: none;
  }
  .detail-panel.visible { display: block; }
  .detail-panel .close-btn {
    float: right;
    background: none;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 13px;
    border-radius: 3px;
  }
  .detail-panel .close-btn:hover { color: var(--text); border-color: var(--text-dim); }
  .detail-panel h2 { font-size: 16px; margin-bottom: 16px; color: var(--accent); }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 20px 0 10px;
  }
  .section-title:first-child { margin-top: 0; }
  .empty-state {
    color: var(--text-dim);
    font-style: italic;
    padding: 16px 0;
    font-size: 13px;
  }
  .change-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 8px;
    cursor: default;
  }
  .change-card .name {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .change-card .artifacts {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .artifact-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .artifact-badge.present {
    background: var(--surface2);
    color: var(--accent);
    border: 1px solid var(--accent);
  }
  .artifact-badge.missing {
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--border);
    cursor: default;
  }
  .artifact-badge.present:hover {
    background: var(--accent);
    color: var(--bg);
  }
  .progress-container {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;
  }
  .progress-fill.low { background: var(--red); }
  .progress-fill.mid { background: var(--yellow); }
  .progress-fill.high { background: var(--green); }
  .domain-group {
    margin-bottom: 20px;
  }
  .domain-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }
  .spec-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .spec-item:hover { background: var(--surface2); }
  .spec-item .req-count { color: var(--text-dim); font-size: 12px; }
  .archive-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 12px;
    font-size: 13px;
    border-radius: 4px;
    transition: background 0.15s;
    cursor: pointer;
  }
  .archive-item:hover { background: var(--surface2); }
  .archive-date { color: var(--text-dim); font-size: 12px; min-width: 90px; }
  .load-more {
    display: block;
    margin: 16px auto;
    padding: 8px 24px;
    background: var(--surface2);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 13px;
  }
  .load-more:hover { background: var(--accent); color: var(--bg); }
  /* Markdown content styles */
  .md-content h1, .md-content h2, .md-content h3,
  .md-content h4, .md-content h5, .md-content h6 {
    margin: 20px 0 10px;
    color: var(--text);
  }
  .md-content h1 { font-size: 22px; }
  .md-content h2 { font-size: 18px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .md-content h3 { font-size: 15px; }
  .md-content p { margin: 10px 0; line-height: 1.6; font-size: 13px; }
  .md-content ul, .md-content ol { margin: 10px 0; padding-left: 24px; font-size: 13px; }
  .md-content li { margin: 4px 0; line-height: 1.5; }
  .md-content ul.checklist { list-style: none; padding-left: 4px; }
  .md-content ul.checklist li { display: flex; align-items: baseline; gap: 6px; }
  .md-content code {
    background: var(--bg);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
  }
  .md-content pre {
    background: var(--bg);
    padding: 14px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .md-content pre code { padding: 0; background: none; }
  .md-content blockquote {
    border-left: 3px solid var(--accent);
    padding: 8px 16px;
    margin: 12px 0;
    color: var(--text-dim);
    background: rgba(0,180,216,0.05);
  }
  .md-content hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 16px 0;
  }
  .md-content a { color: var(--accent); }
  .md-content strong { color: var(--text); }
</style>
</head>
<body>
<header>
  <h1><span>OpenSpec</span> Dashboard</h1>
  <div class="summary" id="summary"></div>
</header>
<nav>
  <button class="active" data-tab="changes">Changes</button>
  <button data-tab="specs">Specifications</button>
  <button data-tab="archive">Archive</button>
</nav>
<div class="container">
  <div class="panel" id="main-panel"></div>
  <div class="detail-panel" id="detail-panel">
    <button class="close-btn" onclick="closeDetail()">close</button>
    <h2 id="detail-title"></h2>
    <div class="md-content" id="detail-content"></div>
  </div>
</div>
<script>
let currentTab = 'changes';
let archiveOffset = 0;
let archiveTotal = 0;
let archiveEntries = [];

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    closeDetail();
    loadTab(currentTab);
  });
});

async function api(path) {
  const res = await fetch(path);
  return res.json();
}

async function loadSummary() {
  const s = await api('/api/summary');
  document.getElementById('summary').innerHTML =
    '<div>Changes: <span class="val">' + s.changes.total + '</span></div>' +
    '<div>Specs: <span class="val">' + s.specs.total + '</span></div>' +
    '<div>Requirements: <span class="val">' + s.specs.totalRequirements + '</span></div>' +
    '<div>Archived: <span class="val">' + s.archive.total + '</span></div>';
}

async function loadTab(tab) {
  if (tab === 'changes') await loadChanges();
  else if (tab === 'specs') await loadSpecs();
  else if (tab === 'archive') { archiveOffset = 0; archiveEntries = []; await loadArchive(); }
}

async function loadChanges() {
  const changes = await api('/api/changes');
  const panel = document.getElementById('main-panel');
  const draft = changes.filter(c => c.status === 'draft');
  const active = changes.filter(c => c.status === 'active');
  const completed = changes.filter(c => c.status === 'completed');
  let html = '';

  if (changes.length === 0) {
    html = '<div class="empty-state">No changes found.</div>';
    panel.innerHTML = html;
    return;
  }

  if (active.length > 0) {
    html += '<div class="section-title">Active</div>';
    active.forEach(c => { html += changeCard(c); });
  }
  if (draft.length > 0) {
    html += '<div class="section-title">Draft</div>';
    draft.forEach(c => { html += changeCard(c); });
  }
  if (completed.length > 0) {
    html += '<div class="section-title">Completed</div>';
    completed.forEach(c => { html += changeCard(c); });
  }
  panel.innerHTML = html;
}

function changeCard(c) {
  const pct = c.progress.total > 0 ? Math.round((c.progress.completed / c.progress.total) * 100) : 0;
  const cls = pct < 33 ? 'low' : pct < 66 ? 'mid' : 'high';
  const artifacts = [
    badge('proposal', c.artifacts.proposal, 'changes/' + c.name + '/proposal.md'),
    badge('specs', c.artifacts.specs, 'changes/' + c.name + '/specs'),
    badge('design', c.artifacts.design, 'changes/' + c.name + '/design.md'),
    badge('tasks', c.artifacts.tasks, 'changes/' + c.name + '/tasks.md'),
  ].join('');
  let progress = '';
  if (c.progress.total > 0) {
    progress = '<div class="progress-container">' +
      '<div class="progress-bar"><div class="progress-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
      '<span>' + c.progress.completed + '/' + c.progress.total + ' (' + pct + '%)</span></div>';
  }
  return '<div class="change-card"><div class="name">' + esc(c.name) + '</div>' +
    '<div class="artifacts">' + artifacts + '</div>' + progress + '</div>';
}

function badge(label, present, path) {
  if (present) {
    return '<span class="artifact-badge present" onclick="viewArtifact(\\'' + path + '\\',\\'' + label + '\\')">' + label + '</span>';
  }
  return '<span class="artifact-badge missing">' + label + '</span>';
}

async function loadSpecs() {
  const groups = await api('/api/specs');
  const panel = document.getElementById('main-panel');
  if (groups.length === 0) {
    panel.innerHTML = '<div class="empty-state">No specifications found.</div>';
    return;
  }
  let html = '';
  groups.forEach(g => {
    html += '<div class="domain-group"><div class="domain-label">' + esc(g.domain) + '</div>';
    g.specs.forEach(s => {
      const reqLabel = s.requirementCount === 1 ? 'requirement' : 'requirements';
      html += '<div class="spec-item" onclick="viewArtifact(\\'specs/' + s.name + '/spec.md\\',\\'' + esc(s.name) + '\\')">' +
        '<span>' + esc(s.name) + '</span>' +
        '<span class="req-count">' + s.requirementCount + ' ' + reqLabel + '</span></div>';
    });
    html += '</div>';
  });
  panel.innerHTML = html;
}

async function loadArchive() {
  const data = await api('/api/archive?limit=50&offset=' + archiveOffset);
  archiveTotal = data.total;
  archiveEntries = archiveEntries.concat(data.entries);
  archiveOffset += data.entries.length;
  const panel = document.getElementById('main-panel');
  if (archiveEntries.length === 0) {
    panel.innerHTML = '<div class="empty-state">No archived changes found.</div>';
    return;
  }
  let html = '<div class="section-title">Archive (' + archiveTotal + ' total)</div>';
  archiveEntries.forEach(e => {
    html += '<div class="archive-item" onclick="viewArtifact(\\'changes/archive/' + e.name + '/proposal.md\\',\\'' + esc(e.changeName) + '\\')">' +
      '<span class="archive-date">' + esc(e.date || 'N/A') + '</span>' +
      '<span>' + esc(e.changeName) + '</span></div>';
  });
  if (archiveOffset < archiveTotal) {
    html += '<button class="load-more" onclick="loadArchive()">Load more</button>';
  }
  panel.innerHTML = html;
}

async function viewArtifact(path, title) {
  const dp = document.getElementById('detail-panel');
  const dt = document.getElementById('detail-title');
  const dc = document.getElementById('detail-content');
  dp.classList.add('visible');
  dt.textContent = title;
  dc.innerHTML = '<div class="empty-state">Loading...</div>';
  try {
    const res = await fetch('/api/artifact?path=' + encodeURIComponent(path));
    const data = await res.json();
    if (data.error) {
      dc.innerHTML = '<div class="empty-state">' + esc(data.error) + '</div>';
    } else {
      dc.innerHTML = data.html;
    }
  } catch (err) {
    dc.innerHTML = '<div class="empty-state">Failed to load artifact.</div>';
  }
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('visible');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

loadSummary();
loadTab('changes');
</script>
</body>
</html>`;
}

export interface ServerOptions {
  port: number;
  openspecDir: string;
  noOpen: boolean;
}

export async function startServer(options: ServerOptions): Promise<http.Server> {
  const { port, openspecDir } = options;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      if (pathname === '/') {
        sendHtml(res, getDashboardHtml());
        return;
      }

      if (pathname === '/api/summary') {
        const data = await getSummary(openspecDir);
        sendJson(res, data);
        return;
      }

      if (pathname === '/api/changes') {
        const data = await getChangesData(openspecDir);
        sendJson(res, data);
        return;
      }

      if (pathname === '/api/specs') {
        const data = await getSpecsData(openspecDir);
        sendJson(res, data);
        return;
      }

      if (pathname === '/api/archive') {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const data = await getArchiveData(openspecDir, limit, offset);
        sendJson(res, data);
        return;
      }

      if (pathname === '/api/artifact') {
        const artifactPath = url.searchParams.get('path');
        if (!artifactPath) {
          sendJson(res, { error: 'Missing path parameter' }, 400);
          return;
        }
        const result = await getArtifactContent(openspecDir, artifactPath);
        if ('error' in result) {
          sendJson(res, { error: result.error }, result.status);
        } else {
          sendJson(res, result);
        }
        return;
      }

      // 404 for everything else
      sendJson(res, { error: 'Not found' }, 404);
    } catch (error) {
      sendJson(res, { error: 'Internal server error' }, 500);
    }
  });

  return server;
}

export async function findAvailablePort(startPort: number, maxPort: number): Promise<number> {
  for (let port = startPort; port <= maxPort; port++) {
    const available = await isPortAvailable(port);
    if (available) return port;
  }
  throw new Error(
    `No available port found between ${startPort} and ${maxPort}. Use --port to specify a different port.`
  );
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

export function openBrowser(url: string): void {
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Could not open browser automatically. Visit: ${url}`);
    }
  });
}
