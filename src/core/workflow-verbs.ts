/**
 * Workflow Verbs Typed At The CLI
 *
 * OpenSpec's workflows (`propose`, `explore`, `apply`, ...) run inside the
 * user's AI assistant, not in the terminal. Users and agents nonetheless say
 * and type "openspec propose" (it is the natural way to name the thing), and
 * the bare `error: unknown command 'propose'` that came back taught them
 * nothing. Agents in particular read that failure as permission to hand-build
 * the artifacts with `openspec new change` plus manual file writes, bypassing
 * the workflow entirely (#1221).
 *
 * So the verbs are registered as hidden commands whose whole job is to answer
 * the question: this is a workflow, here is how *your* tools invoke it. That
 * mirrors the treatment retired flags already get in the CLI: keep the name
 * reachable so it can explain itself instead of failing generically.
 */

import * as fs from 'fs';
import type { AIToolOption } from './config.js';
import { getAvailableTools } from './available-tools.js';
import { getGlobalConfig, getGlobalConfigPath, type Delivery } from './global-config.js';
import { scanInstalledWorkflows } from './migration.js';
import { ALL_WORKFLOWS, getProfileWorkflows } from './profiles.js';
import {
  resolveWorkflowReference,
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
} from './command-surface.js';
import { getInstalledWorkflowsForTool } from './profile-sync-drift.js';

/**
 * Workflow ids that the CLI already uses for real commands. `openspec new`,
 * `openspec update`, and `openspec archive` do their own work, so those names
 * are never rerouted to workflow guidance; the CLI command wins, as it
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
 * actually installed in this project and in what `init` or `update` would do
 * with the global config.
 *
 * In order of what the user can act on:
 * - No OpenSpec workflow artifacts at all: point at `init` (after `config
 *   profile` when the profile leaves this workflow out).
 * - Some tool holds the artifact its spelling names: name that invocation.
 * - The profile leaves this workflow out: point at `config profile`.
 * - The profile selects it but the files do not match (not installed yet, or
 *   installed on the surface a changed delivery no longer uses): point at
 *   `update`, or at the delivery setting when update would leave the tools
 *   nothing.
 *
 * An invocation is named only when a tool will answer to it. With no tool to
 * resolve a spelling for, the answer stops after the setup instruction rather
 * than guess one: `/opsx:<verb>` is Claude's spelling, not a universal one.
 *
 * The first case tests for installed artifacts, not for AI tool directories.
 * `getAvailableTools` reads a bare `.claude/` as Claude Code, which says the
 * user has an assistant and nothing about whether OpenSpec has ever run here.
 *
 * @param verb - A workflow id from WORKFLOW_VERBS
 * @param projectPath - Directory to inspect for installed tools and workflows
 */
export function getWorkflowVerbGuidance(verb: string, projectPath: string): WorkflowVerbGuidance {
  const message = `'${verb}' is an OpenSpec workflow, not a CLI command. Workflows run inside your AI assistant.`;
  const tools = safeDetectTools(projectPath);
  const installedByTool = installedWorkflowsByTool(projectPath, tools);
  const installed = new Set([...installedByTool.values()].flatMap((ids) => [...ids]));
  // Tools OpenSpec has written files for: the ones `update` acts on.
  const configuredTools = tools.filter((tool) => (installedByTool.get(tool.value)?.size ?? 0) > 0);
  const desired = resolveDesiredConfig(projectPath, configuredTools, installed);

  if (installed.size === 0) {
    if (!desired.workflows.has(verb)) {
      return {
        message,
        details: [
          `The ${verb} workflow is not in your profile.`,
          "Fix: run 'openspec config profile' to add it, then 'openspec init' to install it.",
        ],
      };
    }
    // init sets up the detected tools, so their spellings are the ones it
    // will produce.
    return withInvocations(
      message,
      [],
      "Fix: run 'openspec init' to install the workflows",
      invocationEntries(tools, desired.delivery, verb)
    );
  }

  // Only a tool that holds the file its spelling names can be told to use it.
  // A tool detected from a bare directory, or one whose files predate a
  // delivery change, has nothing that answers to that spelling yet.
  const invocable = configuredTools.filter((tool) =>
    holdsInvocableArtifact(projectPath, tool, desired.delivery, verb)
  );
  const invocableEntries = invocationEntries(invocable, desired.delivery, verb);
  if (invocableEntries.length === 1) {
    return { message, details: [instruction(invocableEntries[0], 'Fix:')] };
  }
  if (invocableEntries.length > 1) {
    return {
      message,
      details: ['Fix: use it in your assistant:', ...indent(invocableEntries)],
    };
  }

  // What each configured tool will answer to once its files match the config.
  const pendingEntries = invocationEntries(configuredTools, desired.delivery, verb);

  if (!desired.workflows.has(verb)) {
    return withInvocations(
      message,
      [`The ${verb} workflow is not installed in this project.`],
      "Fix: run 'openspec config profile' to add it",
      pendingEntries
    );
  }

  if (pendingEntries.length === 0) {
    // update would remove what these tools hold and generate nothing, then say
    // to change delivery. Say that here instead of promising update helps.
    const names = configuredTools.map((tool) => tool.name).join(', ');
    return {
      message,
      details: [
        `Delivery is set to '${desired.delivery}', which gives ${names} no workflow files.`,
        "Fix: run 'openspec config set delivery both', then 'openspec update'.",
      ],
    };
  }

  return withInvocations(
    message,
    ['This project does not match your global OpenSpec config yet.'],
    "Fix: run 'openspec update' to apply it",
    pendingEntries
  );
}

