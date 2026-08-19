/**
 * Defense-in-depth for model-selected skills.
 *
 * Slash commands are explicit invocations, so this guidance is intentionally
 * added only to skill templates.
 */
export const SKILL_ACTIVATION_GUARD = `**Activation check:** Use this skill only for OpenSpec work. Before continuing, confirm at least one of these conditions: the current project has an \`openspec/\` directory; \`openspec context --json\` resolves a configured OpenSpec store; the user selected a registered OpenSpec store; or the user explicitly invoked this skill or asked to use OpenSpec. If none applies, stop using this skill and continue with the user's request normally.`;
