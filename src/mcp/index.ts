import { OpenSpecMCPServer } from './server.js';

async function main() {
  const server = new OpenSpecMCPServer();
  await server.start();
}

main().catch((error) => {
  console.error("Failed to start OpenSpec MCP Server:", error);
  process.exit(1);
});
