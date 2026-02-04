/**
 * Spec Discovery Utility
 *
 * Centralized spec discovery, capability resolution, and structure detection
 * for both flat and hierarchical spec organizations.
 *
 * Supports:
 * - Flat structure: specs/auth/spec.md (capability = "auth")
 * - Hierarchical: specs/_global/testing/spec.md (capability = "_global/testing")
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a discovered spec with its metadata
 */
export interface Spec {
  /** Relative path from specs/ directory (e.g., "_global/testing" or "auth") */
  capability: string;
  /** Absolute path to the spec.md file */
  path: string;
  /** Hierarchy depth (number of path segments) */
  depth: number;
}

/**
 * Represents a spec update operation (delta to main mapping)
 */
export interface SpecUpdate {
  /** Path to source delta spec in change directory */
  source: string;
  /** Path to target main spec */
  target: string;
  /** Capability identifier (relative path) */
  capability: string;
  /** Whether the target spec already exists */
  exists: boolean;
}

/**
 * Configuration for spec structure and validation
 */
export interface SpecStructureConfig {
  /** Structure mode: 'flat', 'hierarchical', or 'auto' (default) */
  structure?: 'flat' | 'hierarchical' | 'auto';
  /** Maximum allowed depth (default: 4) */
  maxDepth?: number;
  /** Allow mixing flat and hierarchical specs (default: true) */
  allowMixed?: boolean;
  /** Enforce naming conventions (default: true) */
  validatePaths?: boolean;
}

/**
 * Validation issue severity levels
 */
export type ValidationLevel = 'ERROR' | 'WARNING';

/**
 * Represents a validation issue found during spec structure validation
 */
export interface ValidationIssue {
  /** Severity level */
  level: ValidationLevel;
  /** Human-readable error message */
  message: string;
  /** Capability that caused the issue (if applicable) */
  capability?: string;
}

/**
 * Recursively find all spec.md files in a directory tree.
 *
 * Discovers specs at any depth and constructs capability names from
 * relative paths. Works with both flat and hierarchical structures.
 *
 * @param baseDir - Base directory to search (typically openspec/specs)
 * @returns Array of discovered specs with metadata
 *
 * @example
 * ```typescript
 * // Flat structure
 * findAllSpecs('/project/openspec/specs')
 * // Returns: [{ capability: 'auth', path: '/project/openspec/specs/auth/spec.md', depth: 1 }]
 *
 * // Hierarchical structure
 * findAllSpecs('/project/openspec/specs')
 * // Returns: [{ capability: '_global/testing', path: '/project/openspec/specs/_global/testing/spec.md', depth: 2 }]
 * ```
 */
export function findAllSpecs(baseDir: string): Spec[] {
  const specs: Spec[] = [];

  /**
   * Recursive walker that traverses directory tree
   */
  function walk(dir: string, relativePath: string = ''): void {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // Directory doesn't exist or is not readable
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      if (entry.isFile() && entry.name === 'spec.md') {
        // Skip spec.md found directly in baseDir (no valid capability)
        if (!relativePath) {
          continue;
        }
        // Found a spec file - capability is the parent directory path
        const depth = relativePath.split(path.sep).length;

        specs.push({
          capability: relativePath,
          path: fullPath,
          depth
        });
      } else if (entry.isDirectory()) {
        // Recurse into subdirectories
        walk(fullPath, relPath);
      }
    }
  }

  walk(baseDir);
  return specs;
}

/**
 * Auto-detect whether spec structure is hierarchical or flat.
 *
 * Considers structure hierarchical if any spec has a path separator
 * in its capability name (indicating nested directories).
 *
 * @param specsDir - Base specs directory to analyze
 * @returns true if hierarchical structure detected, false if flat
 *
 * @example
 * ```typescript
 * // Flat structure (specs/auth/spec.md, specs/payments/spec.md)
 * isSpecStructureHierarchical('/project/openspec/specs') // returns false
 *
 * // Hierarchical structure (specs/_global/testing/spec.md)
 * isSpecStructureHierarchical('/project/openspec/specs') // returns true
 * ```
 */
export function isSpecStructureHierarchical(specsDir: string): boolean {
  const specs = findAllSpecs(specsDir);

  // If any spec has path separator in capability name, it's hierarchical
  return specs.some(s => s.capability.includes(path.sep));
}

/**
 * Find all delta spec updates from a change directory.
 *
 * Maps delta specs to their corresponding main specs using 1:1
 * path-relative mapping. Supports hierarchical structures by
 * replicating the directory structure between change and main specs.
 *
 * @param changeDir - Path to change directory (e.g., openspec/changes/my-change)
 * @param mainSpecsDir - Path to main specs directory (e.g., openspec/specs)
 * @returns Array of spec updates with source, target, and metadata
 *
 * @example
 * ```typescript
 * // Change delta: openspec/changes/my-change/specs/_global/testing/spec.md
 * // Maps to main: openspec/specs/_global/testing/spec.md
 * findSpecUpdates('/project/openspec/changes/my-change', '/project/openspec/specs')
 * // Returns: [{ source: '...', target: '...', capability: '_global/testing', exists: true }]
 * ```
 */
