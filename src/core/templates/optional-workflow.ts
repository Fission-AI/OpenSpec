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
  const resolved = text.replace(
    CONDITIONAL_PATTERN,
    (_match, workflowId: string, whenInstalled: string, whenMissing: string) =>
      installedWorkflows.has(workflowId) ? whenInstalled : whenMissing
  );

  const residual = RESIDUAL_MARKER_PATTERN.exec(resolved);
  if (residual) {
    throw new Error(
      `Malformed optional-workflow conditional: '${residual[0]}' survived resolution. ` +
        'Each block needs the full [[opsx:if-workflow <id>]] ... [[opsx:else]] ... [[opsx:end]] form.'
    );
  }

  return resolved;
}
