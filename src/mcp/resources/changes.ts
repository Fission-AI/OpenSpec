/**
 * Changes resources registration.
 *
 * Exposes resources for accessing change proposals:
 * - openspec://changes - List of active changes
 * - openspec://changes/{changeId} - Complete change details
 * - openspec://changes/{changeId}/proposal - Proposal document
 * - openspec://changes/{changeId}/tasks - Tasks checklist
 * - openspec://changes/{changeId}/design - Design document
 * - openspec://changes/{changeId}/specs - List of spec deltas
 * - openspec://changes/{changeId}/specs/{capability} - Individual spec delta
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import type { PathConfig } from '../utils/path-resolver.js';
import {
  getChangesDir,
  getChangePath,
  getChangeProposalPath,
  getChangeTasksPath,
  getChangeDesignPath,
  getChangeSpecsDir,
  getChangeSpecDeltaPath,
} from '../utils/path-resolver.js';

/**
 * Register changes resources.
 */
export function registerChangesResources(
  server: McpServer,
  pathConfig: PathConfig
): void {
  // List all active changes
  server.registerResource(
    'changes-list',
    'openspec://changes',
    {
      title: 'Active Changes',
      description: 'List of all active change proposals',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const changesDir = getChangesDir(pathConfig);

      let changes: string[] = [];
      try {
        const entries = await fs.readdir(changesDir, { withFileTypes: true });
        changes = entries
          .filter((e) => e.isDirectory() && e.name !== 'archive')
          .map((e) => e.name);
      } catch {
        // Directory doesn't exist, return empty list
      }

      const content =
        changes.length > 0
          ? `# Active Changes\n\n${changes
              .map((c) => `- [${c}](openspec://changes/${c})`)
              .join('\n')}`
          : '# Active Changes\n\nNo active changes.';

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

  // Individual change - returns all files
  server.registerResource(
    'change',
    new ResourceTemplate('openspec://changes/{changeId}', {
      list: undefined,
    }),
    {
      title: 'Change Details',
      description: 'Complete change details including proposal, tasks, and design',
      mimeType: 'text/markdown',
    },
    async (uri, { changeId }) => {
      const [proposal, tasks, design] = await Promise.all([
        readFileIfExists(getChangeProposalPath(pathConfig, changeId as string)),
        readFileIfExists(getChangeTasksPath(pathConfig, changeId as string)),
        readFileIfExists(getChangeDesignPath(pathConfig, changeId as string)),
      ]);

      const contents = [];
      if (proposal) {
        contents.push({
          uri: `openspec://changes/${changeId}/proposal`,
          mimeType: 'text/markdown',
          text: proposal,
        });
      }
      if (tasks) {
        contents.push({
          uri: `openspec://changes/${changeId}/tasks`,
          mimeType: 'text/markdown',
          text: tasks,
        });
      }
      if (design) {
        contents.push({
          uri: `openspec://changes/${changeId}/design`,
          mimeType: 'text/markdown',
          text: design,
        });
      }

      if (contents.length === 0) {
        contents.push({
          uri: uri.href,
          mimeType: 'text/markdown',
          text: `# ${changeId}\n\nChange not found.`,
        });
      }

      return { contents };
    }
  );

  // Individual change files
  server.registerResource(
    'change-proposal',
    new ResourceTemplate('openspec://changes/{changeId}/proposal', {
      list: undefined,
    }),
    {
      title: 'Change Proposal',
      description: 'Proposal document',
      mimeType: 'text/markdown',
    },
    async (uri, { changeId }) => {
      const content = await readFileIfExists(
        getChangeProposalPath(pathConfig, changeId as string)
      );
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content || 'Not found',
          },
        ],
      };
    }
  );

  server.registerResource(
    'change-tasks',
    new ResourceTemplate('openspec://changes/{changeId}/tasks', {
      list: undefined,
    }),
    {
      title: 'Change Tasks',
      description: 'Tasks checklist',
      mimeType: 'text/markdown',
    },
    async (uri, { changeId }) => {
      const content = await readFileIfExists(
        getChangeTasksPath(pathConfig, changeId as string)
      );
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content || 'Not found',
          },
        ],
      };
    }
  );

  server.registerResource(
    'change-design',
    new ResourceTemplate('openspec://changes/{changeId}/design', {
      list: undefined,
    }),
    {
      title: 'Change Design',
      description: 'Design document',
      mimeType: 'text/markdown',
    },
    async (uri, { changeId }) => {
      const content = await readFileIfExists(
        getChangeDesignPath(pathConfig, changeId as string)
      );
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content || 'Not found',
          },
        ],
      };
    }
  );

  // Spec deltas list for a change
  server.registerResource(
    'change-specs-list',
    new ResourceTemplate('openspec://changes/{changeId}/specs', {
      list: undefined,
    }),
    {
      title: 'Change Spec Deltas',
      description: 'List of spec deltas in a change proposal',
      mimeType: 'text/markdown',
    },
    async (uri, { changeId }) => {
      const specsDir = getChangeSpecsDir(pathConfig, changeId as string);

      let capabilities: string[] = [];
      try {
        const entries = await fs.readdir(specsDir, { withFileTypes: true });
        capabilities = entries
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
      } catch {
        // Directory doesn't exist, return empty list
      }

      const content =
        capabilities.length > 0
          ? `# Spec Deltas for ${changeId}\n\n${capabilities
              .map(
                (c) =>
                  `- [${c}](openspec://changes/${changeId}/specs/${c})`
              )
              .join('\n')}`
          : `# Spec Deltas for ${changeId}\n\nNo spec deltas defined.`;

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

  // Individual spec delta for a change
  server.registerResource(
    'change-spec-delta',
    new ResourceTemplate('openspec://changes/{changeId}/specs/{capability}', {
      list: undefined,
    }),
    {
      title: 'Spec Delta',
      description: 'Spec delta document for a specific capability',
      mimeType: 'text/markdown',
    },
    async (uri, { changeId, capability }) => {
      const specPath = getChangeSpecDeltaPath(
        pathConfig,
        changeId as string,
        capability as string
      );

      const content = await readFileIfExists(specPath);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content || `Spec delta for ${capability} not found.`,
          },
        ],
      };
    }
  );
}

/**
 * Helper to read a file if it exists, returning null if not found.
 */
async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
