/**
 * Specs resources registration.
 *
 * Exposes openspec://specs (list) and openspec://specs/{capability} (individual) resources.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import type { PathConfig } from '../utils/path-resolver.js';
import { getSpecsDir, getSpecPath } from '../utils/path-resolver.js';

/**
 * Register specs resources:
 * - openspec://specs - List of all specifications
 * - openspec://specs/{capability} - Individual spec content
 */
export function registerSpecsResources(
  server: McpServer,
  pathConfig: PathConfig
): void {
  // List all specs
  server.registerResource(
    'specs-list',
    'openspec://specs',
    {
      title: 'Specifications List',
      description: 'List of all specifications in openspec/specs/',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const specsDir = getSpecsDir(pathConfig);

      let specs: string[] = [];
      try {
        const entries = await fs.readdir(specsDir, { withFileTypes: true });
        specs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
        // Directory doesn't exist, return empty list
      }

      const content =
        specs.length > 0
          ? `# Specifications\n\n${specs
              .map((s) => `- [${s}](openspec://specs/${s})`)
              .join('\n')}`
          : '# Specifications\n\nNo specifications found.';

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    }
  );

  // Individual spec
  server.registerResource(
    'spec',
    new ResourceTemplate('openspec://specs/{capability}', {
      list: undefined,
    }),
    {
      title: 'Specification',
      description: 'Specification document for a specific capability',
      mimeType: 'text/markdown',
    },
    async (uri, { capability }) => {
      const specPath = getSpecPath(pathConfig, capability as string);

      let content: string;
      try {
        content = await fs.readFile(specPath, 'utf-8');
      } catch {
        content = `# ${capability}\n\nSpecification not found.`;
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    }
  );
}
