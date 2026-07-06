/**
 * Agent Skill Templates
 *
 * Compatibility facade that re-exports split workflow template modules.
 */

export type { SkillTemplate, CommandTemplate } from './types.js';

export { getExploreSkillTemplate, getClsxExploreCommandTemplate } from './workflows/explore.js';
export { getNewChangeSkillTemplate, getClsxNewCommandTemplate } from './workflows/new-change.js';
export { getContinueChangeSkillTemplate, getClsxContinueCommandTemplate } from './workflows/continue-change.js';
export { getApplyChangeSkillTemplate, getClsxApplyCommandTemplate } from './workflows/apply-change.js';
export { getFfChangeSkillTemplate, getClsxFfCommandTemplate } from './workflows/ff-change.js';
export { getSyncSpecsSkillTemplate, getClsxSyncCommandTemplate } from './workflows/sync-specs.js';
export { getArchiveChangeSkillTemplate, getClsxArchiveCommandTemplate } from './workflows/archive-change.js';
export { getBulkArchiveChangeSkillTemplate, getClsxBulkArchiveCommandTemplate } from './workflows/bulk-archive-change.js';
export { getVerifyChangeSkillTemplate, getClsxVerifyCommandTemplate } from './workflows/verify-change.js';
export { getOnboardSkillTemplate, getClsxOnboardCommandTemplate } from './workflows/onboard.js';
export { getClsxProposeSkillTemplate, getClsxProposeCommandTemplate } from './workflows/propose.js';
export { getCheckReadinessSkillTemplate, getClsxCheckReadinessCommandTemplate } from './workflows/check-readiness.js';
export { getDeepReviewSkillTemplate, getClsxDeepReviewCommandTemplate } from './workflows/deep-review.js';
export { getDiscoverSkillTemplate, getClsxDiscoverCommandTemplate } from './workflows/discover.js';
export { getFeedbackSkillTemplate } from './workflows/feedback.js';
