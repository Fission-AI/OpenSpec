/**
 * Workflow Verbs Typed At The CLI
 *
 * OpenSpec's workflows (`propose`, `explore`, `apply`, ...) run inside the
 * user's AI assistant, not in the terminal. Users and agents nonetheless say
 * and type "openspec propose" — it is the natural way to name the thing — and
 * the bare `error: unknown command 'propose'` that came back taught them
 * nothing. Agents in particular read that failure as permission to hand-build
 * the artifacts with `openspec new change` plus manual file writes, bypassing
 * the workflow entirely (#1221).
 *
 * So the verbs are registered as hidden commands whose whole job is to answer
 * the question: this is a workflow, here is how *your* tools invoke it. That
 * mirrors the treatment retired flags already get in the CLI — keep the name
 * reachable so it can explain itself instead of failing generically.
 */

import type { AIToolOption } from './config.js';
import { getAvailableTools } from './available-tools.js';
import { getGlobalConfig, type Delivery } from './global-config.js';
import { scanInstalledWorkflows } from './migration.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { resolveWorkflowReference } from './command-surface.js';

/**
 * Workflow ids that the CLI already uses for real commands. `openspec new`,
 * `openspec update`, and `openspec archive` do their own work, so those names
 * are never rerouted to workflow guidance — the CLI command wins, as it
 * always has.
 */
const CLI_RESERVED_WORKFLOW_IDS = new Set<string>(['new', 'update', 'archive']);

/**
 * The workflow ids reachable as bare CLI verbs. Every workflow whose name is
 * not already a CLI command; see CLI_RESERVED_WORKFLOW_IDS for the ones that
 * are.
 */
export const WORKFLOW_VERBS: readonly string[] = ALL_WORKFLOWS.filter(
  (workflowId) => !CLI_RESERVED_WORKFLOW_IDS.has(workflowId)
);

/**
 * The canonical reference every generated file is authored with. Per-tool
 * spellings are rewritten from this form.
 */
function canonicalCommand(verb: string): string {
  return `/opsx:${verb}`;
}

export interface WorkflowVerbGuidance {
  /** The headline: what went wrong, in one sentence. */
  message: string;
  /** Supporting lines, already ordered; may be empty. */
  details: string[];
}

/**
 * One invocation line per distinct spelling, labeled with the tools it serves
 * when the project's tools disagree.
 *
 * Natural-language tools (no slash surface for skills) are grouped per tool
 * rather than per reference: their line names the tool inside the sentence, so
 * two such tools sharing a reference still need two lines.
 */
function invocationLines(
  tools: AIToolOption[],
  delivery: Delivery,
  verb: string
): string[] {
  const lineToTools = new Map<string, string[]>();
  for (const tool of tools) {
    const workflowReference = resolveWorkflowReference(tool.value, delivery, canonicalCommand(verb));
    if (!workflowReference) {
      continue;
    }
    const line = workflowReference.naturalLanguage
      ? `ask ${tool.name} to use ${workflowReference.reference}`
      : workflowReference.reference;
    lineToTools.set(line, [...(lineToTools.get(line) ?? []), tool.name]);
  }
  if (lineToTools.size === 1) {
    return [...lineToTools.keys()];
  }
  return [...lineToTools.entries()].map(([line, toolNames]) => `${line} (${toolNames.join(', ')})`);
}

/**
 * Builds the answer for a workflow verb typed at the CLI, grounded in what is
 * actually installed in this project.
 *
 * Three cases, in order of what the user can act on:
 * - No OpenSpec tools detected: nothing is installed yet, so point at `init`.
 * - Tools detected but this workflow is not among the installed ones: the
 *   invocation would be dead text, so point at the profile picker (#1076).
 * - Otherwise: name the invocation each detected tool answers to.
 *
 * @param verb - A workflow id from WORKFLOW_VERBS
 * @param projectPath - Directory to inspect for installed tools and workflows
 */
export function getWorkflowVerbGuidance(verb: string, projectPath: string): WorkflowVerbGuidance {
  const message = `'${verb}' is an OpenSpec workflow, not a CLI command. Workflows run inside your AI assistant.`;
  const tools = safeDetectTools(projectPath);

  if (tools.length === 0) {
    return {
      message,
      details: [
        `Fix: run 'openspec init' to install the workflows, then invoke ${canonicalCommand(verb)} in your assistant.`,
      ],
    };
  }

  const installed = new Set(safeScanInstalledWorkflows(projectPath, tools));
  if (!installed.has(verb)) {
    return {
      message,
      details: [
        `The ${verb} workflow is not installed in this project.`,
        `Fix: run 'openspec config profile' to add it, then invoke ${canonicalCommand(verb)} in your assistant.`,
      ],
    };
  }

  const delivery: Delivery = getGlobalConfig().delivery ?? 'both';
  const lines = invocationLines(tools, delivery, verb);
  if (lines.length === 0) {
    // Detected tools, but the delivery mode left none of them with an
    // invocation to name. Stay syntax-neutral rather than invent one.
    return {
      message,
      details: [`Fix: run 'openspec update' to regenerate this project's workflow files.`],
    };
  }
  if (lines.length === 1) {
    return { message, details: [`Fix: run ${lines[0]} in your assistant.`] };
  }
  return {
    message,
    details: ['Fix: run it in your assistant:', ...lines.map((line) => `  ${line}`)],
  };
}

/**
 * Detection walks the project directory, and this runs on an error path: a
 * permission error or an unreadable directory must not replace the guidance
 * with a stack trace. An empty list degrades to the `init` wording, which is
 * still true and still actionable.
 */
function safeDetectTools(projectPath: string): AIToolOption[] {
  try {
    return getAvailableTools(projectPath);
  } catch {
    return [];
  }
}

function safeScanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  try {
    return scanInstalledWorkflows(projectPath, tools);
  } catch {
    // Unknown rather than absent: treat every workflow as installed so the
    // guidance names the invocation instead of sending the user to the
    // profile picker over an unreadable directory.
    return [...ALL_WORKFLOWS];
  }
}
