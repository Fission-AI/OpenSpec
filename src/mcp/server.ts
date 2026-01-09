import { FastMCP } from 'fastmcp';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';

export class OpenSpecMCPServer {
  private server: FastMCP;

  constructor() {
    this.server = new FastMCP({
      name: "OpenSpec",
      version: "0.18.0", // Todo: sync with package.json
    });
  }

  async start() {
    await registerTools(this.server);
    await registerResources(this.server);
    await registerPrompts(this.server);
    
    await this.server.start({
        transportType: 'stdio',
    });
  }
}
