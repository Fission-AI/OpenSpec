/**
 * MCP (Model Context Protocol) Server module.
 *
 * This module exposes OpenSpec capabilities to AI coding assistants via
 * the MCP protocol. It provides resources, tools, and prompts for
 * spec-driven development workflows.
 *
 * @module mcp
 */

export { startMcpServer } from './server.js';
export type { McpServerOptions } from './server.js';
