/**
 * Context loading utilities for OpenSpec MCP server.
 *
 * Provides async helpers to load AGENTS.md and project.md content,
 * with safe fallbacks when files are missing.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getOpenSpecDir, type PathConfig } from './path-resolver.js';
import { TemplateManager } from '../../core/templates/index.js';

/**
 * Load the AGENTS.md workflow instructions.
 *
 * @param pathConfig - PathConfig from resolveOpenSpecPaths
 * @returns The AGENTS.md content, or a default template if not found
 */
export async function loadAgentsMarkdown(pathConfig: PathConfig): Promise<string> {
  const agentsPath = path.join(getOpenSpecDir(pathConfig), 'AGENTS.md');

  try {
    return await fs.readFile(agentsPath, 'utf-8');
  } catch {
    return getDefaultAgentsTemplate();
  }
}

/**
 * Load the project.md context file.
 *
 * @param pathConfig - PathConfig from resolveOpenSpecPaths
 * @returns The project.md content, or a default template if not found
 */
export async function loadProjectMarkdown(pathConfig: PathConfig): Promise<string> {
  const projectPath = path.join(getOpenSpecDir(pathConfig), 'project.md');

  try {
    return await fs.readFile(projectPath, 'utf-8');
  } catch {
    return getDefaultProjectTemplate();
  }
}

function getDefaultAgentsTemplate(): string {
  const templates = TemplateManager.getTemplates();
  const agentsTemplate = templates.find((t) => t.path === 'AGENTS.md');
  if (agentsTemplate && typeof agentsTemplate.content === 'string') {
    return agentsTemplate.content;
  }
  return '# OpenSpec Instructions\n\nOpenSpec has not been initialized.';
}

function getDefaultProjectTemplate(): string {
  const templates = TemplateManager.getTemplates();
  const projectTemplate = templates.find((t) => t.path === 'project.md');
  if (projectTemplate && typeof projectTemplate.content === 'string') {
    return projectTemplate.content;
  }
  return '# Project Context\n\nProject context not available.';
}
