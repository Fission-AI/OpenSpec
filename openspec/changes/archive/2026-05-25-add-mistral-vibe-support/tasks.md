## 1. Configuration Updates

- [x] 1.1 Add Mistral Vibe entry to AI_TOOLS array in configuration
- [x] 1.2 Set tool metadata: name='Mistral Vibe', value='vibe', skillsDir='.vibe', detectionPaths=['.vibe/skills']
- [x] 1.3 Verify Vibe entry is alphabetically placed after 'Lingma' and before 'OpenCode'

## 2. Documentation Updates

- [x] 2.1 Add Mistral Vibe row to tool directory table in documentation
- [x] 2.2 Add 'vibe' to tool IDs list in documentation
- [x] 2.3 Verify documentation format matches existing entries

## 3. Verification and Testing

- [x] 3.1 Run `openspec init --tools vibe` in a test project
- [x] 3.2 Verify `.vibe/skills/openspec-*/SKILL.md` files are created
- [x] 3.3 Verify each SKILL.md file has valid format and metadata
- [x] 3.4 Run `openspec status` and verify Vibe is listed as configured
- [x] 3.5 Run `openspec update` and verify Vibe skills are refreshed
- [x] 3.6 Run existing OpenSpec tests to ensure no regressions
- [x] 3.7 Test on Windows to verify cross-platform path handling
