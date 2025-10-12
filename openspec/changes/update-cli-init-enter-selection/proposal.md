## Why
- Users frequently scroll to a tool and press Enter without toggling it, resulting in no configuration changes.
- The current workflow deviates from common CLI expectations where Enter confirms the highlighted item.
- Aligning behavior with user expectations reduces friction during onboarding.

## What Changes
- Update the init wizard so pressing Enter on a highlighted tool selects it before moving to the review step.
- Adjust interactive instructions to clarify Enter selects the current tool and Space still toggles selections.
- Refresh specs to capture the clarified behavior for the interactive menu.

## Impact
- Users who press Enter without toggling now configure the highlighted tool instead of exiting with no selections.
- Spacebar multi-select support remains unchanged for power users.
- Documentation better reflects how the wizard behaves.
