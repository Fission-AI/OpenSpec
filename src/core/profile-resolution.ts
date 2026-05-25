import {
  getGlobalConfig,
  type Delivery,
  type GlobalConfig,
  type Profile,
} from './global-config.js';
import type { ProjectProfileConfig } from './project-config.js';
import { getProfileWorkflows } from './profiles.js';

export type ConfigScope = 'user' | 'project';
export type ProfileValueSource = 'cli' | 'project' | 'user' | 'default';

interface ResolvedValue<T> {
  value: T;
  source: ProfileValueSource;
}

function resolveValue<T>(options: {
  cliValue?: T;
  projectValue?: T;
  userValue?: T;
  defaultValue: T;
  scopeOverride?: ConfigScope;
}): ResolvedValue<T> {
  if (options.cliValue !== undefined) {
    return { value: options.cliValue, source: 'cli' };
  }

  if (options.scopeOverride !== 'user' && options.projectValue !== undefined) {
    return { value: options.projectValue, source: 'project' };
  }

  if (options.userValue !== undefined) {
    return { value: options.userValue, source: 'user' };
  }

  return { value: options.defaultValue, source: 'default' };
}

export interface ResolveEffectiveProfileSettingsOptions {
  scopeOverride?: ConfigScope;
  cliOverrides?: ProjectProfileConfig;
  projectConfig?: ProjectProfileConfig | null;
  globalConfig?: GlobalConfig;
}

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
 * CLI override > project config > user config > defaults.
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
    userValue: globalConfig.profile,
    defaultValue: 'core',
    scopeOverride: options.scopeOverride,
  });

  const delivery = resolveValue<Delivery>({
    cliValue: cli.delivery,
    projectValue: projectConfig?.delivery,
    userValue: globalConfig.delivery,
    defaultValue: 'both',
    scopeOverride: options.scopeOverride,
  });

  const configuredWorkflows = resolveValue<string[] | undefined>({
    cliValue: cli.workflows,
    projectValue: projectConfig?.workflows,
    userValue: globalConfig.workflows,
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
