---
"@fission-ai/openspec": minor
---

Add OPSX experimental workflow commands and enhanced artifact system

**New Commands:**
- `/opsx:ff` - Fast-forward through artifact creation, generating all needed artifacts in one go
- `/opsx:sync` - Sync delta specs from a change to main specs
- `/opsx:archive` - Archive completed changes with smart sync check

**Artifact Workflow Enhancements:**
- Schema-aware apply instructions with inline guidance and XML output
- Agent schema selection for experimental artifact workflow
- Per-change schema metadata via `.openspec.yaml` files
- Agent Skills for experimental artifact workflow
- Instruction loader for template loading and change context
- Restructured schemas as directories with templates

**Improvements:**
- Enhanced list command with last modified timestamps and sorting
- Change creation utilities for better workflow support

**Fixes:**
- Normalize paths for cross-platform glob compatibility
- Allow REMOVED requirements when creating new spec files
