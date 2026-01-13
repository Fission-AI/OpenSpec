import { OpenSpecMCPServer } from '../mcp/server.js';

export class ServeCommand {
  async execute(): Promise<void> {
    const server = new OpenSpecMCPServer();
    await server.start();
  }
}
