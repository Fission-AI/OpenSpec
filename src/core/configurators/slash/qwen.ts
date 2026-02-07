/**
 * Qwen slash command configurator for LightSpec integration.
 * This class handles the generation of Qwen-specific slash command files
 * in the .qwen/commands directory structure.
 * 
 * @implements {SlashCommandConfigurator}
 */
import { TomlSlashCommandConfigurator } from './toml-base.js';
import { SlashCommandId } from '../../templates/index.js';

/** 
 * Mapping of slash command IDs to their corresponding file paths in .qwen/commands directory.
 * @type {Record<SlashCommandId, string>}
 */
const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.qwen/commands/lightspec-proposal.toml',
  apply: '.qwen/commands/lightspec-apply.toml',
  archive: '.qwen/commands/lightspec-archive.toml',
  'context-check': '.qwen/prompts/lightspec-context-check.md'
};

const DESCRIPTIONS: Record<SlashCommandId, string> = {
  proposal: 'Scaffold a new LightSpec change and validate strictly.',
  apply: 'Implement an approved LightSpec change and keep tasks in sync.',
  archive: 'Archive a deployed LightSpec change and update specs.',
  'context-check': 'Validate project context in agent instruction files and help populate missing information.'
};

/**
 * QwenSlashCommandConfigurator class provides integration with Qwen Code
 * by creating the necessary slash command files in the .qwen/commands directory.
 * 
 * The slash commands include:
 * - /lightspec-proposal: Create an LightSpec change proposal
 * - /lightspec-apply: Apply an approved LightSpec change
 * - /lightspec-archive: Archive a deployed LightSpec change
 */
export class QwenSlashCommandConfigurator extends TomlSlashCommandConfigurator {
  /** Unique identifier for the Qwen tool */
  readonly toolId = 'qwen';

  /** Availability status for the Qwen tool */
  readonly isAvailable = true;

  /**
   * Returns the relative file path for a given slash command ID.
   * @param {SlashCommandId} id - The slash command identifier
   * @returns {string} The relative path to the command file
   */
  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getDescription(id: SlashCommandId): string {
    return DESCRIPTIONS[id];
  }
}