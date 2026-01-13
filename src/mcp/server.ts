import { FastMCP } from 'fastmcp';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export class OpenSpecMCPServer {
  private server: FastMCP;

  constructor() {
    this.server = new FastMCP({
      name: "OpenSpec",
      version: pkg.version,
    });
  }

  async start() {
    registerTools(this.server);
    registerResources(this.server);
    registerPrompts(this.server);
    
    await this.server.start({
        transportType: 'stdio',
    });
  }
}
