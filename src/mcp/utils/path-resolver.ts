/**
 * Path resolution utilities for OpenSpec MCP server.
 *
 * Handles OPENSPEC_ROOT and OPENSPEC_AUTO_PROJECT_ROOT environment variables
 * to support different deployment configurations:
 * - Default: Specs in project directory
 * - Fixed root: Centralized spec storage
 * - Auto-project-root: Centralized but organized by project path
 */

import * as path from 'path';
import * as fs from 'fs';

export interface PathConfig {
  /** Root directory where openspec/ folder is located */
  specsRoot: string;
  /** Root directory of the project being worked on */
  projectRoot: string;
  /** Whether auto-project-root mode is enabled */
  isAutoProjectRoot: boolean;
}

/**
 * Resolve OpenSpec paths based on environment configuration.
 *
 * @param projectPath - Optional project directory path (defaults to cwd)
 * @returns PathConfig with resolved specsRoot and projectRoot
 *
 * @example
 * // Default mode (no env vars): specs stored in project
 * resolveOpenSpecPaths('/home/user/myproject')
 * // => { specsRoot: '/home/user/myproject', projectRoot: '/home/user/myproject', isAutoProjectRoot: false }
 *
 * @example
 * // Fixed root mode (OPENSPEC_ROOT=/home/user/.openspec)
 * resolveOpenSpecPaths('/home/user/myproject')
 * // => { specsRoot: '/home/user/.openspec', projectRoot: '/home/user/myproject', isAutoProjectRoot: false }
 *
 * @example
 * // Auto-project-root mode (OPENSPEC_ROOT=/home/user/.openspec, OPENSPEC_AUTO_PROJECT_ROOT=true)
 * resolveOpenSpecPaths('/home/user/code/myproject')
 * // => { specsRoot: '/home/user/.openspec/code/myproject', projectRoot: '/home/user/code/myproject', isAutoProjectRoot: true }
 */
export function resolveOpenSpecPaths(projectPath?: string): PathConfig {
  const openspecRoot = process.env.OPENSPEC_ROOT;
  const autoProjectRoot = process.env.OPENSPEC_AUTO_PROJECT_ROOT === 'true';

  const projectRoot = projectPath ? path.resolve(projectPath) : process.cwd();

  if (!openspecRoot) {
    return { specsRoot: projectRoot, projectRoot, isAutoProjectRoot: false };
  }

  const resolvedOpenspecRoot = path.resolve(openspecRoot);

  if (!autoProjectRoot) {
    return {
      specsRoot: resolvedOpenspecRoot,
      projectRoot,
      isAutoProjectRoot: false,
    };
  }

  const relativeProjectPath = deriveRelativePath(projectRoot);
  const specsRoot = path.join(resolvedOpenspecRoot, relativeProjectPath);
  ensureDirectoryExists(specsRoot);

  return { specsRoot, projectRoot, isAutoProjectRoot: true };
}

function deriveRelativePath(projectRoot: string): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';

  if (homeDir && projectRoot.startsWith(homeDir)) {
    const relativePath = projectRoot.slice(homeDir.length);
    return relativePath.replace(/^[/\\]+/, '');
  }

  return path.basename(projectRoot);
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get the openspec/ directory path.
 *
 * @param config - PathConfig from resolveOpenSpecPaths
 * @returns Absolute path to the openspec/ directory
 *
 * @example
 * // Default mode: specs in project directory
 * getOpenSpecDir({ specsRoot: '/home/user/project', projectRoot: '/home/user/project', isAutoProjectRoot: false })
 * // => '/home/user/project/openspec'
 *
 * @example
 * // Fixed root mode: specs in centralized location
 * getOpenSpecDir({ specsRoot: '/home/user/.openspec', projectRoot: '/home/user/project', isAutoProjectRoot: false })
 * // => '/home/user/.openspec/openspec'
 *
 * @example
 * // Auto-project-root mode: specs organized by project path
 * getOpenSpecDir({ specsRoot: '/home/user/.openspec/code/myapp', projectRoot: '/home/user/code/myapp', isAutoProjectRoot: true })
 * // => '/home/user/.openspec/code/myapp/openspec'
 */
