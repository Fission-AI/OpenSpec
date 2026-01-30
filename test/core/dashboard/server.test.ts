import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { startServer, findAvailablePort } from '../../../src/core/dashboard/server.js';

function fetch(url: string): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode || 0, body, headers: res.headers })
      );
    }).on('error', reject);
  });
}

describe('Dashboard server', () => {
  let tempDir: string;
  let openspecDir: string;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-dashboard-server-test-${Date.now()}`);
    openspecDir = path.join(tempDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });

    port = await findAvailablePort(9100, 9200);
    server = await startServer({ port, openspecDir, noOpen: true });

    await new Promise<void>((resolve) => {
      server.listen(port, '127.0.0.1', () => resolve());
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('serves dashboard HTML at /', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('OpenSpec Dashboard');
  });

  it('serves summary API', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/summary`);
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data).toHaveProperty('changes');
    expect(data).toHaveProperty('specs');
    expect(data).toHaveProperty('archive');
  });

  it('serves changes API', async () => {
    const changesDir = path.join(openspecDir, 'changes');
    await fs.mkdir(path.join(changesDir, 'test-change'), { recursive: true });

    const res = await fetch(`http://127.0.0.1:${port}/api/changes`);
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('test-change');
  });

  it('serves specs API', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/specs`);
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(Array.isArray(data)).toBe(true);
  });

  it('serves archive API with pagination', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/archive?limit=10&offset=0`);
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data).toHaveProperty('entries');
    expect(data).toHaveProperty('total');
  });

  it('serves artifact content', async () => {
    const changesDir = path.join(openspecDir, 'changes', 'test');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.writeFile(path.join(changesDir, 'proposal.md'), '# Hello');

    const res = await fetch(
      `http://127.0.0.1:${port}/api/artifact?path=${encodeURIComponent('changes/test/proposal.md')}`
    );
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.html).toContain('<h1>Hello</h1>');
  });

  it('blocks path traversal in artifact API', async () => {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/artifact?path=${encodeURIComponent('../../../etc/passwd')}`
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing artifact path', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/artifact`);
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.status).toBe(404);
  });
});

describe('findAvailablePort', () => {
  it('returns first available port', async () => {
    const port = await findAvailablePort(9300, 9310);
    expect(port).toBeGreaterThanOrEqual(9300);
    expect(port).toBeLessThanOrEqual(9310);
  });

  it('throws when no port is available', async () => {
    // Create servers on a small range
    const servers: http.Server[] = [];
    const startPort = 9400;
    const endPort = 9402;

    for (let p = startPort; p <= endPort; p++) {
      const s = http.createServer();
      await new Promise<void>((resolve) => s.listen(p, '127.0.0.1', () => resolve()));
      servers.push(s);
    }

    try {
      await expect(findAvailablePort(startPort, endPort)).rejects.toThrow('No available port');
    } finally {
      await Promise.all(servers.map((s) => new Promise<void>((r) => s.close(() => r()))));
    }
  });
});
