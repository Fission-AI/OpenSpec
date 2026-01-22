/**
 * Command Generation Module
 *
 * Generic command generation system with tool-specific adapters.
 *
 * Usage:
 * ```typescript
 * import { generateCommands, CommandAdapterRegistry, type CommandContent } from './command-generation/index.js';
 *
 * const contents: CommandContent[] = [...];
 * const adapter = CommandAdapterRegistry.get('cursor');
 * if (adapter) {
 *   const commands = generateCommands(contents, adapter);
 *   // Write commands to disk
 * }
 * ```
 */

// Types
export type {
  CommandContent,
  ToolCommandAdapter,
  GeneratedCommand,
} from './types.js';

// Registry
export { CommandAdapterRegistry } from './registry.js';

// Generator functions
export { generateCommand, generateCommands } from './generator.js';

// Adapters (for direct access if needed)
export { claudeAdapter, cursorAdapter, windsurfAdapter } from './adapters/index.js';
