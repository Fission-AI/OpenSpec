# Design: Add /opsx:verify Skill

## Architecture Decision: Dynamic Generation via Setup Command

### Context

All existing opsx experimental skills (explore, new, continue, apply, ff, sync, archive) are dynamically generated when users run `openspec artifact-experimental-setup`. They are not manually created files checked into the repository.

### Decision

**Integrate verify into the existing artifact-experimental-setup system rather than creating static skill files.**

### Rationale

1. **Consistency**: All 7 existing opsx skills follow this pattern. Adding verify as the 8th skill should follow the same architecture.

2. **Maintainability**: Template functions in `skill-templates.ts` are the single source of truth. Changes to skill definitions automatically propagate to all users when they re-run setup.

3. **Distribution**: Users get the verify skill automatically when running `openspec artifact-experimental-setup`, just like all other opsx skills. No special installation steps needed.

4. **Versioning**: Skills are generated from the installed npm package version, ensuring consistency between CLI version and skill behavior.

### Implementation Approach

#### 1. Template Functions

Add two template functions to `src/core/templates/skill-templates.ts`:

```typescript
export function getVerifyChangeSkillTemplate(): SkillTemplate
export function getOpsxVerifyCommandTemplate(): CommandTemplate
```

These return the skill definition (for Agent Skills) and slash command definition (for explicit invocation).

#### 2. Setup Integration

Update `artifactExperimentalSetupCommand()` in `src/commands/artifact-workflow.ts`:

- Import both template functions
- Add verify to the `skills` array (position 8)
- Add verify to the `commands` array (position 8)
- Update help text to list `/opsx:verify`

#### 3. Generated Artifacts

When users run `openspec artifact-experimental-setup`, the command creates:

- `.claude/skills/openspec-verify-change/SKILL.md` - Agent Skills format
- `.claude/commands/opsx/verify.md` - Slash command format

Both are generated from the template functions, with YAML frontmatter automatically added.

### Alternatives Considered

**Alternative 1: Static skill files in repository**

Create `.claude/skills/openspec-verify-change/SKILL.md` as a static file in the OpenSpec repository.

**Rejected because:**
- Inconsistent with all other opsx skills
- Requires users to manually copy/update files
- Versioning becomes complicated (repo version vs installed package version)
- Breaks the established pattern

**Alternative 2: Separate verify setup command**

Add `openspec setup-verify` as a separate command.

**Rejected because:**
- Fragments the setup experience
- Users would need to run multiple commands
- Doesn't scale if we add more skills in the future
- Goes against the "setup once, get everything" philosophy

### Trade-offs

**Advantages:**
- Consistent with existing architecture
- Zero additional setup burden for users
- Easy to update and maintain
- Automatic version compatibility

**Disadvantages:**
- Slightly more complex initial implementation (template functions + integration)
- Requires understanding the setup system (but that's already documented)

### Verification

The implementation correctly follows this design if:

1. Both template functions exist in `skill-templates.ts`
2. Verify appears in both skills and commands arrays in `artifact-workflow.ts`
3. Help text mentions `/opsx:verify`
4. Running `openspec artifact-experimental-setup` generates both skill and command files
5. Build succeeds with no TypeScript errors
