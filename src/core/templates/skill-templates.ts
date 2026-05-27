/**
 * Agent Skill Templates
 *
 * Compatibility facade that re-exports split workflow template modules.
 */

export type { SkillTemplate, CommandTemplate } from './types.js';

export { getExploreSkillTemplate, getPastelExploreCommandTemplate } from './workflows/explore.js';
export { getNewChangeSkillTemplate, getPastelNewCommandTemplate } from './workflows/new-change.js';
export { getContinueChangeSkillTemplate, getPastelContinueCommandTemplate } from './workflows/continue-change.js';
export { getApplyChangeSkillTemplate, getPastelApplyCommandTemplate } from './workflows/apply-change.js';
export { getFfChangeSkillTemplate, getPastelFfCommandTemplate } from './workflows/ff-change.js';
export { getSyncSpecsSkillTemplate, getPastelSyncCommandTemplate } from './workflows/sync-specs.js';
export { getArchiveChangeSkillTemplate, getPastelArchiveCommandTemplate } from './workflows/archive-change.js';
export { getBulkArchiveChangeSkillTemplate, getPastelBulkArchiveCommandTemplate } from './workflows/bulk-archive-change.js';
export { getVerifyChangeSkillTemplate, getPastelVerifyCommandTemplate } from './workflows/verify-change.js';
export { getOnboardSkillTemplate, getPastelOnboardCommandTemplate } from './workflows/onboard.js';
export { getProposeSkillTemplate, getPastelProposeCommandTemplate } from './workflows/propose.js';
export { getFeedbackSkillTemplate } from './workflows/feedback.js';

// Trello-specific workflows
export { getTrelloSetupSkillTemplate, getTrelloSetupCommandTemplate } from './workflows/trello-setup.js';
export { getTrelloDraftSkillTemplate, getTrelloDraftCommandTemplate } from './workflows/trello-draft.js';
