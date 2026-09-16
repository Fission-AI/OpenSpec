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

/** A single well-formed marker, in any position. */
const MARKER_PATTERN = /\[\[opsx:(?:if-workflow [a-z-]+|else|end)\]\]/g;

/** Anything that opens like a marker, well-formed or not. */
const MARKER_LIKE_PATTERN = /\[\[opsx:/;

/**
 * Rejects a malformed conditional before any branch is chosen.
 *
 * Checking after resolution is not enough: the unselected branch is discarded
 * first, so a truncated block inside it would pass for one profile and throw
 * for another — the exact profile-dependent behavior this module exists to
 * remove. Authoring is either valid for every profile or valid for none.
 *
 * @param text - Template body as authored
 * @throws If a marker is unrecognized, or the blocks are not a flat sequence
 *         of if / else / end
 */
function assertConditionalsWellFormed(text: string): void {
  const kinds: Array<'if' | 'else' | 'end'> = [];
  const withoutMarkers = text.replace(MARKER_PATTERN, (marker) => {
    kinds.push(marker.startsWith(OPEN) ? 'if' : marker === ELSE ? 'else' : 'end');
    return '';
  });

  const unrecognized = MARKER_LIKE_PATTERN.exec(withoutMarkers);
  if (unrecognized) {
    throw new Error(
      `Malformed optional-workflow conditional: unrecognized marker at '${withoutMarkers
        .slice(unrecognized.index, unrecognized.index + 40)
        .split('\n')[0]}'. Markers are [[opsx:if-workflow <id>]], [[opsx:else]] and [[opsx:end]].`
    );
  }

  for (let i = 0; i < kinds.length; i += 3) {
    if (kinds[i] !== 'if' || kinds[i + 1] !== 'else' || kinds[i + 2] !== 'end') {
      throw new Error(
        'Malformed optional-workflow conditional: markers are out of order or a ' +
          'block is incomplete. Each block needs the full [[opsx:if-workflow <id>]] ' +
          '... [[opsx:else]] ... [[opsx:end]] form, and blocks cannot nest.'
      );
    }
  }
}

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
  assertConditionalsWellFormed(text);

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
