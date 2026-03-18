# Tasks — schema-instruction-scenario-tags

## 1. Update `specs` instruction in schema.yaml

- [x] 1.1. Open `schemas/spec-driven/schema.yaml`, locate the `specs` instruction block (lines 34-81)
- [x] 1.2. After "MODIFIED requirements workflow" (lines 54-58), add "Scenario-level modification" subsection:
  - Document `(MODIFIED)` tag syntax: `#### Scenario: Name (MODIFIED)`
  - Document `(REMOVED)` tag syntax: `#### Scenario: Name (REMOVED)`
  - Explain: unmatched main scenarios are PRESERVED when tags are used
  - Add WARNING: without tags, full-block replacement destroys unincluded scenarios
- [x] 1.3. Update "Common pitfall" line (line 60) to reference scenario-level tags as the safe alternative
- [x] 1.4. Add a MODIFIED example to the Example section (lines 63-79) showing scenario tags:
  ```
  ## MODIFIED Requirements
  
  ### Requirement: User Authentication
  Users MUST authenticate before accessing protected resources.
  
  #### Scenario: Login with MFA (MODIFIED)
  - WHEN user enters valid credentials
  - THEN system MUST require MFA verification
  ```

## 2. Verification

- [x] 2.1. Run `openspec validate schema-instruction-scenario-tags` → PASSED
- [x] 2.2. Run `openspec instructions specs --change "schema-instruction-scenario-tags"` and verify the instruction includes the new tag guidance
- [x] 2.3. Build and test: `npm run build` ✅ PASSED. Tests: 1336 passed, 11 failed (pre-existing timeouts on branch, confirmed by stash+run isolation)
- [ ] 2.4. Create PR to upstream OpenSpec project
