/**
 * Profile System
 *
 * Defines workflow profiles that control which workflows are installed.
 * Profiles determine WHICH workflows; delivery (in global config) determines HOW.
 */

import type { Profile } from './global-config.js';

/**
 * Core workflows included in the 'core' profile.
 * These provide the streamlined experience for new users.
 */
export const CORE_WORKFLOWS = ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] as const;

/**
 * All available workflows in the system.
 */
export const ALL_WORKFLOWS = [
  'propose',
  'explore',
  'new',
  'continue',
  'apply',
  'update',
  'ff',
  'sync',
  'archive',
  'bulk-archive',
  'verify',
  'onboard',
] as const;

export type WorkflowId = (typeof ALL_WORKFLOWS)[number];
export type CoreWorkflowId = (typeof CORE_WORKFLOWS)[number];

/**
 * The router skill's id. The router is the entry point to the workflows, not a
 * workflow a profile picks, so it is in neither list above.
 */
export const ROUTER_WORKFLOW = 'router';

/** Every id that installs a skill: the workflows a profile can pick, and the router. */
export const SKILL_WORKFLOWS = [...ALL_WORKFLOWS, ROUTER_WORKFLOW] as const;
export type SkillWorkflowId = (typeof SKILL_WORKFLOWS)[number];

/**
 * What a profile's workflows install: those workflows and the router. A
 * profile with no workflows installs nothing, so it gets no router either.
 */
export function withRouter(workflows: readonly string[]): readonly string[] {
  if (!workflows.length || workflows.includes(ROUTER_WORKFLOW)) return workflows;
  return [...workflows, ROUTER_WORKFLOW];
}

/**
 * Resolves which workflows should be active for a given profile configuration.
 *
 * - 'core' profile always returns CORE_WORKFLOWS
 * - 'custom' profile returns the provided customWorkflows and required dependencies
 */
export function getProfileWorkflows(
  profile: Profile,
  customWorkflows?: string[]
): readonly string[] {
  if (profile === 'custom') {
    const workflows = customWorkflows ?? [];
    const syncDependentIndex = workflows.findIndex(
      (workflow) => workflow === 'archive' || workflow === 'bulk-archive'
    );

    if (syncDependentIndex !== -1 && !workflows.includes('sync')) {
      return [
        ...workflows.slice(0, syncDependentIndex),
        'sync',
        ...workflows.slice(syncDependentIndex),
      ];
    }

    return workflows;
  }
  return CORE_WORKFLOWS;
}
