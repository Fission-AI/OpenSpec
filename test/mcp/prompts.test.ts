import { describe, it, expect, beforeEach } from 'vitest';
import { registerPrompts } from '../../src/mcp/prompts.js';
import { FastMCP } from 'fastmcp';

class MockFastMCP {
    prompts: any[] = [];
    addPrompt(prompt: any) {
        this.prompts.push(prompt);
    }
}

describe('MCP Prompts', () => {
    let server: MockFastMCP;

    beforeEach(() => {
        server = new MockFastMCP();
    });

    it('registers expected prompts', () => {
        registerPrompts(server as unknown as FastMCP);

        const names = server.prompts.map(p => p.name);
        expect(names).toContain('openspec_proposal');
        expect(names).toContain('openspec_apply');
        expect(names).toContain('openspec_archive');
    });

    it('prompts load function returns messages with MCP tool instructions', async () => {
        registerPrompts(server as unknown as FastMCP);
        
        const proposalPrompt = server.prompts.find(p => p.name === 'openspec_proposal');
        const result = await proposalPrompt.load();
        
        expect(result.messages).toHaveLength(1);
        const text = result.messages[0].content.text;
        
        // Check for replacement of CLI commands with MCP tools
        expect(text).toContain('openspec_list_changes');
        expect(text).not.toContain('openspec list'); // Should be replaced/not present as primary instruction ideally, 
                                                     // but regex replacement might leave some if strictly looking for full command lines.
                                                     // The toMcpInstructions function replaces specific patterns.
        
        // Check for specific replacements
        expect(text).toContain('openspec_validate_change(name: "');
    });
});
