/**
 * Migration Utilities
 *
 * Scans installed workflow artifacts across tools.
 * Called by init and update commands.
 */

import type { AIToolOption } from './config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { WORKFLOW_TO_SKILL_DIR } from './profile-sync-drift.js';
import { ALL_WORKFLOWS } from './profiles.js';
import path from 'path';
import * as fs from 'fs';

/**
 * Scans installed workflow files across all detected tools and returns
 * the union of installed workflow IDs.
 */
export function scanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  const installed = new Set<string>();

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

    for (const workflowId of ALL_WORKFLOWS) {
      const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId];
      const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflowId);
      }
    }

    const adapter = CommandAdapterRegistry.get(tool.value);
    if (!adapter) continue;

    for (const workflowId of ALL_WORKFLOWS) {
      const commandPath = adapter.getFilePath(workflowId);
      const fullPath = path.isAbsolute(commandPath)
        ? commandPath
        : path.join(projectPath, commandPath);
      if (fs.existsSync(fullPath)) {
        installed.add(workflowId);
      }
    }
  }

  return ALL_WORKFLOWS.filter((id) => installed.has(id));
}

// No-op kept for call-site compatibility during transition.
export function migrateIfNeeded(_projectPath: string, _tools: AIToolOption[]): void {}
