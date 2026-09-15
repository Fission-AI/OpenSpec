/**
 * Optional-Workflow Conditionals
 *
 * Not every workflow is installed. A `custom` profile can ship explore without
 * propose or apply, so a template that always names `/opsx:propose` writes a
 * dead reference for that install.
 *
 * `command-references.ts` rewrites how a reference is spelled; this module
 * decides whether it is emitted at all. Templates author both branches with
 * `optionalWorkflow()`, and `resolveOptionalWorkflows()` keeps one of them at
 * generation time against the installed workflow set.
 */

const CONDITIONAL_PATTERN =
  /\[\[opsx:if-workflow ([a-z-]+)\]\]([\s\S]*?)\[\[opsx:else\]\]([\s\S]*?)\[\[opsx:end\]\]/g;

const RESIDUAL_MARKER_PATTERN = /\[\[opsx:(if-workflow|else|end)/;

/**
 * Authors a passage whose wording depends on whether `workflowId` is installed.
 * Both branches must read correctly on their own.
 *
 * @param workflowId - Workflow id as it appears in ALL_WORKFLOWS (e.g. 'propose')
 * @param whenInstalled - Text to emit when the workflow is part of the install
 * @param whenMissing - Text to emit otherwise
 */
export function optionalWorkflow(
  workflowId: string,
  whenInstalled: string,
  whenMissing: string
): string {
  return `[[opsx:if-workflow ${workflowId}]]${whenInstalled}[[opsx:else]]${whenMissing}[[opsx:end]]`;
}

/**
 * Resolves every `optionalWorkflow()` passage in `text` against the workflows
 * that will actually be installed. Runs before the command-reference
 * transformers, so a reference in a dropped branch never reaches them.
 *
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
      `Malformed optional-workflow conditional: '${residual[0]}' is unresolved. Each block needs the full ` +
        '[[opsx:if-workflow <id>]] ... [[opsx:else]] ... [[opsx:end]] form.'
    );
  }

  return resolved;
}
