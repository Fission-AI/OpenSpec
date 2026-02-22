import type { CommandContent } from './command-generation/types.js';
import { AI_TOOLS } from './config.js';
import {
  formatCommandInvocation,
  getCommandReferenceTransformer,
  type CommandReferenceStyle,
} from '../utils/command-references.js';

const DEFAULT_COMMAND_REFERENCE_STYLE: CommandReferenceStyle = 'opsx-colon';

export function getToolCommandReferenceStyle(toolId: string): CommandReferenceStyle {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  return tool?.commandReferenceStyle ?? DEFAULT_COMMAND_REFERENCE_STYLE;
}

export function getToolCommandReferenceTransformer(toolId: string): ((text: string) => string) | undefined {
  return getCommandReferenceTransformer(getToolCommandReferenceStyle(toolId));
}

export function formatToolCommandInvocation(toolId: string, commandId: string): string {
  return formatCommandInvocation(commandId, getToolCommandReferenceStyle(toolId));
}

export function transformCommandContentsForTool(contents: CommandContent[], toolId: string): CommandContent[] {
  const transform = getToolCommandReferenceTransformer(toolId);
  if (!transform) {
    return contents;
  }

  return contents.map((content) => ({
    ...content,
    body: transform(content.body),
  }));
}

export function getDisplayCommandReferenceStyle(toolIds: readonly string[]): CommandReferenceStyle {
  if (toolIds.length === 0) {
    return DEFAULT_COMMAND_REFERENCE_STYLE;
  }

  const styles = new Set(toolIds.map((toolId) => getToolCommandReferenceStyle(toolId)));
  if (styles.size === 1) {
    return [...styles][0];
  }

  return DEFAULT_COMMAND_REFERENCE_STYLE;
}
