/**
 * Command Generation Types
 *
 * Tool-agnostic interfaces for command generation.
 * These types separate "what to generate" from "how to format it".
 */

/**
 * Tool-agnostic command data.
 * Represents the content of a command without any tool-specific formatting.
 */
export interface CommandContent {
  /** Command identifier (e.g., 'explore', 'apply', 'new') */
  id: string;
  /** Human-readable name (e.g., 'OpenSpec Explore') */
  name: string;
  /** Brief description of command purpose */
  description: string;
  /** Grouping category (e.g., 'Workflow') */
  category: string;
  /** Array of tag strings */
  tags: string[];
  /** The command instruction content (body text) */
  body: string;
}

/**
 * Per-tool formatting strategy.
 * Each AI tool implements this interface to handle its specific file path
 * and frontmatter format requirements.
 */
export interface ToolCommandAdapter {
  /** Tool identifier matching AIToolOption.value (e.g., 'claude', 'cursor') */
  toolId: string;
  /**
   * Returns the file path for a command.
   * @param commandId - The command identifier (e.g., 'explore')
   * @returns Path from project root (e.g., '.claude/commands/opsx/explore.md').
   *          May be absolute for tools with global-scoped prompts (e.g., Codex).
   */
  getFilePath(commandId: string): string;
  /**
   * Formats the complete file content including frontmatter.
   * @param content - The tool-agnostic command content
   * @returns Complete file content ready to write
   */
  formatFile(content: CommandContent): string;
}

/**
 * Result of generating a command file.
 */
export interface GeneratedCommand {
  /** File path from project root, or absolute for global-scoped tools */
  path: string;
  /** Complete file content (frontmatter + body) */
  fileContent: string;
}
