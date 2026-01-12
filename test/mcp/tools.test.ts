import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTools } from '../../src/mcp/tools.js';
import { FastMCP } from 'fastmcp';

// Mock FastMCP since we only need the addTool method
class MockFastMCP {
    tools: any[] = [];
    addTool(tool: any) {
        this.tools.push(tool);
    }
}

describe('MCP Tools', () => {
    let server: MockFastMCP;

    beforeEach(() => {
        server = new MockFastMCP();
    });

    it('registers all expected tools', () => {
        registerTools(server as unknown as FastMCP);

        const toolNames = server.tools.map(t => t.name);
        expect(toolNames).toContain('openspec_init');
        expect(toolNames).toContain('openspec_update');
        expect(toolNames).toContain('openspec_view');
        expect(toolNames).toContain('openspec_create_change');
        expect(toolNames).toContain('openspec_list_changes');
        expect(toolNames).toContain('openspec_list_specs');
        expect(toolNames).toContain('openspec_show_change');
        expect(toolNames).toContain('openspec_show_spec');
        expect(toolNames).toContain('openspec_validate_change');
        expect(toolNames).toContain('openspec_validate_all');
        expect(toolNames).toContain('openspec_archive_change');
        expect(toolNames).toContain('openspec_config_get');
        expect(toolNames).toContain('openspec_config_set');
        expect(toolNames).toContain('openspec_config_list');
        expect(toolNames).toContain('openspec_artifact_status');
        expect(toolNames).toContain('openspec_artifact_instructions');
        expect(toolNames).toContain('openspec_apply_instructions');
        expect(toolNames).toContain('openspec_list_schemas');
    });

    it('openspec_create_change has correct schema', () => {
        registerTools(server as unknown as FastMCP);
        const tool = server.tools.find(t => t.name === 'openspec_create_change');
        expect(tool).toBeDefined();
        expect(tool.parameters).toBeDefined();
        // Zod schema parsing is internal, but we can check if it exists
    });

    // We can add integration tests here by invoking tool.execute(args)
    // but that would duplicate core logic tests. 
    // The main value here is verifying the mapping exists.
});
