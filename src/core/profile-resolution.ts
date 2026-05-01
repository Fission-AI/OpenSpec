import {
  getGlobalConfig,
  type Delivery,
  type GlobalConfig,
  type Profile,
} from './global-config.js';
import type { ProjectProfileConfig } from './project-config.js';
import { getProfileWorkflows } from './profiles.js';

/**
 * Scope override for profile resolution.
 *
 * - `global`: ignore project config values and resolve from global/default
 * - `project`: resolve with project-first fallback behavior
 */
export type ConfigScope = 'global' | 'project';

/**
 * Source attribution for resolved profile values.
 */
export type ProfileValueSource = 'cli' | 'project' | 'global' | 'default';

interface ResolvedValue<T> {
  value: T;
  source: ProfileValueSource;
}

function resolveValue<T>(options: {
  cliValue?: T;
  projectValue?: T;
  globalValue?: T;
  defaultValue: T;
  scopeOverride?: ConfigScope;
}): ResolvedValue<T> {
  if (options.cliValue !== undefined) {
    return { value: options.cliValue, source: 'cli' };
  }

  if (options.scopeOverride !== 'global' && options.projectValue !== undefined) {
    return { value: options.projectValue, source: 'project' };
  }

  if (options.globalValue !== undefined) {
    return { value: options.globalValue, source: 'global' };
  }

  return { value: options.defaultValue, source: 'default' };
}

/**
 * Input options for resolving effective profile settings.
 */
export interface ResolveEffectiveProfileSettingsOptions {
  /** Optional scope override for precedence behavior. */
  scopeOverride?: ConfigScope;
  /** Optional direct CLI overrides for profile keys. */
  cliOverrides?: ProjectProfileConfig;
  /** Optional project config values (usually read from openspec/config.yaml). */
  projectConfig?: ProjectProfileConfig | null;
  /** Optional preloaded global config (defaults to getGlobalConfig()). */
  globalConfig?: GlobalConfig;
}

/**
 * Fully resolved profile settings with source attribution per key.
 */
export interface EffectiveProfileSettings {
  profile: Profile;
  delivery: Delivery;
  workflows: string[];
  sources: {
    profile: ProfileValueSource;
    delivery: ProfileValueSource;
    workflows: ProfileValueSource;
  };
}

/**
 * Resolve effective profile settings with deterministic precedence:
 * CLI override > project config > global config > defaults.
 *
 * Resolution is key-by-key to support partial project config fallback.
 */
export function resolveEffectiveProfileSettings(
  options: ResolveEffectiveProfileSettingsOptions = {}
): EffectiveProfileSettings {
  const globalConfig = options.globalConfig ?? getGlobalConfig();
  const projectConfig = options.projectConfig ?? null;
  const cli = options.cliOverrides ?? {};

  const profile = resolveValue<Profile>({
    cliValue: cli.profile,
    projectValue: projectConfig?.profile,
    globalValue: globalConfig.profile,
    defaultValue: 'core',
    scopeOverride: options.scopeOverride,
  });

  const delivery = resolveValue<Delivery>({
    cliValue: cli.delivery,
    projectValue: projectConfig?.delivery,
    globalValue: globalConfig.delivery,
    defaultValue: 'both',
    scopeOverride: options.scopeOverride,
  });

  const configuredWorkflows = resolveValue<string[] | undefined>({
    cliValue: cli.workflows,
    projectValue: projectConfig?.workflows,
    globalValue: globalConfig.workflows,
    defaultValue: undefined,
    scopeOverride: options.scopeOverride,
  });

  return {
    profile: profile.value,
    delivery: delivery.value,
    workflows: [...getProfileWorkflows(profile.value, configuredWorkflows.value)],
    sources: {
      profile: profile.source,
      delivery: delivery.source,
      workflows: profile.value === 'core' ? profile.source : configuredWorkflows.source,
    },
  };
}
