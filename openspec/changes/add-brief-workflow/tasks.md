## 1. Workflow Template

- [x] 1.1 Add a brief workflow template module with skill and command variants
- [x] 1.2 Ensure the workflow selects a change using existing OPSX conventions
- [x] 1.3 Instruct agents to read `status --json`, `instructions apply --json`, and all `contextFiles`
- [x] 1.4 Require a static local `brief.html` output with source attribution and no external assets
- [x] 1.5 Include best-effort OS opener behavior with graceful fallback
- [x] 1.6 Add fidelity guardrails for source artifact coverage, inferred impacts, task grouping, and project-neutral HTML output

## 2. Generation Integration

- [x] 2.1 Export the brief workflow template through the template facade
- [x] 2.2 Add `brief` to shared skill and command generation mappings
- [x] 2.3 Add `brief` to `ALL_WORKFLOWS` without adding it to `CORE_WORKFLOWS`
- [x] 2.4 Update workflow-to-skill directory mappings used by init/update/drift detection

## 3. Documentation

- [x] 3.1 Document `/opsx:brief` in command reference tables
- [x] 3.2 Explain when to use brief in the workflow guide
- [x] 3.3 Clarify that brief is an optional review surface, not a source of truth

## 4. Tests

- [x] 4.1 Update profile tests for the new optional workflow count and ordering
- [x] 4.2 Update skill-generation tests to include brief templates and filtering
- [x] 4.3 Update init/update or drift tests affected by the new workflow mapping
- [x] 4.4 Add focused assertions that core profile excludes `brief`
- [x] 4.5 Run targeted tests for profiles, skill generation, and changed init/update behavior
