/**
 * Validation threshold constants
 */
// Minimum character lengths
export const MIN_WHY_SECTION_LENGTH = 50;
export const MIN_PURPOSE_LENGTH = 50;
// Maximum character/item limits
export const MAX_WHY_SECTION_LENGTH = 1000;
export const MAX_REQUIREMENT_TEXT_LENGTH = 500;
export const MAX_DELTAS_PER_CHANGE = 10;
// Validation messages
export const VALIDATION_MESSAGES = {
    // Required content
    SCENARIO_EMPTY: 'Scenario text cannot be empty',
    REQUIREMENT_EMPTY: 'Requirement text cannot be empty',
    REQUIREMENT_NO_SHALL: 'Requirement must contain SHALL or MUST keyword',
    REQUIREMENT_NO_SCENARIOS: 'Requirement must have at least one scenario',
    SPEC_NAME_EMPTY: 'Spec name cannot be empty',
    SPEC_PURPOSE_EMPTY: 'Purpose section cannot be empty',
    SPEC_NO_REQUIREMENTS: 'Spec must have at least one requirement',
    CHANGE_NAME_EMPTY: 'Change name cannot be empty',
    CHANGE_WHY_TOO_SHORT: `Why section must be at least ${MIN_WHY_SECTION_LENGTH} characters`,
    CHANGE_WHY_TOO_LONG: `Why section should not exceed ${MAX_WHY_SECTION_LENGTH} characters`,
    CHANGE_WHAT_EMPTY: 'What Changes section cannot be empty',
    CHANGE_NO_DELTAS: 'Change must have at least one delta',
    CHANGE_TOO_MANY_DELTAS: `Consider splitting changes with more than ${MAX_DELTAS_PER_CHANGE} deltas`,
    DELTA_SPEC_EMPTY: 'Spec name cannot be empty',
    DELTA_DESCRIPTION_EMPTY: 'Delta description cannot be empty',
    // Warnings
    PURPOSE_TOO_BRIEF: `Purpose section is too brief (less than ${MIN_PURPOSE_LENGTH} characters)`,
    REQUIREMENT_TOO_LONG: `Requirement text is very long (>${MAX_REQUIREMENT_TEXT_LENGTH} characters). Consider breaking it down.`,
    DELTA_DESCRIPTION_TOO_BRIEF: 'Delta description is too brief',
    DELTA_MISSING_REQUIREMENTS: 'Delta should include requirements',
    // Guidance snippets (appended to primary messages for remediation)
    GUIDE_NO_DELTAS: 'No deltas found. Ensure your change has a specs/ directory with capability folders (e.g. specs/http-server/spec.md) containing .md files that use delta headers (## ADDED/MODIFIED/REMOVED/RENAMED Requirements) and that each requirement includes at least one "#### Scenario:" block. Tip: run "openspec change show <change-id> --json --deltas-only" to inspect parsed deltas.',
    GUIDE_MISSING_SPEC_SECTIONS: 'Missing required sections. Expected headers: "## Purpose" and "## Requirements". Example:\n## Purpose\n[brief purpose]\n\n## Requirements\n### Requirement: Clear requirement statement\nUsers SHALL ...\n\n#### Scenario: Descriptive name\n- **WHEN** ...\n- **THEN** ...',
    GUIDE_MISSING_CHANGE_SECTIONS: 'Missing required sections. Expected headers: "## Why" and "## What Changes". Ensure deltas are documented in specs/ using delta headers.',
    GUIDE_SCENARIO_FORMAT: 'Scenarios must use level-4 headers. Convert bullet lists into:\n#### Scenario: Short name\n- **WHEN** ...\n- **THEN** ...\n- **AND** ...',
};
//# sourceMappingURL=constants.js.map