/**
 * Shared building blocks for the ATD workflow façades.
 *
 * Each façade composes the corresponding generic instruction-body builder
 * with ATD journey naming, the ATD-only schema guard, and step-specific
 * policy. The guard and journey blocks are shared here so every façade
 * carries byte-identical wording.
 */

export const ATD_JOURNEY_SKILLS =
  '`atd-change-triage` → `atd-change-continue` → `atd-change-apply` → `atd-change-verify` → `atd-change-close`';

/**
 * ATD-only schema guard, shaped for the builders' statusGuard slot
 * (leading/trailing newline so it slots between the status step and the
 * following step).
 */
export function buildAtdSchemaGuard(genericWorkflow: string): string {
  return `
   **ATD schema guard**: This workflow only acts on ATD changes. If \`schemaName\` is not \`atd-sdlc\` or \`atd-sdlc-lite\`, STOP — do not modify artifacts, code, specs, tasks, or archive state — and direct the developer to the generic \`${genericWorkflow}\` workflow instead.
`;
}

/**
 * Journey footer naming the façade's position and its hand-off, shaped for
 * the builders' outro slot.
 */
export function buildAtdJourneyFooter(position: number, handOff: string): string {
  return `

**ATD journey**

This is step ${position} of 5 in the ATD journey (triage → continue → apply → verify → close): ${ATD_JOURNEY_SKILLS}.

${handOff}`;
}