export function findSpecUpdates(changeDir: string, mainSpecsDir: string): SpecUpdate[] {
  const updates: SpecUpdate[] = [];
  const changeSpecsDir = path.join(changeDir, 'specs');

  // Find all delta specs recursively in change directory
  const deltaSpecs = findAllSpecs(changeSpecsDir);

  for (const delta of deltaSpecs) {
    // Map using relative path - preserves hierarchy
    const targetPath = path.join(mainSpecsDir, delta.capability, 'spec.md');

    // Check if target spec already exists
    let exists = false;
    try {
      fs.accessSync(targetPath, fs.constants.F_OK);
      exists = true;
    } catch {
      exists = false;
    }

    updates.push({
      source: delta.path,
      target: targetPath,
      capability: delta.capability,
      exists
    });
  }

  return updates;
}

/**
 * Validate spec structure against configuration rules.
 *
 * Performs validation checks including:
 * - Orphaned specs (spec.md at intermediate directory levels)
 * - Depth limits (warn/error based on maxDepth config)
 * - Naming conventions (lowercase alphanumeric with hyphens/underscores)
 * - Reserved directory names
 *
 * @param specs - Array of specs to validate
 * @param config - Configuration with validation rules
 * @returns Array of validation issues (empty if all valid)
 *
 * @example
 * ```typescript
 * const specs = findAllSpecs('/project/openspec/specs');
 * const config = { maxDepth: 4, validatePaths: true };
 * const issues = validateSpecStructure(specs, config);
 *
 * if (issues.length > 0) {
 *   issues.forEach(issue => {
 *     console.error(`${issue.level}: ${issue.message}`);
 *   });
 * }
 * ```
 */
export function validateSpecStructure(
  specs: Spec[],
  config: SpecStructureConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Apply default config values
  const maxDepth = config.maxDepth ?? 4;
  const validatePaths = config.validatePaths ?? true;

  // Check for orphaned specs (spec.md at intermediate levels)
  const capabilitySet = new Set(specs.map(s => s.capability));

  for (const spec of specs) {
    const segments = spec.capability.split(path.sep);

    // Check all parent paths
    for (let i = 1; i < segments.length; i++) {
      const parentPath = segments.slice(0, i).join(path.sep);

      if (capabilitySet.has(parentPath)) {
        issues.push({
          level: 'ERROR',
          message: `Orphaned spec found at intermediate level "${parentPath}". Specs should only exist at leaf directories. Found both "${path.join(parentPath, 'spec.md')}" and "${path.join(spec.capability, 'spec.md')}".`,
          capability: parentPath,
        });
      }
    }
  }

  // Check depth limits
  const RECOMMENDED_MAX_DEPTH = 3;
  const HARD_LIMIT_DEPTH = 6;

  for (const spec of specs) {
    // Error if exceeds configured maxDepth (capped at hard limit)
    const effectiveMax = Math.min(maxDepth, HARD_LIMIT_DEPTH);

    if (spec.depth > effectiveMax) {
      issues.push({
        level: 'ERROR',
        message: `Spec "${spec.capability}" exceeds maximum depth ${effectiveMax} (actual: ${spec.depth}). Consider simplifying the hierarchy.`,
        capability: spec.capability,
      });
    }
    // Warning if exceeds recommended depth
    else if (spec.depth > RECOMMENDED_MAX_DEPTH && spec.depth <= effectiveMax) {
      issues.push({
        level: 'WARNING',
        message: `Spec "${spec.capability}" has depth ${spec.depth}. Recommended maximum is ${RECOMMENDED_MAX_DEPTH} for maintainability.`,
        capability: spec.capability,
      });
    }
  }

  // Check naming conventions (if enabled)
  if (validatePaths) {
    const VALID_NAME_PATTERN = /^[a-z0-9-_]+$/;
    const RESERVED_NAMES = ['..', '.', '.git', '.gitignore', 'node_modules', '.openspec'];

    for (const spec of specs) {
      const segments = spec.capability.split(path.sep);

      for (const segment of segments) {
        // Check reserved names
        if (RESERVED_NAMES.includes(segment)) {
          issues.push({
            level: 'ERROR',
            message: `Reserved name "${segment}" not allowed in capability "${spec.capability}". Reserved names: ${RESERVED_NAMES.join(', ')}`,
            capability: spec.capability,
          });
          break;
        }

        // Check naming pattern
        if (!VALID_NAME_PATTERN.test(segment)) {
          issues.push({
            level: 'ERROR',
            message: `Invalid segment "${segment}" in capability "${spec.capability}". Use lowercase alphanumeric characters with hyphens or underscores only.`,
            capability: spec.capability,
          });
          break; // Only report once per capability
        }
      }
    }
  }

  return issues;
}
