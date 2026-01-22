/**
 * Command Adapter Registry
 *
 * Centralized registry for tool command adapters.
 * Similar pattern to existing SlashCommandRegistry in the codebase.
 */

import type { ToolCommandAdapter } from './types.js';
import { claudeAdapter } from './adapters/claude.js';
import { cursorAdapter } from './adapters/cursor.js';
import { windsurfAdapter } from './adapters/windsurf.js';

/**
 * Registry for looking up tool command adapters.
 */
export class CommandAdapterRegistry {
  private static adapters: Map<string, ToolCommandAdapter> = new Map();

  // Static initializer - register built-in adapters
  static {
    CommandAdapterRegistry.register(claudeAdapter);
    CommandAdapterRegistry.register(cursorAdapter);
    CommandAdapterRegistry.register(windsurfAdapter);
  }

  /**
   * Register a tool command adapter.
   * @param adapter - The adapter to register
   */
  static register(adapter: ToolCommandAdapter): void {
    CommandAdapterRegistry.adapters.set(adapter.toolId, adapter);
  }

  /**
   * Get an adapter by tool ID.
   * @param toolId - The tool identifier (e.g., 'claude', 'cursor')
   * @returns The adapter or undefined if not registered
   */
  static get(toolId: string): ToolCommandAdapter | undefined {
    return CommandAdapterRegistry.adapters.get(toolId);
  }

  /**
   * Get all registered adapters.
   * @returns Array of all registered adapters
   */
  static getAll(): ToolCommandAdapter[] {
    return Array.from(CommandAdapterRegistry.adapters.values());
  }

  /**
   * Check if an adapter is registered for a tool.
   * @param toolId - The tool identifier
   * @returns True if an adapter exists
   */
  static has(toolId: string): boolean {
    return CommandAdapterRegistry.adapters.has(toolId);
  }
}
