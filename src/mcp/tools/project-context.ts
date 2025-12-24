/**
 * MCP tool: update_project_context
 *
 * Update the project.md file with project context information.
 * This is a new tool not directly mapped to a CLI command.
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { getOpenSpecDir, getProjectPath } from '../utils/path-resolver.js';

const BaseInputSchema = z.object({
  content: z.string().optional().describe('Full content to write to project.md'),
  sections: z.record(z.string(), z.string()).optional().describe('Sections to update as key-value pairs'),
});

const InputSchema = BaseInputSchema.refine(
  (data) => data.content !== undefined || data.sections !== undefined,
  {
    message: 'Either content or sections must be provided',
  }
);

export function registerProjectContextTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'update_project_context',
    {
      description: 'Update openspec/project.md with project context information. Can update the entire file or specific sections. Use this MCP tool instead of manually editing the file or running CLI commands.',
      inputSchema: BaseInputSchema,
    },
    async (input) => {
      const parsed = InputSchema.parse(input);
      const openspecDir = getOpenSpecDir(pathConfig);
      const projectFilePath = getProjectPath(pathConfig);

      try {
        if (parsed.content) {
          // Write full content
          await fs.mkdir(openspecDir, { recursive: true });
          await fs.writeFile(projectFilePath, parsed.content, 'utf-8');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Project context updated successfully',
                  path: projectFilePath,
                }),
              },
            ],
          };
        } else if (parsed.sections) {
          // Update specific sections
          let currentContent = '';
          try {
            currentContent = await fs.readFile(projectFilePath, 'utf-8');
          } catch {
            // File doesn't exist, start with empty content
            currentContent = '';
          }

          // Simple section replacement: look for ## SectionName and replace until next ##
          let updatedContent = currentContent;
          for (const [sectionName, sectionContent] of Object.entries(parsed.sections)) {
            const sectionHeader = `## ${sectionName}`;
            const sectionRegex = new RegExp(
              `(## ${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([\\s\\S]*?)(?=##|$)`,
              'i'
            );

            if (sectionRegex.test(updatedContent)) {
              // Replace existing section
              updatedContent = updatedContent.replace(
                sectionRegex,
                `${sectionHeader}\n\n${sectionContent}\n\n`
              );
            } else {
              // Append new section
              updatedContent += `\n\n${sectionHeader}\n\n${sectionContent}\n`;
            }
          }

          await fs.mkdir(openspecDir, { recursive: true });
          await fs.writeFile(projectFilePath, updatedContent, 'utf-8');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Project context sections updated successfully',
                  path: projectFilePath,
                  updatedSections: Object.keys(parsed.sections),
                }),
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
