/**
 * Archive resource registration.
 *
 * Exposes openspec://archive resource that returns a list of archived changes.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { PathConfig } from '../utils/path-resolver.js';
import { getOpenSpecDir } from '../utils/path-resolver.js';

/**
 * Register the archive resource (openspec://archive).
 *
 * Returns a list of archived changes, sorted by name (newest first, assuming date prefix).
 */
export function registerArchiveResource(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerResource(
    'archive',
    'openspec://archive',
    {
      title: 'Archived Changes',
      description: 'List of archived (completed) changes',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const archiveDir = path.join(getOpenSpecDir(pathConfig), 'changes', 'archive');

      let archived: string[] = [];
      try {
        const entries = await fs.readdir(archiveDir, { withFileTypes: true });
        archived = entries
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
          .sort()
          .reverse(); // Newest first (assuming date prefix format)
      } catch {
        // Directory doesn't exist, return empty list
      }

      const content =
        archived.length > 0
          ? `# Archived Changes\n\n${archived.map((a) => `- ${a}`).join('\n')}`
          : '# Archived Changes\n\nNo archived changes yet.';

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
