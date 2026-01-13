import { describe, it, expect, beforeEach } from 'vitest';
import { registerResources } from '../../src/mcp/resources.js';
import { FastMCP } from 'fastmcp';

class MockFastMCP {
    resources: any[] = [];
    addResourceTemplate(resource: any) {
        this.resources.push(resource);
    }
}

describe('MCP Resources', () => {
    let server: MockFastMCP;

    beforeEach(() => {
        server = new MockFastMCP();
    });

    it('registers expected resource templates', () => {
        registerResources(server as unknown as FastMCP);

        const templates = server.resources.map(r => r.uriTemplate);
        expect(templates).toContain('openspec://changes/{name}/proposal');
        expect(templates).toContain('openspec://changes/{name}/tasks');
        expect(templates).toContain('openspec://specs/{id}');
    });

    it('resource templates have load functions', () => {
        registerResources(server as unknown as FastMCP);
        server.resources.forEach(r => {
            expect(r.load).toBeInstanceOf(Function);
        });
    });
});
