/**
 * Optional-Workflow Conditionals
 *
 * Not every workflow is installed. The `core` profile ships six of the twelve
 * (`propose`, `explore`, `apply`, `update`, `sync`, `archive`), and a `custom`
 * profile can ship any subset. A template that names `/opsx:continue` is
 * therefore writing a dead reference for anyone whose profile omits it — the
 * agent is told to hand off to a workflow that was never generated (#1734,
 * umbrella #919).
 *
 * `command-references.ts` rewrites how a reference is spelled; this module
 * decides whether it is emitted at all. Templates author both branches with
 * `optionalWorkflow()`, and `resolveOptionalWorkflows()` picks one at
 * generation time against the resolved workflow set, so the generated file
 * states one path instead of asking the model to check availability at runtime.
 */

const OPEN = '[[opsx:if-workflow ';
const OPEN_END = ']]';
const ELSE = '[[opsx:else]]';
const END = '[[opsx:end]]';

/**
 * A conditional that occupies a whole line on its own. Matched first so a
 * branch that resolves to empty takes its line with it — otherwise dropping a
 * table row or a bullet would leave a blank line behind, which markdown reads
 * as the end of the table or list.
 */
const WHOLE_LINE_PATTERN =
  /^([ \t]*)\[\[opsx:if-workflow ([a-z-]+)\]\]([^\n]*?)\[\[opsx:else\]\]([^\n]*?)\[\[opsx:end\]\][ \t]*\r?\n/gm;

const CONDITIONAL_PATTERN =
  /\[\[opsx:if-workflow ([a-z-]+)\]\]([\s\S]*?)\[\[opsx:else\]\]([\s\S]*?)\[\[opsx:end\]\]/g;

/** Any leftover marker, used to fail loudly on malformed authoring. */
const RESIDUAL_MARKER_PATTERN = /\[\[opsx:(if-workflow|else|end)/;

/**
 * Authors a passage whose wording depends on whether `workflowId` is installed.
 *
 * Both branches must read correctly on their own: the generated file contains
 * exactly one of them, with no trace of the other.
 *
 * @param workflowId - Workflow id as it appears in ALL_WORKFLOWS (e.g. 'continue')
 * @param whenInstalled - Text to emit when the workflow is part of the profile
 * @param whenMissing - Text to emit otherwise, typically a CLI fallback
 *
 * @example
 * optionalWorkflow('continue', 'suggest `/opsx:continue`', 'run `openspec status`')
 */
export function optionalWorkflow(
  workflowId: string,
  whenInstalled: string,
  whenMissing: string
): string {
  return `${OPEN}${workflowId}${OPEN_END}${whenInstalled}${ELSE}${whenMissing}${END}`;
}

/**
 * A passage that is dropped entirely when `workflowId` is not installed.
 *
 * Use for a line that only makes sense alongside the workflow it names — a
 * command-reference table row, a bullet listing one workflow. When the
 * conditional is the whole line, the line goes with it rather than leaving a
 * blank one behind.
 *
 * @param workflowId - Workflow id as it appears in ALL_WORKFLOWS
 * @param whenInstalled - Text to emit when the workflow is part of the profile
 */
export function onlyWithWorkflow(workflowId: string, whenInstalled: string): string {
  return optionalWorkflow(workflowId, whenInstalled, '');
}

/**
 * Resolves every `optionalWorkflow()` passage in `text` against the workflows
 * that will actually be installed.
 *
 * Runs before the command-reference transformers, so a reference in a branch
 * that was dropped never reaches them.
 *
 * @param text - Template body, possibly containing conditionals
 * @param installedWorkflows - The resolved workflow set for this installation
 * @returns The body with one branch of each conditional kept
 * @throws If a malformed conditional leaves a marker in the output
 */
export function resolveOptionalWorkflows(
  text: string,
  installedWorkflows: ReadonlySet<string>
): string {
  const wholeLinesResolved = text.replace(
    WHOLE_LINE_PATTERN,
    (
      _match,
      indent: string,
      workflowId: string,
      whenInstalled: string,
      whenMissing: string
    ) => {
      const chosen = installedWorkflows.has(workflowId) ? whenInstalled : whenMissing;
      return chosen === '' ? '' : `${indent}${chosen}\n`;
    }
  );

  const resolved = wholeLinesResolved.replace(
    CONDITIONAL_PATTERN,
    (_match, workflowId: string, whenInstalled: string, whenMissing: string) =>
      installedWorkflows.has(workflowId) ? whenInstalled : whenMissing
  );

  assertWorkflowConditionalsResolved(
    resolved,
    'Malformed optional-workflow conditional'
  );

  return resolved;
}

/**
 * Fails loudly if `text` still carries a conditional marker.
 *
 * Called at the end of resolution to catch a malformed block, and again at the
 * points that write a generated file — so a body that skipped resolution
 * altogether (a generation path that bypassed getSkillTemplates /
 * getCommandTemplates) throws instead of shipping literal markers to a user.
 *
 * @param text - Text about to be written, or just resolved
 * @param reason - What went wrong, used as the message prefix
 * @throws If any `[[opsx:...]]` marker remains
 */
export function assertWorkflowConditionalsResolved(text: string, reason: string): void {
  const residual = RESIDUAL_MARKER_PATTERN.exec(text);
  if (residual) {
    throw new Error(
      `${reason}: '${residual[0]}' is unresolved. Optional-workflow blocks are ` +
        'resolved by getSkillTemplates()/getCommandTemplates() against the installed ' +
        'workflow set, and each needs the full [[opsx:if-workflow <id>]] ... ' +
        '[[opsx:else]] ... [[opsx:end]] form.'
    );
  }
}
