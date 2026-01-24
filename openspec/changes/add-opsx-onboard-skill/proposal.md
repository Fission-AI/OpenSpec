## Why

Users who run `openspec init` are left with files but no clear path to actually using the system. There's a gap between "I have OpenSpec set up" and "I understand the workflow." An onboarding skill would guide users through their first complete change cycle on a real task in their codebase, teaching the workflow by doing it.

## What Changes

- Add new `/opsx:onboard` skill that guides users through their first OpenSpec change
- Add corresponding slash command template for editor integrations
- The skill will:
  - Analyze the user's codebase to suggest appropriately-scoped starter tasks
  - Walk through the full workflow (explore → new → proposal → specs → design → tasks → apply → archive)
  - Provide narration explaining each step as it happens
  - Result in a real, implemented change in the user's codebase

## Capabilities

### New Capabilities
- `opsx-onboard-skill`: The onboarding skill that guides users through their first complete OpenSpec workflow cycle with narration and codebase-aware task suggestions

### Modified Capabilities
<!-- No existing specs are being modified - this is purely additive -->

## Impact

- `src/core/templates/skill-templates.ts`: Add `getOnboardSkillTemplate()` and `getOpsxOnboardCommandTemplate()` functions
- `src/core/shared/skill-generation.ts`: Register the new skill and command templates in `getSkillTemplates()` and `getCommandTemplates()`
- Users running `openspec init` or `openspec update` will get the new skill/command files generated
