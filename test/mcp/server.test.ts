import { describe, it, expect } from 'vitest';
import { OpenSpecMCPServer } from '../../src/mcp/server.js';

describe('OpenSpecMCPServer', () => {
    it('can be instantiated', () => {
        const server = new OpenSpecMCPServer();
        expect(server).toBeDefined();
        // accessing private 'server' property is not easy in TS without casting
        expect((server as any).server).toBeDefined();
    });
});
