/**
 * Pre-approved tools for generated skills and slash commands, emitted as the
 * `allowed-tools` frontmatter field (Agent Skills standard for SKILL.md;
 * same field for Claude Code slash commands). Scoped to the OpenSpec CLI so
 * agents that honor it stop prompting on each `openspec` call; the field
 * only pre-approves — it does not restrict — so any other tool a skill or
 * command needs (Read, Write, arbitrary Bash for builds/tests) stays
 * available under the user's normal permission settings. Tools that don't
 * recognize the field ignore it.
 */
export const OPENSPEC_CLI_ALLOWED_TOOLS = 'Bash(openspec:*)';
