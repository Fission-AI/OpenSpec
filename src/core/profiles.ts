/**
 * Predefined Workflow Profiles
 *
 * Add, remove or edit profiles here. Users select a profile via
 * `pscode init --profile <name>` or `pscode config profile <name>`.
 * The workflow lists are fixed in code — users cannot customise them.
 */

export const ALL_WORKFLOWS = [
  'propose',
  'explore',
  'new',
  'continue',
  'apply',
  'ff',
  'sync',
  'archive',
  'bulk-archive',
  'verify',
  'onboard',
  'trello-setup',
  'draft',
] as const;

export type WorkflowId = (typeof ALL_WORKFLOWS)[number];

export interface ProfileDefinition {
  description: string;
  workflows: readonly WorkflowId[];
}

export const PROFILES = {
  standard: {
    description: 'Padrão — propose, explore, apply, sync, archive',
    workflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
  },
  dixi: {
    description: 'Dixi — padrões e workflows da consultoria Dixi',
    workflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
  },
} as const satisfies Record<string, ProfileDefinition>;

export type ProfileName = keyof typeof PROFILES;

export const DEFAULT_PROFILE: ProfileName = 'standard';

export function getProfileWorkflows(profile: ProfileName): readonly WorkflowId[] {
  return PROFILES[profile].workflows;
}

export function isValidProfile(name: string): name is ProfileName {
  return name in PROFILES;
}
