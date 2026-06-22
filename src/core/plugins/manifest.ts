/**
 * Plugin manifest schema, loading, and validation.
 *
 * A manifest is read from a package's `package.json` `"openspec"` key, or from a
 * sibling `openspec.plugin.json` file (the package.json key wins when both exist).
 * Validation never throws to callers expecting a result: failures are returned so
 * an invalid plugin is disabled rather than crashing OpenSpec.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import type { PluginManifest } from './types.js';

export const MANIFEST_FILE_NAME = 'openspec.plugin.json';
export const PACKAGE_MANIFEST_KEY = 'openspec';
export const SUPPORTED_MANIFEST_VERSION = 1;

/**
 * Reserved top-level command names a plugin namespace must not collide with.
 * The runtime augments this with the live command list; this constant is the
 * floor used when a live list is unavailable (e.g. during validation in tests).
 */
export const RESERVED_NAMESPACES: readonly string[] = [
  'archive', 'change', 'completion', 'config', 'context-store', 'experimental',
  'feedback', 'help', 'init', 'initiative', 'instructions', 'list', 'new',
  'plugin', 'schema', 'schemas', 'set', 'show', 'spec', 'status', 'templates',
  'update', 'validate', 'view', '__complete',
];

const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;

// A contributed skill install directory must be a single safe path segment —
// no separators, no "." / "..", no leading dot — so it cannot escape the tool
// skills directory.
const SAFE_DIR_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

/** True when `name` is a single, safe directory segment (no traversal). */
export function isSafeSkillDirName(name: string): boolean {
  return (
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    SAFE_DIR_NAME.test(name)
  );
}

/**
 * True when `source` is a relative path that stays inside the plugin package:
 * not absolute (POSIX or Windows), no drive letter, and no `..` segment.
 */
export function isSafeSkillSource(source: string): boolean {
  if (source.trim() === '') return false;
  if (path.isAbsolute(source)) return false;
  if (source.startsWith('/') || source.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(source)) return false; // Windows drive (C:...)
  const segments = source.split(/[\\/]+/);
  return !segments.some((segment) => segment === '..');
}

const CommandDescriptorSchema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
});

const SkillContributionSchema = z
  .object({
    dir: z.string().min(1),
    source: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (!isSafeSkillDirName(value.dir)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dir'],
        message: `skill "dir" must be a single safe directory name (no path separators, "." or "..")`,
      });
    }
    if (!isSafeSkillSource(value.source)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source'],
        message: `skill "source" must be a relative path inside the package (no absolute paths or "..")`,
      });
    }
  });

/**
 * Zod schema for a plugin manifest. Uses `.passthrough()` so unknown fields from
 * newer manifests survive on older OpenSpec versions.
 */
export const PluginManifestSchema = z
  .object({
    manifestVersion: z.number().int().positive(),
    id: z.string().min(1),
    namespace: z
      .string()
      .min(1)
      .regex(NAMESPACE_PATTERN, 'namespace must be lowercase letters, digits, and dashes'),
    bin: z.string().min(1).optional(),
    binArgs: z.array(z.string().min(1)).min(1).optional(),
    openspecCompat: z.string().min(1),
    displayName: z.string().optional(),
    summary: z.string().optional(),
    commands: z.array(CommandDescriptorSchema).optional(),
    skills: z.array(SkillContributionSchema).optional(),
    workflows: z.array(z.string()).optional(),
    ownsConfigKeys: z.array(z.string()).optional(),
  })
  .passthrough()
  .refine((m) => m.bin !== undefined || m.binArgs !== undefined, {
    message: 'manifest must declare an executable via "bin" or "binArgs"',
  });

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: PluginManifest;
  errors: string[];
}

/**
 * Validate a raw manifest object against the schema and reserved-namespace rules.
 *
 * @param raw - The parsed manifest object.
 * @param reserved - Reserved namespace names to reject (defaults to RESERVED_NAMESPACES).
 */
export function validateManifest(
  raw: unknown,
  reserved: readonly string[] = RESERVED_NAMESPACES
): ManifestValidationResult {
  const parsed = PluginManifestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`
      ),
    };
  }

  const manifest = parsed.data as PluginManifest;
  const errors: string[] = [];

  if (manifest.manifestVersion > SUPPORTED_MANIFEST_VERSION) {
    errors.push(
      `manifestVersion ${manifest.manifestVersion} is newer than supported version ${SUPPORTED_MANIFEST_VERSION}`
    );
  }

  if (reserved.includes(manifest.namespace)) {
    errors.push(`namespace "${manifest.namespace}" is reserved by a core OpenSpec command`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, manifest, errors: [] };
}

export interface LoadedManifest {
  manifest: PluginManifest;
  /** Where the manifest came from, for diagnostics. */
  origin: 'package.json' | 'manifest-file';
  /** Package version, if discoverable from package.json. */
  version?: string;
}

/**
 * Load and validate a manifest from a package/manifest root directory.
 * Returns null when no manifest is present. Throws only on validation failure,
 * with a message safe to surface to the user.
 */
export function loadManifestFromRoot(
  rootDir: string,
  reserved: readonly string[] = RESERVED_NAMESPACES
): LoadedManifest | null {
  const pkgJsonPath = path.join(rootDir, 'package.json');
  let pkgVersion: string | undefined;

  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      pkgVersion = typeof pkg.version === 'string' ? pkg.version : undefined;
      if (pkg[PACKAGE_MANIFEST_KEY] !== undefined) {
        const result = validateManifest(pkg[PACKAGE_MANIFEST_KEY], reserved);
        if (!result.valid) {
          throw new Error(`Invalid OpenSpec plugin manifest: ${result.errors.join('; ')}`);
        }
        return { manifest: result.manifest!, origin: 'package.json', version: pkgVersion };
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Unreadable package.json in ${rootDir}: ${error.message}`);
      }
      throw error;
    }
  }

  const manifestFilePath = path.join(rootDir, MANIFEST_FILE_NAME);
  if (fs.existsSync(manifestFilePath)) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(manifestFilePath, 'utf-8'));
    } catch (error) {
      throw new Error(
        `Unreadable ${MANIFEST_FILE_NAME} in ${rootDir}: ${(error as Error).message}`
      );
    }
    const result = validateManifest(raw, reserved);
    if (!result.valid) {
      throw new Error(`Invalid OpenSpec plugin manifest: ${result.errors.join('; ')}`);
    }
    return { manifest: result.manifest!, origin: 'manifest-file', version: pkgVersion };
  }

  return null;
}

/**
 * True when a package.json object declares an OpenSpec plugin manifest key.
 * Used by auto-detection to filter candidates cheaply without full validation.
 */
export function packageDeclaresPlugin(pkg: Record<string, unknown> | null | undefined): boolean {
  return !!pkg && typeof pkg === 'object' && PACKAGE_MANIFEST_KEY in pkg;
}
