# Add Git Integration to OpenSpec Workflow

## Why

OpenSpec currently scaffolds change proposals and manages specs, but doesn't integrate with Git branching workflows. This leads to:
- Changes implemented directly on main branch (not best practice)
- Manual branch creation and management (cognitive overhead)
- Inconsistent workflows across team members
- Spec changes not separated from implementation in Git history

Other spec-driven frameworks (spec-kit) provide Git integration. OpenSpec should follow software development best practices by automating branch management for spec-driven development.

## What Changes

- **Automatic branching**: Create `spec/<change-id>` and `feature/<change-id>` branches
- **Auto-commits**: Commit proposals and archives automatically
- **Branch conflict handling**: Prompt users when branches exist
- **Default branch detection**: Auto-detect main/master from Git config
- **Opt-out support**: `--no-git` flag for manual control
- **Graceful degradation**: Continue without Git if not available

### Workflow Changes

**Phase 1: Spec Proposal & Review**
- `openspec proposal` creates `spec/<change-id>` branch
- Auto-commits proposal files
- User creates PR for spec review
- Specs merge to main after approval

**Phase 2: Implementation**
- `openspec apply` creates `feature/<change-id>` branch from main
- User implements tasks and commits code
- User creates PR for implementation review

**Phase 3: Archive**
- `openspec archive` commits archive changes on feature branch
- Archive commit becomes part of implementation PR
- Single merge to main includes: code + archive + updated specs

## Impact

**Affected specs:**
- `cli-proposal` - Proposal command with Git integration
- `cli-apply` - Apply command with Git integration
- `cli-archive` - Archive command with Git integration
- `openspec-conventions` - Git workflow documentation

**Affected code:**
- `src/utils/git.ts` - New Git utilities module
- `src/utils/git-integration.ts` - New Git integration helpers
- `src/core/init.ts` - Git integration prompt during init
- `src/cli/index.ts` - Add `--no-git` flags to commands
- `src/core/templates/` - Update templates with Git workflow docs

**User experience:**
- **Non-breaking**: Existing workflows continue to work
- **Opt-in**: Git integration only activates in Git repositories
- **User control**: PR creation, archive timing, Git hooks left to user
- **Better practices**: Encourages spec review before implementation