/**
 * A setup instruction, followed by the invocation it leads to when there is
 * one. With no entries the instruction stands alone.
 */
function withInvocations(
  message: string,
  preamble: string[],
  lead: string,
  entries: InvocationEntry[]
): WorkflowVerbGuidance {
  if (entries.length === 0) {
    return { message, details: [...preamble, `${lead}.`] };
  }
  if (entries.length === 1) {
    return { message, details: [...preamble, instruction(entries[0], `${lead}, then`)] };
  }
  return {
    message,
    details: [...preamble, `${lead}, then use it in your assistant:`, ...indent(entries)],
  };
}

/**
 * Whether the tool holds the file its spelling under this delivery refers to:
 * the command file when the tool gets commands, the skill otherwise. This is
 * the same split `resolveWorkflowReference` spells from.
 */
function holdsInvocableArtifact(
  projectPath: string,
  tool: AIToolOption,
  delivery: Delivery,
  verb: string
): boolean {
  const includeCommands = shouldGenerateCommandsForTool(tool.value, delivery);
  const includeSkills = !includeCommands && shouldGenerateSkillsForTool(tool.value, delivery);
  if (!includeCommands && !includeSkills) {
    return false;
  }
  try {
    return getInstalledWorkflowsForTool(projectPath, tool.value, { includeSkills, includeCommands }).includes(
      verb as (typeof ALL_WORKFLOWS)[number]
    );
  } catch {
    // Unknown rather than absent, as in safeScanInstalledWorkflows.
    return true;
  }
}

/**
 * The profile and delivery `init` or `update` would apply here.
 *
 * Mirrors migrateIfNeeded without writing anything: a global config with no
 * `profile` field is migrated on the next init/update to a custom profile of
 * exactly the installed workflows, and, when `delivery` is also unset, to the
 * delivery the installed files imply. Reading the defaulted config instead
 * would call a working install drifted.
 */
function resolveDesiredConfig(
  projectPath: string,
  configuredTools: AIToolOption[],
  installed: ReadonlySet<string>
): { workflows: ReadonlySet<string>; delivery: Delivery } {
  const config = getGlobalConfig();
  const raw = readRawGlobalConfig();
  if (raw.profile !== undefined || installed.size === 0) {
    return {
      workflows: new Set(getProfileWorkflows(config.profile ?? 'core', config.workflows)),
      delivery: config.delivery ?? 'both',
    };
  }
  let delivery: Delivery = config.delivery ?? 'both';
  if (raw.delivery === undefined) {
    const holds = (surface: { includeSkills: boolean; includeCommands: boolean }) =>
      configuredTools.some((tool) => {
        try {
          return getInstalledWorkflowsForTool(projectPath, tool.value, surface).length > 0;
        } catch {
          return false;
        }
      });
    const hasSkills = holds({ includeSkills: true, includeCommands: false });
    const hasCommands = holds({ includeSkills: false, includeCommands: true });
    delivery = hasSkills && hasCommands ? 'both' : hasCommands ? 'commands' : 'skills';
  }
  return { workflows: installed, delivery };
}

function readRawGlobalConfig(): Record<string, unknown> {
  try {
    const configPath = getGlobalConfigPath();
    return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  } catch {
    return {};
  }
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
