/**
 * Agent Skill Templates
 *
 * Compatibility facade that re-exports split workflow template modules.
 */

export type { SkillTemplate, CommandTemplate } from './types.js';

export { getExploreSkillTemplate, getPsExploreCommandTemplate } from './workflows/explore.js';
export { getNewChangeSkillTemplate, getPsNewCommandTemplate } from './workflows/new-change.js';
export { getContinueChangeSkillTemplate, getPsContinueCommandTemplate } from './workflows/continue-change.js';
export { getApplyChangeSkillTemplate, getPsApplyCommandTemplate } from './workflows/apply-change.js';
export { getFfChangeSkillTemplate, getPsFfCommandTemplate } from './workflows/ff-change.js';
export { getCompleteChangeSkillTemplate, getPsCompleteCommandTemplate } from './workflows/archive-change.js';
export { getBulkArchiveChangeSkillTemplate, getPsBulkArchiveCommandTemplate } from './workflows/bulk-archive-change.js';
export { getVerifyChangeSkillTemplate, getPsVerifyCommandTemplate } from './workflows/verify-change.js';
export { getOnboardSkillTemplate, getPsOnboardCommandTemplate } from './workflows/onboard.js';
export { getProposeSkillTemplate, getPsProposeCommandTemplate } from './workflows/propose.js';
export { getFeedbackSkillTemplate } from './workflows/feedback.js';

// Trello-specific workflows
export { getTrelloSetupSkillTemplate, getTrelloSetupCommandTemplate } from './workflows/trello-setup.js';
export { getTrelloDraftSkillTemplate, getTrelloDraftCommandTemplate } from './workflows/trello-draft.js';