export function getOpenSpecDir(config: PathConfig): string {
  return path.join(config.specsRoot, 'openspec');
}

/**
 * Get the path to a specific change directory.
 *
 * @param config - PathConfig from resolveOpenSpecPaths
 * @param changeId - The change identifier (e.g., 'add-mcp-server')
 * @returns Absolute path to the change directory
 *
 * @example
 * // Default mode
 * getChangePath({ specsRoot: '/home/user/project', projectRoot: '/home/user/project', isAutoProjectRoot: false }, 'add-mcp-server')
 * // => '/home/user/project/openspec/changes/add-mcp-server'
 *
 * @example
 * // Auto-project-root mode
 * getChangePath({ specsRoot: '/home/user/.openspec/code/myapp', projectRoot: '/home/user/code/myapp', isAutoProjectRoot: true }, 'add-mcp-server')
 * // => '/home/user/.openspec/code/myapp/openspec/changes/add-mcp-server'
 */
export function getChangePath(config: PathConfig, changeId: string): string {
  return path.join(getOpenSpecDir(config), 'changes', changeId);
}

/**
 * Get the path to a specific spec file.
 *
 * @param config - PathConfig from resolveOpenSpecPaths
 * @param capability - The capability name (e.g., 'user-auth')
 * @returns Absolute path to the spec.md file
 *
 * @example
 * // Default mode
 * getSpecPath({ specsRoot: '/home/user/project', projectRoot: '/home/user/project', isAutoProjectRoot: false }, 'user-auth')
 * // => '/home/user/project/openspec/specs/user-auth/spec.md'
 *
 * @example
 * // Auto-project-root mode
 * getSpecPath({ specsRoot: '/home/user/.openspec/code/myapp', projectRoot: '/home/user/code/myapp', isAutoProjectRoot: true }, 'user-auth')
 * // => '/home/user/.openspec/code/myapp/openspec/specs/user-auth/spec.md'
 */
export function getSpecPath(config: PathConfig, capability: string): string {
  return path.join(getOpenSpecDir(config), 'specs', capability, 'spec.md');
}

/**
 * Get the specs directory path.
 */
export function getSpecsDir(config: PathConfig): string {
  return path.join(getOpenSpecDir(config), 'specs');
}

/**
 * Get the archive directory path.
 */
export function getArchiveDir(config: PathConfig): string {
  return path.join(getOpenSpecDir(config), 'changes', 'archive');
}

/**
 * Get the changes directory path.
 */
export function getChangesDir(config: PathConfig): string {
  return path.join(getOpenSpecDir(config), 'changes');
}

/**
 * Get the AGENTS.md file path.
 */
export function getAgentsPath(config: PathConfig): string {
  return path.join(getOpenSpecDir(config), 'AGENTS.md');
}

/**
 * Get the project.md file path.
 */
export function getProjectPath(config: PathConfig): string {
  return path.join(getOpenSpecDir(config), 'project.md');
}

/**
 * Get the proposal.md file path for a change.
 */
export function getChangeProposalPath(config: PathConfig, changeId: string): string {
  return path.join(getChangePath(config, changeId), 'proposal.md');
}

/**
 * Get the tasks.md file path for a change.
 */
export function getChangeTasksPath(config: PathConfig, changeId: string): string {
  return path.join(getChangePath(config, changeId), 'tasks.md');
}

/**
 * Get the design.md file path for a change.
 */
export function getChangeDesignPath(config: PathConfig, changeId: string): string {
  return path.join(getChangePath(config, changeId), 'design.md');
}

/**
 * Get the specs directory path within a change.
 */
export function getChangeSpecsDir(config: PathConfig, changeId: string): string {
  return path.join(getChangePath(config, changeId), 'specs');
}

/**
 * Get the spec delta file path for a capability within a change.
 */
export function getChangeSpecDeltaPath(
  config: PathConfig,
  changeId: string,
  capability: string
): string {
  return path.join(getChangeSpecsDir(config, changeId), capability, 'spec.md');
}
