# Implementation Tasks

- [ ] **Dependencies & Metadata**
    - [ ] Update `gemini-extension.json` version to match `package.json`.

- [ ] **Documentation Fixes**
    - [ ] Update `GEMINI.md` to clarify Zero-Install workflow (prefer `npx`/MCP over global install).
    - [ ] Update `README.md` to resolve contradictions about installation and directory structure (`.openspec/`).

- [ ] **Security Hardening**
    - [ ] Implement `assertSafePathSegment` in `src/mcp/resources.ts`.
    - [ ] Implement `assertSafeConfigKeyPath` in `src/core/config-logic.ts`.

- [ ] **Core Logic Refactoring**
    - [ ] Refactor `src/core/artifact-logic.ts` to use `resolveOpenSpecDir`.
    - [ ] Fix `setConfigValue` in `src/core/config-logic.ts` to persist validated defaults.
    - [ ] Update `src/core/validation-logic.ts` to accept `projectRoot`.
    - [ ] Fix `AGENTS.md` error handling in `src/core/update-logic.ts`.

- [ ] **Archive Cleanup**
    - [ ] Refactor `openspec/changes/archive/2025-12-21-add-gemini-extension-support/proposal.md`.

- [ ] **Verification**
    - [ ] Run `npm install` to verify dependency fix.
    - [ ] Run `npm test` to ensure no regressions.
    - [ ] Validate changes with `openspec validate fix-pr-488-feedback --strict`.
