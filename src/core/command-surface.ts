import { CommandAdapterRegistry } from './command-generation/index.js';
import { getInvocationForAdapter, type CommandInvocation } from './command-generation/invocation.js';
import type { Delivery } from './global-config.js';
import {
  getSkillReferenceTransformer,
  getTransformerForTool,
  usesNaturalLanguageSkillReferences,
} from '../utils/command-references.js';

export type CommandSurfaceCapability = 'adapter-backed' | 'skills-invocable' | 'none';

/**
 * How the tool spells its OpenSpec commands: the name from the command files
 * its adapter writes, the prefix the adapter declares. Returns undefined for
 * tools with no command adapter, which have no command names to spell.
 */
export function resolveCommandInvocation(toolId: string): CommandInvocation | undefined {
  const adapter = CommandAdapterRegistry.get(toolId);
  return adapter ? getInvocationForAdapter(adapter) : undefined;
}

export function resolveCommandSurfaceCapability(toolId: string): CommandSurfaceCapability {
  if (CommandAdapterRegistry.has(toolId)) {
    return 'adapter-backed';
  }

  if (toolId === 'codex') {
    return 'skills-invocable';
  }

  return 'none';
}

export function shouldGenerateSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery !== 'commands' || resolveCommandSurfaceCapability(toolId) === 'skills-invocable';
}

export function shouldRemoveSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'commands' && resolveCommandSurfaceCapability(toolId) !== 'skills-invocable';
}

export function shouldGenerateCommandsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery !== 'skills' && resolveCommandSurfaceCapability(toolId) === 'adapter-backed';
}

export function shouldReconcileCommandFilesForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'skills' && resolveCommandSurfaceCapability(toolId) === 'adapter-backed';
}

/**
 * How one tool spells an OpenSpec workflow reference, and whether that
 * spelling is a slash invocation or prose.
 */
export interface WorkflowReference {
  /** What the user types or asks for, e.g. `/opsx:propose`, `$openspec-propose`. */
  reference: string;
  /**
   * True when the tool has no slash surface for skills, so the reference reads
   * as prose ("the openspec-propose skill") and must be phrased as a request
   * rather than printed as a command.
   */
  naturalLanguage: boolean;
}

/**
 * Resolves how one tool refers to a workflow under the effective delivery.
 *
 * The rule is the same one init prints in its getting-started hints: a tool
 * that gets command files answers to the command name those files register
 * (`/opsx:propose` when namespaced under `opsx/`, `/opsx-propose` when the
 * filename is the command, `@opsx-propose` for Amazon Q's prompt library); a
 * tool that only gets skills answers to its documented skill invocation
 * (`/openspec-propose`, Kimi Code's `/skill:openspec-propose`, Codex's
 * `$openspec-propose`, or prose for tools with no slash surface).
 *
 * @param toolId - The AI tool identifier (e.g. 'claude', 'kimi')
 * @param delivery - The effective delivery mode
 * @param canonicalCommand - The canonical reference to rewrite, e.g. `/opsx:propose`
 * @returns The tool's spelling, or undefined when the delivery mode leaves
 *          that tool with neither commands nor skills — it has nothing to
 *          point at, so callers must not invent an invocation for it.
 */
export function resolveWorkflowReference(
  toolId: string,
  delivery: Delivery,
  canonicalCommand: string
): WorkflowReference | undefined {
  if (shouldGenerateCommandsForTool(toolId, delivery)) {
    const transformer = getTransformerForTool(
      toolId,
      delivery,
      resolveCommandSurfaceCapability(toolId),
      resolveCommandInvocation(toolId)
    );
    return {
      reference: transformer ? transformer(canonicalCommand) : canonicalCommand,
      naturalLanguage: false,
    };
  }
  if (shouldGenerateSkillsForTool(toolId, delivery)) {
    return {
      reference: getSkillReferenceTransformer(toolId)(canonicalCommand),
      naturalLanguage: usesNaturalLanguageSkillReferences(toolId),
    };
  }
  return undefined;
}
