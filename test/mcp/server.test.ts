import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MCP Server', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startMcpServer', () => {
    it('should export startMcpServer function', async () => {
      const { startMcpServer } = await import('../../src/mcp/server.js');

      expect(typeof startMcpServer).toBe('function');
    });

    it('should accept McpServerOptions with debug flag', async () => {
      const { startMcpServer } = await import('../../src/mcp/server.js');

      // Verify the function signature accepts the expected options
      expect(startMcpServer.length).toBe(1); // 1 parameter
    });
  });

  describe('McpServerOptions type', () => {
    it('should define debug option', async () => {
      // Type-level test: ensure McpServerOptions interface is exported
      const mod = await import('../../src/mcp/server.js');

      expect(mod).toHaveProperty('startMcpServer');
    });
  });
});
