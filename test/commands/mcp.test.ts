import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMcpCommand } from '../../src/commands/mcp.js';
import * as mcpModule from '../../src/mcp/index.js';

vi.mock('../../src/mcp/index.js', () => ({
  startMcpServer: vi.fn(),
}));

describe('createMcpCommand', () => {
  let mockStartMcpServer: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartMcpServer = vi.mocked(mcpModule.startMcpServer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('command creation', () => {
    it('should create a command with name "mcp"', () => {
      const command = createMcpCommand();
      expect(command.name()).toBe('mcp');
    });

    it('should have correct description', () => {
      const command = createMcpCommand();
      expect(command.description()).toBe('Start stdio-based MCP server for AI agent integration');
    });

    it('should have --debug option', () => {
      const command = createMcpCommand();
      const opts = command.opts();
      expect(command.options).toHaveLength(1);
      const debugOption = command.options[0];
      expect(debugOption.flags).toContain('--debug');
      expect(debugOption.description).toBe('Enable debug logging to stderr');
    });
  });

  describe('command execution', () => {
    it('should call startMcpServer with debug: false when --debug is not provided', async () => {
      const { Command } = await import('commander');
      const program = new Command();
      const mcpCommand = createMcpCommand();
      program.addCommand(mcpCommand);
      mockStartMcpServer.mockResolvedValue(undefined);

      await program.parseAsync(['node', 'test', 'mcp']);

      expect(mockStartMcpServer).toHaveBeenCalledTimes(1);
      expect(mockStartMcpServer).toHaveBeenCalledWith({
        debug: false,
      });
    });

    it('should call startMcpServer with debug: true when --debug is provided', async () => {
      const { Command } = await import('commander');
      const program = new Command();
      const mcpCommand = createMcpCommand();
      program.addCommand(mcpCommand);
      mockStartMcpServer.mockResolvedValue(undefined);

      await program.parseAsync(['node', 'test', 'mcp', '--debug']);

      expect(mockStartMcpServer).toHaveBeenCalledTimes(1);
      expect(mockStartMcpServer).toHaveBeenCalledWith({
        debug: true,
      });
    });

    it('should handle startMcpServer errors', async () => {
      const { Command } = await import('commander');
      const program = new Command();
      const mcpCommand = createMcpCommand();
      program.addCommand(mcpCommand);
      const error = new Error('Server startup failed');
      mockStartMcpServer.mockRejectedValue(error);

      await expect(program.parseAsync(['node', 'test', 'mcp'])).rejects.toThrow('Server startup failed');
      expect(mockStartMcpServer).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration with Commander.js', () => {
    it('should be registerable with program.addCommand', async () => {
      const { Command } = await import('commander');
      const program = new Command();
      const mcpCommand = createMcpCommand();

      program.addCommand(mcpCommand);

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('mcp');
    });

    it('should have help text with description and options', () => {
      const command = createMcpCommand();
      const helpText = command.helpInformation();

      expect(helpText).toContain('Start stdio-based MCP server');
      expect(helpText).toContain('--debug');
      expect(helpText).toContain('Enable debug logging to stderr');
    });
  });
});
