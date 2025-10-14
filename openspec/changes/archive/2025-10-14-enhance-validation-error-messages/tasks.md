## 1. Messaging enhancements
- [x] 1.1 Inventory current validation failures and map each to the desired message improvements.
- [x] 1.2 Implement structured error builders that include file paths, normalized header names, and example fixes.
- [x] 1.3 Ensure `openspec validate --help` and troubleshooting docs mention the richer messages and debug tips.

## 2. Tests
- [x] 2.1 Add unit tests for representative errors (no deltas, missing requirement body, missing scenarios) asserting the new wording.
- [x] 2.2 Add integration coverage verifying the Next steps footer reflects contextual guidance.

## 3. Documentation
- [x] 3.1 Update troubleshooting sections and CLI docs with sample output from the enhanced errors.
- [x] 3.2 Note the change in CHANGELOG or release notes if applicable.
