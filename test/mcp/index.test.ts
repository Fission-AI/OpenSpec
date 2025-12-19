import { describe, it, expect } from 'vitest';

describe('MCP module exports', () => {
  it('should export startMcpServer', async () => {
    const mod = await import('../../src/mcp/index.js');

    expect(mod).toHaveProperty('startMcpServer');
    expect(typeof mod.startMcpServer).toBe('function');
  });

  it('should re-export from server module', async () => {
    const indexMod = await import('../../src/mcp/index.js');
    const serverMod = await import('../../src/mcp/server.js');

    expect(indexMod.startMcpServer).toBe(serverMod.startMcpServer);
  });
});
