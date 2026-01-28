import * as http from 'node:http';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { getTaskProgressForChange } from '../utils/task-progress.js';
import { MarkdownParser } from './parsers/markdown-parser.js';

interface DashboardOptions {
  port?: number;
  open?: boolean;
}

export class DashboardCommand {
  async execute(targetPath: string = '.', options: DashboardOptions = {}): Promise<void> {
    const openspecDir = path.resolve(targetPath, 'openspec');

    if (!fs.existsSync(openspecDir)) {
      throw new Error('No openspec/ directory found. Run "openspec init" first.');
    }

    const preferredPort = options.port ?? 3000;
    const shouldOpen = options.open !== false;
    const explicitPort = options.port !== undefined;

    const port = await this.findAvailablePort(preferredPort, explicitPort);
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res, openspecDir);
    });

    await new Promise<void>((resolve, reject) => {
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && explicitPort) {
          reject(new Error(`Port ${preferredPort} is already in use.`));
        } else {
          reject(err);
        }
      });
      server.listen(port, () => resolve());
    });

    const url = `http://localhost:${port}`;
    console.log(`Dashboard running at ${url}`);
    console.log('Press Ctrl+C to stop.\n');

    if (shouldOpen) {
      this.openBrowser(url);
    }

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down dashboard...');
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private async findAvailablePort(preferred: number, explicit: boolean): Promise<number> {
    if (explicit) {
      return preferred;
    }

    for (let port = preferred; port <= preferred + 10; port++) {
      const available = await this.isPortAvailable(port);
      if (available) return port;
    }

    throw new Error(`No available port found between ${preferred} and ${preferred + 10}.`);
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.on('error', () => resolve(false));
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
    });
  }

  private openBrowser(url: string): void {
    const platform = process.platform;
    let cmd: string;
    if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else if (platform === 'win32') {
      cmd = `start "" "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }
    exec(cmd, (err) => {
      if (err) {
        console.log(`Could not open browser automatically. Navigate to ${url}`);
      }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse, openspecDir: string): void {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getDashboardHtml());
      return;
    }

    if (pathname === '/api/changes') {
      this.handleChanges(res, openspecDir);
      return;
    }

    if (pathname === '/api/specs') {
      this.handleSpecs(res, openspecDir);
      return;
    }

    if (pathname === '/api/archive') {
      this.handleArchive(res, openspecDir);
      return;
    }

    if (pathname === '/api/artifact') {
      this.handleArtifact(res, openspecDir, parsedUrl.searchParams);
      return;
    }

    this.sendJson(res, 404, { error: 'Not found' });
  }

  private async handleChanges(res: http.ServerResponse, openspecDir: string): Promise<void> {
    try {
      const changesDir = path.join(openspecDir, 'changes');
      const draft: any[] = [];
      const active: any[] = [];
      const completed: any[] = [];

      if (!fs.existsSync(changesDir)) {
        this.sendJson(res, 200, { draft, active, completed });
        return;
      }

      const entries = fs.readdirSync(changesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive' || entry.name.startsWith('.')) continue;

        const changeDir = path.join(changesDir, entry.name);
        const progress = await getTaskProgressForChange(changesDir, entry.name);

        const artifacts = ['proposal.md', 'design.md', 'tasks.md'].map((file) => ({
          name: file,
          exists: fs.existsSync(path.join(changeDir, file)),
        }));

        // Check for spec files in specs/ subdirectory
        const specsSubDir = path.join(changeDir, 'specs');
        if (fs.existsSync(specsSubDir)) {
          try {
            const specEntries = fs.readdirSync(specsSubDir, { withFileTypes: true });
            for (const se of specEntries) {
              if (se.isDirectory()) {
                const specFile = path.join(specsSubDir, se.name, 'spec.md');
                artifacts.push({
                  name: `specs/${se.name}/spec.md`,
                  exists: fs.existsSync(specFile),
                });
              }
            }
          } catch {
            // ignore
          }
        }

        const changeData = { name: entry.name, artifacts };

        if (progress.total === 0) {
          draft.push(changeData);
        } else if (progress.completed === progress.total) {
          completed.push(changeData);
        } else {
          active.push({ ...changeData, progress: { completed: progress.completed, total: progress.total } });
        }
      }

      draft.sort((a, b) => a.name.localeCompare(b.name));
      active.sort((a, b) => {
        const pA = a.progress.total > 0 ? a.progress.completed / a.progress.total : 0;
        const pB = b.progress.total > 0 ? b.progress.completed / b.progress.total : 0;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name);
      });
      completed.sort((a, b) => a.name.localeCompare(b.name));

      this.sendJson(res, 200, { draft, active, completed });
    } catch (err) {
      this.sendJson(res, 500, { error: `Failed to read changes: ${(err as Error).message}` });
    }
  }

  private async handleSpecs(res: http.ServerResponse, openspecDir: string): Promise<void> {
    try {
      const specsDir = path.join(openspecDir, 'specs');

      if (!fs.existsSync(specsDir)) {
        this.sendJson(res, 200, []);
        return;
      }

      const specs: Array<{ name: string; domain: string; requirementCount: number }> = [];
      const entries = fs.readdirSync(specsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        const specFile = path.join(specsDir, entry.name, 'spec.md');
        if (!fs.existsSync(specFile)) continue;

        const hyphenIndex = entry.name.indexOf('-');
        const domain = hyphenIndex > 0 ? entry.name.substring(0, hyphenIndex) : entry.name;

        let requirementCount = 0;
        try {
          const content = fs.readFileSync(specFile, 'utf-8');
          const parser = new MarkdownParser(content);
          const spec = parser.parseSpec(entry.name);
          requirementCount = spec.requirements.length;
        } catch {
          // parse failure - keep count at 0
        }

        specs.push({ name: entry.name, domain, requirementCount });
      }

      specs.sort((a, b) => a.name.localeCompare(b.name));
      this.sendJson(res, 200, specs);
    } catch (err) {
      this.sendJson(res, 500, { error: `Failed to read specs: ${(err as Error).message}` });
    }
  }

  private async handleArchive(res: http.ServerResponse, openspecDir: string): Promise<void> {
    try {
      const archiveDir = path.join(openspecDir, 'changes', 'archive');

      if (!fs.existsSync(archiveDir)) {
        this.sendJson(res, 200, []);
        return;
      }

      const entries = fs.readdirSync(archiveDir, { withFileTypes: true });
      const names: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        names.push(entry.name);
      }

      // Reverse sort for reverse-chronological ordering
      names.sort((a, b) => b.localeCompare(a));
      this.sendJson(res, 200, names);
    } catch (err) {
      this.sendJson(res, 500, { error: `Failed to read archive: ${(err as Error).message}` });
    }
  }

  private async handleArtifact(
    res: http.ServerResponse,
    openspecDir: string,
    params: URLSearchParams
  ): Promise<void> {
    const type = params.get('type');
    const name = params.get('name');
    const file = params.get('file');

    if (!type || !name) {
      this.sendJson(res, 400, { error: 'Missing required parameters: type, name' });
      return;
    }

    // Path traversal prevention
    if (name.includes('..') || (file && file.includes('..'))) {
      this.sendJson(res, 400, { error: 'Path traversal not allowed' });
      return;
    }

    let filePath: string;

    if (type === 'change') {
      if (!file) {
        this.sendJson(res, 400, { error: 'Missing required parameter: file (for change artifacts)' });
        return;
      }
      filePath = path.join(openspecDir, 'changes', name, file);
    } else if (type === 'spec') {
      filePath = path.join(openspecDir, 'specs', name, 'spec.md');
    } else if (type === 'archive') {
      if (!file) {
        this.sendJson(res, 400, { error: 'Missing required parameter: file (for archive artifacts)' });
        return;
      }
      filePath = path.join(openspecDir, 'changes', 'archive', name, file);
    } else {
      this.sendJson(res, 400, { error: 'Invalid type. Must be: change, spec, or archive' });
      return;
    }

    // Verify resolved path stays within openspec directory
    const resolved = path.resolve(filePath);
    const resolvedOpenspec = path.resolve(openspecDir);
    if (!resolved.startsWith(resolvedOpenspec + path.sep) && resolved !== resolvedOpenspec) {
      this.sendJson(res, 400, { error: 'Path traversal not allowed' });
      return;
    }

    try {
      const content = await fsp.readFile(resolved, 'utf-8');
      this.sendJson(res, 200, { content });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        this.sendJson(res, 404, { error: 'Artifact not found' });
      } else {
        this.sendJson(res, 500, { error: `Failed to read artifact: ${err.message}` });
      }
    }
  }

  private sendJson(res: http.ServerResponse, status: number, data: any): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
  }
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenSpec Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0d1117; color: #c9d1d9; display: flex; height: 100vh;
  }
  .sidebar {
    width: 280px; background: #161b22; border-right: 1px solid #30363d;
    overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column;
  }
  .sidebar-header {
    padding: 20px; border-bottom: 1px solid #30363d;
    font-size: 18px; font-weight: 600; color: #f0f6fc;
  }
  .sidebar-section { padding: 12px 0; }
  .sidebar-section-title {
    padding: 6px 20px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px; color: #8b949e;
  }
  .sidebar-item {
    padding: 6px 20px; cursor: pointer; display: flex;
    align-items: center; gap: 8px; font-size: 14px; color: #c9d1d9;
  }
  .sidebar-item:hover { background: #1f2937; }
  .sidebar-item.active { background: #1f6feb22; color: #58a6ff; }
  .sidebar-item .dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .dot-draft { background: #6e7681; }
  .dot-active { background: #d29922; }
  .dot-completed { background: #3fb950; }
  .dot-spec { background: #58a6ff; }
  .dot-archive { background: #8b949e; }
  .progress-mini {
    margin-left: auto; font-size: 11px; color: #8b949e;
  }
  .main {
    flex: 1; overflow-y: auto; padding: 32px 48px;
  }
  .main h1 { color: #f0f6fc; margin-bottom: 8px; font-size: 24px; }
  .main .subtitle { color: #8b949e; margin-bottom: 24px; font-size: 14px; }
  .artifact-tabs {
    display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap;
  }
  .artifact-tab {
    padding: 6px 12px; border-radius: 6px; cursor: pointer;
    font-size: 13px; background: #21262d; color: #8b949e; border: 1px solid #30363d;
  }
  .artifact-tab:hover { color: #c9d1d9; border-color: #484f58; }
  .artifact-tab.active { background: #1f6feb; color: #fff; border-color: #1f6feb; }
  .artifact-tab.missing { opacity: 0.4; cursor: default; }
  .content-panel {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 24px 32px; line-height: 1.7; min-height: 200px;
  }
  .content-panel h1, .content-panel h2, .content-panel h3,
  .content-panel h4, .content-panel h5, .content-panel h6 {
    color: #f0f6fc; margin: 20px 0 8px 0;
  }
  .content-panel h1 { font-size: 22px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
  .content-panel h2 { font-size: 18px; border-bottom: 1px solid #30363d; padding-bottom: 6px; }
  .content-panel h3 { font-size: 16px; }
  .content-panel p { margin: 8px 0; }
  .content-panel ul, .content-panel ol { margin: 8px 0; padding-left: 24px; }
  .content-panel li { margin: 4px 0; }
  .content-panel code {
    background: #1f2937; padding: 2px 6px; border-radius: 4px;
    font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  }
  .content-panel pre {
    background: #1f2937; padding: 16px; border-radius: 6px;
    overflow-x: auto; margin: 12px 0;
  }
  .content-panel pre code { padding: 0; background: none; }
  .content-panel a { color: #58a6ff; text-decoration: none; }
  .content-panel a:hover { text-decoration: underline; }
  .content-panel strong { color: #f0f6fc; }
  .content-panel hr {
    border: none; border-top: 1px solid #30363d; margin: 16px 0;
  }
  .content-panel input[type="checkbox"] { margin-right: 6px; }
  .domain-group { margin-bottom: 16px; }
  .domain-title {
    font-size: 12px; font-weight: 600; color: #8b949e;
    text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 20px;
  }
  .welcome { color: #8b949e; text-align: center; padding-top: 80px; }
  .welcome h2 { color: #f0f6fc; margin-bottom: 12px; font-size: 20px; }
  .loading { color: #8b949e; padding: 20px; text-align: center; }
</style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-header">OpenSpec</div>
  <div id="sidebar-content"><div class="loading">Loading...</div></div>
</div>

<div class="main" id="main-content">
  <div class="welcome">
    <h2>OpenSpec Dashboard</h2>
    <p>Select an item from the sidebar to view its content.</p>
  </div>
</div>

<script>
(function() {
  let changesData = null;
  let specsData = null;
  let archiveData = null;
  let activeItem = null;

  async function fetchJson(url) {
    const res = await fetch(url);
    return res.json();
  }

  async function init() {
    [changesData, specsData, archiveData] = await Promise.all([
      fetchJson('/api/changes'),
      fetchJson('/api/specs'),
      fetchJson('/api/archive')
    ]);
    renderSidebar();
  }

  function renderSidebar() {
    const sb = document.getElementById('sidebar-content');
    let html = '';

    // Changes section
    const allChanges = [
      ...(changesData.draft || []).map(c => ({ ...c, status: 'draft' })),
      ...(changesData.active || []).map(c => ({ ...c, status: 'active' })),
      ...(changesData.completed || []).map(c => ({ ...c, status: 'completed' }))
    ];

    if (allChanges.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Changes</div>';
      for (const c of allChanges) {
        const key = 'change:' + c.name;
        const cls = activeItem === key ? ' active' : '';
        let extra = '';
        if (c.status === 'active' && c.progress) {
          const pct = c.progress.total > 0 ? Math.round(c.progress.completed / c.progress.total * 100) : 0;
          extra = '<span class="progress-mini">' + pct + '%</span>';
        } else if (c.status === 'completed') {
          extra = '<span class="progress-mini">Done</span>';
        }
        html += '<div class="sidebar-item' + cls + '" onclick="selectChange(\\''+esc(c.name)+'\\',\\''+c.status+'\\')"><span class="dot dot-'+c.status+'"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.name)+'</span>'+extra+'</div>';
      }
      html += '</div>';
    }

    // Specs section - grouped by domain
    if (specsData.length > 0) {
      const groups = {};
      for (const s of specsData) {
        if (!groups[s.domain]) groups[s.domain] = [];
        groups[s.domain].push(s);
      }
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Specs</div>';
      const domains = Object.keys(groups).sort();
      for (const domain of domains) {
        html += '<div class="domain-title">' + esc(domain) + '</div>';
        for (const s of groups[domain]) {
          const key = 'spec:' + s.name;
          const cls = activeItem === key ? ' active' : '';
          const reqLabel = s.requirementCount === 1 ? 'req' : 'reqs';
          html += '<div class="sidebar-item' + cls + '" onclick="selectSpec(\\''+esc(s.name)+'\\')"><span class="dot dot-spec"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(s.name)+'</span><span class="progress-mini">'+s.requirementCount+' '+reqLabel+'</span></div>';
        }
      }
      html += '</div>';
    }

    // Archive section
    if (archiveData.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Archive</div>';
      for (const name of archiveData) {
        const key = 'archive:' + name;
        const cls = activeItem === key ? ' active' : '';
        html += '<div class="sidebar-item' + cls + '" onclick="selectArchive(\\''+esc(name)+'\\')"><span class="dot dot-archive"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(name)+'</span></div>';
      }
      html += '</div>';
    }

    if (!allChanges.length && !specsData.length && !archiveData.length) {
      html = '<div class="loading">No items found.</div>';
    }

    sb.innerHTML = html;
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML.replace(/'/g, '&#39;').replace(/\\\\/g, '&#92;');
  }

  window.selectChange = function(name, status) {
    activeItem = 'change:' + name;
    renderSidebar();

    const change = [...(changesData.draft||[]),...(changesData.active||[]),...(changesData.completed||[])].find(c => c.name === name);
    const artifacts = change ? change.artifacts : [];

    let tabsHtml = '';
    const defaultFiles = ['proposal.md','design.md','tasks.md'];
    const allFiles = [];
    for (const f of defaultFiles) {
      const a = artifacts.find(ar => ar.name === f);
      allFiles.push({ name: f, exists: a ? a.exists : false });
    }
    for (const a of artifacts) {
      if (!defaultFiles.includes(a.name)) allFiles.push(a);
    }

    for (const f of allFiles) {
      const missCls = f.exists ? '' : ' missing';
      tabsHtml += '<div class="artifact-tab' + missCls + '" data-type="change" data-name="'+esc(name)+'" data-file="'+esc(f.name)+'" onclick="loadArtifact(this)">' + esc(f.name.replace('specs/','').replace('/spec.md','')) + '</div>';
    }

    const main = document.getElementById('main-content');
    main.innerHTML = '<h1>'+esc(name)+'</h1><div class="subtitle">Change &middot; '+status+'</div><div class="artifact-tabs">'+tabsHtml+'</div><div class="content-panel" id="artifact-content"><div class="loading">Select an artifact to view.</div></div>';

    // Auto-load first existing artifact
    const first = allFiles.find(f => f.exists);
    if (first) {
      const tab = main.querySelector('.artifact-tab:not(.missing)');
      if (tab) tab.click();
    }
  };

  window.selectSpec = function(name) {
    activeItem = 'spec:' + name;
    renderSidebar();

    const main = document.getElementById('main-content');
    main.innerHTML = '<h1>'+esc(name)+'</h1><div class="subtitle">Specification</div><div class="content-panel" id="artifact-content"><div class="loading">Loading...</div></div>';
    loadArtifactContent('spec', name, null);
  };

  window.selectArchive = function(name) {
    activeItem = 'archive:' + name;
    renderSidebar();

    const archiveFiles = ['proposal.md','design.md','tasks.md'];
    let tabsHtml = '';
    for (const f of archiveFiles) {
      tabsHtml += '<div class="artifact-tab" data-type="archive" data-name="'+esc(name)+'" data-file="'+esc(f)+'" onclick="loadArtifact(this)">'+esc(f)+'</div>';
    }

    const main = document.getElementById('main-content');
    main.innerHTML = '<h1>'+esc(name)+'</h1><div class="subtitle">Archived Change</div><div class="artifact-tabs">'+tabsHtml+'</div><div class="content-panel" id="artifact-content"><div class="loading">Select an artifact to view.</div></div>';

    // Auto-load proposal
    const tab = main.querySelector('.artifact-tab');
    if (tab) tab.click();
  };

  window.loadArtifact = function(el) {
    if (el.classList.contains('missing')) return;
    const tabs = el.parentElement.querySelectorAll('.artifact-tab');
    tabs.forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const type = el.dataset.type;
    const name = el.dataset.name;
    const file = el.dataset.file;
    loadArtifactContent(type, name, file);
  };

  async function loadArtifactContent(type, name, file) {
    const panel = document.getElementById('artifact-content');
    panel.innerHTML = '<div class="loading">Loading...</div>';
    let url = '/api/artifact?type='+encodeURIComponent(type)+'&name='+encodeURIComponent(name);
    if (file) url += '&file='+encodeURIComponent(file);
    try {
      const data = await fetchJson(url);
      if (data.error) {
        panel.innerHTML = '<p style="color:#f85149">'+esc(data.error)+'</p>';
      } else {
        panel.innerHTML = renderMarkdown(data.content || '');
      }
    } catch(e) {
      panel.innerHTML = '<p style="color:#f85149">Failed to load artifact.</p>';
    }
  }

  function renderMarkdown(md) {
    let html = '';
    const lines = md.split('\\n');
    let i = 0;
    let inList = false;
    let listType = '';

    while (i < lines.length) {
      const line = lines[i];

      // Code fence
      if (line.trim().startsWith('\`\`\`')) {
        if (inList) { html += '</'+listType+'>'; inList = false; }
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('\`\`\`')) {
          codeLines.push(escHtml(lines[i]));
          i++;
        }
        i++; // skip closing fence
        html += '<pre><code>' + codeLines.join('\\n') + '</code></pre>';
        continue;
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\\s+(.+)$/);
      if (headingMatch) {
        if (inList) { html += '</'+listType+'>'; inList = false; }
        const level = headingMatch[1].length;
        html += '<h'+level+'>' + inline(headingMatch[2]) + '</h'+level+'>';
        i++; continue;
      }

      // Horizontal rule
      if (/^(---|\\*\\*\\*|___)\\s*$/.test(line.trim())) {
        if (inList) { html += '</'+listType+'>'; inList = false; }
        html += '<hr>';
        i++; continue;
      }

      // Unordered list / checkbox
      const ulMatch = line.match(/^(\\s*)[-*]\\s+(.*)/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) html += '</'+listType+'>';
          html += '<ul>'; inList = true; listType = 'ul';
        }
        let content = ulMatch[2];
        const cbMatch = content.match(/^\\[([ xX])\\]\\s*(.*)/);
        if (cbMatch) {
          const checked = cbMatch[1].toLowerCase() === 'x' ? ' checked disabled' : ' disabled';
          html += '<li><input type="checkbox"'+checked+'>' + inline(cbMatch[2]) + '</li>';
        } else {
          html += '<li>' + inline(content) + '</li>';
        }
        i++; continue;
      }

      // Ordered list
      const olMatch = line.match(/^(\\s*)\\d+\\.\\s+(.*)/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) html += '</'+listType+'>';
          html += '<ol>'; inList = true; listType = 'ol';
        }
        html += '<li>' + inline(olMatch[2]) + '</li>';
        i++; continue;
      }

      // Close list if not a list item
      if (inList && line.trim() === '') {
        html += '</'+listType+'>'; inList = false;
        i++; continue;
      }

      // Empty line
      if (line.trim() === '') { i++; continue; }

      // Paragraph
      if (inList) { html += '</'+listType+'>'; inList = false; }
      html += '<p>' + inline(line) + '</p>';
      i++;
    }

    if (inList) html += '</'+listType+'>';
    return html;
  }

  function inline(text) {
    let s = escHtml(text);
    // Code (backtick) - must come before bold/italic to avoid conflicts
    s = s.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
    // Bold
    s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    // Italic
    s = s.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
    // Links
    s = s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
    return s;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  init().catch(err => {
    document.getElementById('sidebar-content').innerHTML = '<div class="loading" style="color:#f85149">Error loading data.</div>';
  });
})();
</script>
</body>
</html>`;
}
