/**
 * MCP Prompt Templates
 *
 * Provides MCP-adapted prompt content for OpenSpec workflows.
 * These templates reuse slash-command-templates and add an MCP preamble
 * that instructs agents to use MCP resources and tools instead of CLI commands.
 */

import { slashCommandBodies } from '../../core/templates/slash-command-templates.js';

const mcpPreamble = `<mcp_context required="true">
You are using OpenSpec through the MCP (Model Context Protocol) interface.
The instructions below reference CLI commands and filesystem paths for compatibility,
but you MUST use MCP resources and tools instead. Follow the override rules below.
</mcp_context>

<mcp_overrides priority="critical">
These overrides are MANDATORY. When the instructions mention CLI commands or file paths,
translate them to MCP equivalents as specified below.

<resource_mappings>
| Filesystem Reference | MCP Resource |
|---------------------|--------------|
| openspec/AGENTS.md | openspec://instructions |
| openspec/project.md | openspec://project |
| changes/&lt;id&gt;/proposal.md | openspec://changes/{id}/proposal |
| changes/&lt;id&gt;/tasks.md | openspec://changes/{id}/tasks |
| changes/&lt;id&gt;/design.md | openspec://changes/{id}/design |
| openspec/specs/&lt;capability&gt;/spec.md | openspec://specs/{capability} |
| openspec/specs (directory) | openspec://specs |
| openspec/changes (directory) | openspec://changes |
| changes/&lt;id&gt;/specs (directory) | openspec://changes/{id}/specs |
| changes/&lt;id&gt;/specs/&lt;capability&gt;/spec.md | openspec://changes/{id}/specs/{capability} |
</resource_mappings>

<tool_mappings>
| CLI Command | MCP Tool |
|------------|----------|
| openspec list | list tool with specs=false |
| openspec list --specs | list tool with specs=true |
| openspec show &lt;id&gt; | show tool with name=&lt;id&gt; and type='change' |
| openspec show &lt;spec&gt; --type spec | show tool with name=&lt;spec&gt; and type='spec' |
| openspec validate &lt;id&gt; --strict | validate tool with name=&lt;id&gt;, type='change', strict=true |
| openspec validate --strict | validate tool with type='all', strict=true |
| openspec archive &lt;id&gt; --yes | archive tool with name=&lt;id&gt;, updateSpecs=true, dryRun=false |
| openspec archive &lt;id&gt; --skip-specs | archive tool with name=&lt;id&gt;, updateSpecs=false, dryRun=false |
| openspec update | update_project_context tool |
| Write proposal.md | edit tool with changeId, resourceType='proposal', content |
| Write tasks.md | edit tool with changeId, resourceType='tasks', content |
| Write design.md | edit tool with changeId, resourceType='design', content |
| Write spec delta | edit tool with changeId, resourceType='spec', capability, content |
</tool_mappings>

<file_exploration>
When instructions mention shell commands for exploring code or specs:
- Instead of rg/grep on openspec/specs, read openspec://specs resource
- Instead of ls on openspec directories, use the list tool
- Use your AI host's native file exploration tools for codebase inspection
</file_exploration>

<guardrail_override>
When instructions reference openspec/AGENTS.md for conventions, read openspec://instructions instead.
</guardrail_override>
</mcp_overrides>

---

`;

/**
 * Get the MCP-adapted proposal prompt content with preamble.
 */
export function getMcpProposeContent(description?: string): string {
  const header = description
    ? `## Your Task\n\nCreate a new OpenSpec change proposal for: "${description}"\n\n`
    : '## Your Task\n\nCreate a new OpenSpec change proposal.\n\n';
  return `${mcpPreamble}${header}${slashCommandBodies.proposal}`;
}

/**
 * Get the MCP-adapted apply prompt content with preamble.
 */
export function getMcpApplyContent(changeId: string): string {
  return `${mcpPreamble}## Implement Change: ${changeId}\n\n${slashCommandBodies.apply}`;
}

/**
 * Get the MCP-adapted archive prompt content with preamble.
 */
export function getMcpArchiveContent(changeId?: string): string {
  const header = changeId
    ? `## Archive Change: ${changeId}\n\n`
    : '## Archive a Completed Change\n\n';
  return `${mcpPreamble}${header}${slashCommandBodies.archive}`;
}
