import type { GitSchemaSource } from './types.js';

const SCHEMA_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function isValidSchemaSourceName(name: string): boolean {
  return (
    name !== '__proto__' &&
    name !== 'prototype' &&
    name !== 'constructor' &&
    SCHEMA_NAME_PATTERN.test(name)
  );
}

export type GitSourceValidation = 'valid' | 'credentials' | 'transport';

export function validateGitSource(value: string): GitSourceValidation {
  if (
    value.length === 0 ||
    value.startsWith('-') ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /^[a-z]:[\\/]/i.test(value) ||
    /^[a-z][a-z0-9+.-]*::/i.test(value)
  ) {
    return 'transport';
  }
  if (
    !value.includes('://') &&
    /^(?:[^/@:\s]+@)?[^/:\s]+:.+$/.test(value)
  ) {
    return 'valid';
  }
  try {
    const url = new URL(value);
    if (!['https:', 'ssh:', 'file:'].includes(url.protocol)) {
      return 'transport';
    }
    if (
      (url.protocol === 'https:' && (url.username.length > 0 || url.password.length > 0)) ||
      url.password.length > 0
    ) {
      return 'credentials';
    }
    return 'valid';
  } catch {
    return 'transport';
  }
}

export function parseSchemaSources(
  raw: unknown,
  warn: (message: string) => void
): Record<string, GitSchemaSource> | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    warn("Invalid 'schemaSources' field in config (must be an object)");
    return undefined;
  }

  const sources: Record<string, GitSchemaSource> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (!isValidSchemaSourceName(name)) {
      warn(`Invalid schema source name '${name}' (must be kebab-case)`);
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      warn(`Invalid schema source '${name}' (must be an object)`);
      continue;
    }
    const candidate = value as Record<string, unknown>;
    let valid = true;
    for (const field of ['git', 'ref', 'path'] as const) {
      if (typeof candidate[field] !== 'string' || candidate[field].length === 0) {
        warn(`Invalid '${field}' for schema source '${name}' (must be a non-empty string)`);
        valid = false;
      }
    }
    if (!valid) {
      continue;
    }
    const git = candidate.git as string;
    const gitValidation = validateGitSource(git);
    if (gitValidation === 'credentials') {
      warn(`Credentials are not allowed in Git URL for schema source '${name}'`);
      continue;
    }
    if (gitValidation === 'transport') {
      warn(
        `Unsupported Git source for schema source '${name}' (use HTTPS, SSH, scp-style SSH, or file URL)`
      );
      continue;
    }
    sources[name] = {
      git,
      ref: candidate.ref as string,
      path: candidate.path as string,
    };
  }

  return Object.keys(sources).length > 0 ? sources : undefined;
}
