/**
 * MCP tool: edit
 *
 * Create or update change proposal resources (proposal.md, tasks.md, design.md, spec deltas).
 * This tool enables agents to write files during the proposal workflow.
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import {
  getChangeProposalPath,
  getChangeTasksPath,
  getChangeDesignPath,
  getChangeSpecDeltaPath,
} from '../utils/path-resolver.js';

const ResourceTypeEnum = z.enum(['proposal', 'tasks', 'design', 'spec']);

const BaseInputSchema = z.object({
  changeId: z.string().describe('The change ID (e.g., "add-user-auth")'),
  resourceType: ResourceTypeEnum.describe('Type of resource to create/update'),
  content: z.string().describe('Markdown content to write'),
  capability: z.string().optional().describe('Capability name (required when resourceType is "spec")'),
});

const InputSchema = BaseInputSchema.refine(
  (data) => data.resourceType !== 'spec' || data.capability !== undefined,
  {
    message: 'capability is required when resourceType is "spec"',
    path: ['capability'],
  }
);

type ResourceType = z.infer<typeof ResourceTypeEnum>;

function getSuggestedNextActions(resourceType: ResourceType, resourceUri: string): string[] {
  switch (resourceType) {
    case 'proposal':
      return [
        `Create tasks using edit tool with resourceType='tasks'`,
        `Create spec deltas using edit tool with resourceType='spec'`,
        `Validate with the validate tool`,
      ];
    case 'tasks':
      return [
        `Create spec deltas using edit tool with resourceType='spec'`,
        `Validate with the validate tool`,
      ];
    case 'spec':
      return [
        `Read the resource at ${resourceUri} to verify`,
        `Validate with the validate tool`,
      ];
    case 'design':
      return [`Validate with the validate tool`];
  }
}

function getResourcePath(
  pathConfig: PathConfig,
  changeId: string,
  resourceType: ResourceType,
  capability?: string
): string {
  switch (resourceType) {
    case 'proposal':
      return getChangeProposalPath(pathConfig, changeId);
    case 'tasks':
      return getChangeTasksPath(pathConfig, changeId);
    case 'design':
      return getChangeDesignPath(pathConfig, changeId);
    case 'spec':
      return getChangeSpecDeltaPath(pathConfig, changeId, capability!);
  }
}

function getResourceUri(changeId: string, resourceType: ResourceType, capability?: string): string {
  switch (resourceType) {
    case 'proposal':
      return `openspec://changes/${changeId}/proposal`;
    case 'tasks':
      return `openspec://changes/${changeId}/tasks`;
    case 'design':
      return `openspec://changes/${changeId}/design`;
    case 'spec':
      return `openspec://changes/${changeId}/specs/${capability}`;
  }
}

export function registerEditTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'edit',
    {
      description:
        'Create or update change proposal resources. Use this tool to write proposal.md, tasks.md, design.md, or spec deltas when creating or modifying a change proposal.',
      inputSchema: BaseInputSchema,
    },
    async (input) => {
      const parsed = InputSchema.parse(input);
      const { changeId, resourceType, content, capability } = parsed;

      const filePath = getResourcePath(pathConfig, changeId, resourceType, capability);
      const resourceUri = getResourceUri(changeId, resourceType, capability);

      try {
        // Create directory structure
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });

        // Write the file
        await fs.writeFile(filePath, content, 'utf-8');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `${resourceType} resource created/updated successfully`,
                changeId,
                resourceType,
                capability,
                path: filePath,
                resourceUri,
                suggestedNextActions: getSuggestedNextActions(resourceType, resourceUri),
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                changeId,
                resourceType,
                capability,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
