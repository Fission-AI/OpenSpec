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
 * How one detected tool is told to invoke the workflow.
 */
interface InvocationEntry {
  /** `/opsx:explore`, or `ask Rovo Dev CLI to use the openspec-explore skill`. */
  text: string;
  /** True when `text` is already a sentence naming its own tool. */
  naturalLanguage: boolean;
}

/**
 * One entry per distinct spelling, labeled with the tools it serves when the
 * project's tools disagree.
 *
 * Natural-language tools (no slash surface for skills) are grouped per tool
 * rather than per reference: their text names the tool inside the sentence, so
 * two such tools sharing a reference still need two entries - and appending a
 * `(Tool)` label to a sentence that already says "ask Tool to..." would just
 * repeat it.
 */
function invocationEntries(
  tools: AIToolOption[],
  delivery: Delivery,
  verb: string
): InvocationEntry[] {
  const textToTools = new Map<string, { toolNames: string[]; naturalLanguage: boolean }>();
  for (const tool of tools) {
    const workflowReference = resolveWorkflowReference(tool.value, delivery, canonicalCommand(verb));
    if (!workflowReference) {
      continue;
    }
    const text = workflowReference.naturalLanguage
      ? `ask ${tool.name} to use ${workflowReference.reference}`
      : workflowReference.reference;
    const existing = textToTools.get(text);
    textToTools.set(text, {
      toolNames: [...(existing?.toolNames ?? []), tool.name],
      naturalLanguage: workflowReference.naturalLanguage,
    });
  }
  const entries = [...textToTools.entries()];
  if (entries.length === 1) {
    const [text, { naturalLanguage }] = entries[0];
    return [{ text, naturalLanguage }];
  }
  return entries.map(([text, { toolNames, naturalLanguage }]) => ({
    text: naturalLanguage ? text : `${text} (${toolNames.join(', ')})`,
    naturalLanguage,
  }));
}

/**
 * Turns one entry into an instruction. A slash invocation is something to run;
 * a natural-language reference is already a request, so it is quoted as-is
 * rather than wrapped in a verb that would read as "run ask Tool to...".
 */
function instruction(entry: InvocationEntry, lead: string): string {
  return entry.naturalLanguage
    ? `${lead} ${entry.text}.`
    : `${lead} run ${entry.text} in your assistant.`;
}

/**
 * Builds the answer for a workflow verb typed at the CLI, grounded in what is
 * actually installed in this project.
 *
 * Three cases, in order of what the user can act on:
 * - No OpenSpec tools detected: nothing is installed yet, so point at `init`.
 * - Tools detected but this workflow is not among the installed ones: the
 *   invocation exists only after it is added, so lead with the profile picker
 *   (#1076) and still name the spelling it will answer to.
 * - Otherwise: name the invocation each detected tool answers to.
 *
 * The spelling comes from the tool and the delivery mode, never from whether
 * the workflow happens to be installed - so the two installed/not-installed
 * branches cannot disagree about how the same tool spells the same workflow.
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

  const delivery: Delivery = getGlobalConfig().delivery ?? 'both';
  const entries = invocationEntries(tools, delivery, verb);
  const installed = new Set(safeScanInstalledWorkflows(projectPath, tools));

  if (!installed.has(verb)) {
    const notInstalled = `The ${verb} workflow is not installed in this project.`;
    const addIt = "Fix: run 'openspec config profile' to add it, then";
    if (entries.length > 1) {
      return {
        message,
        details: [notInstalled, `${addIt} use it in your assistant:`, ...indent(entries)],
      };
    }
    // One agreed spelling, or none at all. When no tool has one to offer, the
    // canonical form is the only honest answer - and it is what the workflow
    // will answer to once the profile installs it for a tool that invokes it.
    const entry = entries[0] ?? { text: canonicalCommand(verb), naturalLanguage: false };
    return { message, details: [notInstalled, instruction(entry, addIt)] };
  }

  if (entries.length === 0) {
    // Detected tools, but the delivery mode left none of them with an
    // invocation to name. Stay syntax-neutral rather than invent one.
    return {
      message,
      details: [`Fix: run 'openspec update' to regenerate this project's workflow files.`],
    };
  }
  if (entries.length === 1) {
    return { message, details: [instruction(entries[0], 'Fix:')] };
  }
  return {
    message,
    details: ['Fix: use it in your assistant:', ...indent(entries)],
  };
}

function indent(entries: InvocationEntry[]): string[] {
  return entries.map((entry) => `  ${entry.text}`);
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
