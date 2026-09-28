import type { ProjectConfig } from './project-config.js';

/**
 * Serialize config to YAML string with helpful comments.
 *
 * @param config - Partial config object (schema required, other fields optional)
 * @returns YAML string ready to write to file
 */
export function serializeConfig(config: Partial<ProjectConfig>): string {
  const lines: string[] = [];

  // Schema (required)
  lines.push(`schema: ${config.schema}`);
  lines.push('');

  if (config.context !== undefined) {
    lines.push('context: |');
    for (const line of config.context.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  } else {
    // Context section with comments
    lines.push('# Project context (optional)');
    lines.push('# Add only details that should shape how OpenSpec artifacts are written.');
    lines.push('# Include constraints an agent cannot infer by reading the code.');
    lines.push('# Keep general project documentation and discoverable codebase facts out.');
    lines.push('# Example:');
    lines.push('#   context: |');
    lines.push('#     Designs and tasks must cover Windows, macOS, and Linux');
    lines.push('#     Write all artifacts in Spanish');
    lines.push('');
  }

  // Rules section with comments
  lines.push('# Per-artifact rules (optional)');
  lines.push('# Add custom rules for specific artifacts.');
  lines.push('# Example:');
  lines.push('#   rules:');
  lines.push('#     proposal:');
  lines.push('#       - Keep proposals under 500 words');
  lines.push('#       - Always include a "Non-goals" section');
  lines.push('#     tasks:');
  lines.push('#       - Break tasks into chunks of max 2 hours');
  lines.push('');

  // Operation guidance section with comments
  lines.push('# Per-operation guidance (optional)');
  lines.push('# Add advisory guidance for how apply and archive work should be conducted.');
  lines.push('# This is separate from artifact rules above.');
  lines.push('# Example:');
  lines.push('#   operations:');
  lines.push('#     apply:');
  lines.push('#       guidance:');
  lines.push('#         - Keep test summaries concise');
  lines.push('#     archive:');
  lines.push('#       guidance:');
  lines.push('#         - Summarize the archive outcome before finishing');

  return lines.join('\n') + '\n';
}
