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
 * - No OpenSpec workflow artifacts at all: the project has never run `init`,
 *   so point at `init`.
 * - Workflows installed, but not this one: the invocation exists only after it
 *   is added, so lead with the profile picker (#1076) and still name the
 *   spelling it will answer to.
 * - Otherwise: name the invocation each detected tool answers to.
 *
 * The first case tests for installed artifacts, not for AI tool directories.
 * `getAvailableTools` reads a bare `.claude/` as Claude Code, which says the
 * user has an assistant and nothing about whether OpenSpec has ever run here;
 * branching on it sent a project that never ran `init` to `openspec config
 * profile`, a command that cannot help until there is something to configure.
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
  const installedByTool = installedWorkflowsByTool(projectPath, tools);
  const installed = new Set([...installedByTool.values()].flatMap((ids) => [...ids]));
  const delivery: Delivery = getGlobalConfig().delivery ?? 'both';
  // Every detected tool, for the two branches where this workflow is installed
  // nowhere: there the question is what the tool will answer to once it is
  // added, which every detected tool can answer.
  const entries = invocationEntries(tools, delivery, verb);

  if (installed.size === 0) {
    // Nothing installed, but a tool may still be detected - a repo with a
    // `.claude/` that has never run init is exactly this case. When one is,
    // name the spelling that tool will answer to rather than the canonical
    // form, so this branch cannot disagree with the other two about how the
    // same tool spells the same workflow.
    const setUp = "Fix: run 'openspec init' to install the workflows, then";
    if (entries.length > 1) {
      return {
        message,
        details: [`${setUp} use it in your assistant:`, ...indent(entries)],
      };
    }
    const entry = entries[0] ?? { text: canonicalCommand(verb), naturalLanguage: false };
    return { message, details: [instruction(entry, setUp)] };
  }

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

  // Installed somewhere, so only the tools that actually hold it may be named.
  // A tool detected from a bare directory has no artifact to invoke.
  const installedEntries = invocationEntries(
    tools.filter((tool) => installedByTool.get(tool.value)?.has(verb)),
    delivery,
    verb
  );

  if (installedEntries.length === 0) {
    // The delivery mode left the holding tools with no invocation to name.
    // Stay syntax-neutral rather than invent one.
    return {
      message,
      details: [`Fix: run 'openspec update' to regenerate this project's workflow files.`],
    };
  }
  if (installedEntries.length === 1) {
    return { message, details: [instruction(installedEntries[0], 'Fix:')] };
  }
  return {
    message,
    details: ['Fix: use it in your assistant:', ...indent(installedEntries)],
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

/**
 * Which workflows each detected tool actually holds.
 *
 * The union answers whether OpenSpec has ever run here; it cannot answer who
 * to name. A repo with `.claude/commands/opsx/explore.md` and a bare
 * `.github/` has GitHub Copilot detected and no Copilot artifacts, so an
 * answer built from the union advertised `/opsx-explore (GitHub Copilot)`, a
 * command that does not exist. Scanning per tool keeps an installed workflow
 * attributed to the tool that holds it.
 */
function installedWorkflowsByTool(
  projectPath: string,
  tools: AIToolOption[]
): Map<string, ReadonlySet<string>> {
  return new Map(
    tools.map((tool) => [tool.value, new Set(safeScanInstalledWorkflows(projectPath, [tool]))])
  );
}

function safeScanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  try {
    return scanInstalledWorkflows(projectPath, tools);
  } catch {
    // Unknown rather than absent: treat every workflow as installed so the
    // guidance names the invocation instead of sending the user to the
    // profile picker, or to `init` over a project that already has one, over
    // an unreadable directory.
    return [...ALL_WORKFLOWS];
  }
}
