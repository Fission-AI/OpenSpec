/**
 * Command Generator
 *
 * Functions for generating command files using tool adapters.
 */

import type { CommandContent, ToolCommandAdapter, GeneratedCommand } from './types.js';
import { getInvocationStyleForPath } from './invocation.js';
import { transformToHyphenCommands } from '../../utils/command-references.js';

/**
 * Generate a single command file using the provided adapter.
 *
 * Command bodies are authored with `/opsx:<id>` references. Tools whose command
 * files are invoked by filename register `/opsx-<id>` instead, so the body is
 * rewritten to the form that tool answers to before the adapter formats it.
 * Doing it here rather than per adapter keeps every tool in step (#727, #1307);
 * adapters stay pure formatters.
 *
 * @param content - The tool-agnostic command content
 * @param adapter - The tool-specific adapter
 * @returns Generated command with path and file content
 */
export function generateCommand(
  content: CommandContent,
  adapter: ToolCommandAdapter
): GeneratedCommand {
  const filePath = adapter.getFilePath(content.id);
  const formatted =
    getInvocationStyleForPath(filePath) === 'flat'
      ? { ...content, body: transformToHyphenCommands(content.body) }
      : content;

  return {
    path: filePath,
    fileContent: adapter.formatFile(formatted),
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
