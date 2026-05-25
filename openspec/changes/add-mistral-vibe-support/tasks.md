## 1. Configuration Updates

- [ ] 1.1 Add Mistral Vibe entry to AI_TOOLS array in configuration
- [ ] 1.2 Set tool metadata: name='Mistral Vibe', value='vibe', skillsDir='.vibe', detectionPaths=['.vibe/skills']
- [ ] 1.3 Verify Vibe entry is alphabetically placed after 'windsurf'

## 2. Documentation Updates

- [ ] 2.1 Add Mistral Vibe row to tool directory table in documentation
- [ ] 2.2 Add 'vibe' to tool IDs list in documentation
- [ ] 2.3 Verify documentation format matches existing entries

## 3. Verification and Testing

- [ ] 3.1 Run `openspec init --tools vibe` in a test project
- [ ] 3.2 Verify `.vibe/skills/openspec-*/SKILL.md` files are created
- [ ] 3.3 Verify each SKILL.md file has valid format and metadata
- [ ] 3.4 Run `openspec status` and verify Vibe is listed as configured
- [ ] 3.5 Run `openspec update` and verify Vibe skills are refreshed
- [ ] 3.6 Run existing OpenSpec tests to ensure no regressions
- [ ] 3.7 Test on Windows to verify cross-platform path handling
