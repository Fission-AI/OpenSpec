# Fix PR 488 Feedback

## Why
Address critical review feedback on PR #488 to ensure the stability, security, and correctness of the MCP Server integration and Gemini Extension.

## What Changes
- **Metadata**: Sync `gemini-extension.json` version to `0.19.0` (matching `package.json`).
- **Documentation**:
    - Clarify "Zero-Install" vs "Global Install" in `GEMINI.md` and `README.md`.
    - Fix documentation to reference `.openspec/` consistently instead of legacy `openspec/`.
- **Security**:
    - **Path Traversal**: Validate user input in `src/mcp/resources.ts` to prevent path traversal in `openspec://` resources.
    - **Prototype Pollution**: Block `__proto__`, `prototype`, `constructor` keys in `src/core/config-logic.ts`.
- **Core Logic**:
    - **Path Resolution**: Replace hardcoded `openspec` strings with `resolveOpenSpecDir` in `src/core/artifact-logic.ts`.
    - **Config Persistence**: Ensure `validateConfig` defaults are persisted in `src/core/config-logic.ts`.
    - **Validation Context**: Update `runBulkValidation` in `src/core/validation-logic.ts` to accept `projectRoot` instead of relying on `process.cwd()`.
    - **Update Logic**: Properly handle errors when writing `AGENTS.md` in `src/core/update-logic.ts`.
- **Archive**:
    - Fix format of `openspec/changes/archive/2025-12-21-add-gemini-extension-support/proposal.md` to match standard.

## Impact
- **Security**: Mitigates high-severity path traversal and prototype pollution risks.
- **Usability**: Ensures documentation matches behavior and prevents installation failures.
- **Correctness**: Guarantees configuration and validation logic works consistently across environments.
