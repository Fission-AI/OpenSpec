/**
 * Command Generator
 *
 * Functions for generating command files using tool adapters.
 */

import type { CommandContent, ToolCommandAdapter, GeneratedCommand } from './types.js';

/**
 * Generate a single command file using the provided adapter.
 * @param content - The tool-agnostic command content
 * @param adapter - The tool-specific adapter
 * @returns Generated command with path and file content
 */
export function generateCommand(
  content: CommandContent,
  adapter: ToolCommandAdapter
): GeneratedCommand {
  return {
    path: adapter.getFilePath(content.id),
    fileContent: adapter.formatFile(content),
  };
}

/**
 * Generate multiple command files using the provided adapter.
 * @param contents - Array of tool-agnostic command contents
 * @param adapter - The tool-specific adapter
 * @returns Array of generated commands with paths and file contents
 */
export function generateCommands(
  contents: CommandContent[],
  adapter: ToolCommandAdapter
): GeneratedCommand[] {
  return contents.map((content) => generateCommand(content, adapter));
}
