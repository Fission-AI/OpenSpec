# improve-validate-error-messages

## Why

Developers struggle to resolve validation failures because current errors lack actionable guidance. Common issues include: missing deltas, missing required sections, and misformatted scenarios that are silently ignored. Without clear remediation steps, users cannot quickly correct structure or formatting, leading to frustration and rework. Improving error messages with concrete fixes, file/section hints, and suggested commands will significantly reduce time-to-green and make Pastelsdd more approachable.

## What Changes

- Validation errors SHALL include specific remediation steps (what to change and where).
- "No deltas found" error SHALL guide users to create `specs/` with proper delta headers and suggest debug commands.
- Missing required sections (Spec: Purpose/Requirements; Change: Why/What Changes) SHALL include expected header names and a minimal skeleton example.
- Likely misformatted scenarios (bulleted WHEN/THEN/AND) SHALL emit a targeted warning explaining the `#### Scenario:` format and show a conversion template.
- All reported issues SHALL include the source file path and structured location (e.g., `deltas[0].requirements[0]`).
- Non-JSON output SHOULD end with a short "Next steps" footer when invalid.

## Impact

- Affected CLI: validate
- Affected code:
  - `src/commands/validate.ts`
  - `src/core/validation/validator.ts`
  - `src/core/validation/constants.ts`
  - `src/core/parsers/*` (wrapping thrown errors with richer context)


