## Context

OpenSpec generates markdown instructions for AI agents at three lifecycle phases: proposal (planning), apply (implementation), and archive (completion). The current implementation hard-codes these instructions in `slash-command-templates.ts`. Users wanting to integrate external tools (issue trackers, CI systems, notification services) must fork OpenSpec and modify these templates directly.

The Linear MCP integration demonstrated in the `intent-driven-dev` fork shows a common pattern: injecting additional instructions into each phase to call MCP tools for issue status updates. This should be generalizable to any integration.

**Constraints:**
- Hooks must be markdown instructions (not shell scripts) - they're guidance for AI agents, not executable code
- Must not break existing workflows - hooks are optional
- Must work with all schemas (spec-driven, tdd, custom)
- Should allow project-level configuration without global state

## Goals / Non-Goals

**Goals:**
- Enable custom instructions to be injected before/after each lifecycle phase
- Support all three phases: proposal, apply, archive (and any custom phases)
- Discover hooks by convention from `openspec/hooks/` directory
- Support multiple integrations through namespace folders
- Keep hook execution simple - concatenate into phase instructions

**Non-Goals:**
- Shell script execution (hooks are markdown instructions, not code)
- Global hooks (per-project only)
- Conditional hook execution based on change properties
- Hook dependency ordering (keep it simple)

## Decisions

### Decision 1: Hooks as Markdown Instructions

**Choice:** Hooks are markdown files that get concatenated into phase instructions.

**Rationale:** OpenSpec generates instructions for AI agents - the agents interpret markdown, not shell scripts. This matches the existing architecture and the pattern demonstrated in the Linear MCP integration.

**Alternatives considered:**
- Shell scripts: Would require a separate execution model and wouldn't integrate with agent instructions
- MCP tool configuration: Too specific to one integration type; markdown is more flexible
- Schema-level hooks: Would require duplicating hooks across schemas; project-level is simpler

### Decision 2: Convention-Based Hook Discovery

**Choice:** Hooks are discovered by convention from `openspec/hooks/` directory using predictable file names.

**Directory structure:**
```
openspec/
├── hooks/
│   ├── linear/                    # Integration namespace
│   │   ├── before-proposal.md     # Select Linear story
│   │   ├── after-proposal.md      # Move to Todo
│   │   ├── before-apply.md        # Update description
│   │   ├── after-apply.md         # Move to In Progress
│   │   └── after-archive.md       # Move to Done
│   ├── slack/                     # Another integration
│   │   └── after-archive.md       # Notify channel
│   └── custom/                    # Project-specific hooks
│       └── before-apply.md        # Custom setup
```

**Naming convention:**
- Folder: integration/namespace name (e.g., `linear`, `slack`, `custom`)
- File: `{before|after}-{phase}.md`

**Composition rules:**
- All hooks for the same phase across ALL folders are concatenated
- Order: alphabetical by folder name, then by file
- Duplicate files within same folder = misconfiguration (warning logged)

**Rationale:**
- Zero configuration required - just drop files in folders
- Each integration is namespaced - easy to add/remove by folder
- Automatically works with custom schema phases (e.g., `before-review.md`)
- Future-proof: no code changes needed when new phases are added
- Clear ownership: know which integration owns each hook
- Simple to distribute: copy the integration folder

**Alternatives considered:**
- Flat structure (`hooks/before-proposal.md`): No namespace, conflicts between integrations
- Config-based (`hooks:` in config.yaml): Requires updating config for each hook
- Numbered ordering (`01-before-proposal.md`): More complex, less readable

### Decision 3: Hook Injection Points

**Choice:** Inject hooks at these points in the phase instructions:

| Phase | Before Point | After Point |
|-------|--------------|-------------|
| proposal | After guardrails, before steps | After references |
| apply | After guardrails, before steps | After references |
| archive | After guardrails, before steps | After references |

**Rationale:**
- "Before" hooks set up context/prerequisites before the main workflow steps
- "After" hooks handle cleanup/follow-up after the workflow completes
- Placing hooks relative to existing sections maintains readability

### Decision 4: Hook File Resolution

**Choice:** Hook files are read from `openspec/hooks/{integration}/{timing}-{phase}.md` paths within the project.

**Path resolution:**
```
openspec/hooks/linear/before-proposal.md  # Reads from project's openspec/hooks/ directory
```

**Rationale:** All hooks are centralized in the `openspec/hooks/` directory, keeping integration files organized and separate from other project files.

**Error handling:**
- Missing `openspec/hooks/` directory: no hooks loaded (not an error)
- Empty integration folder: skipped without warning
- Invalid filenames (e.g., `setup.md`): ignored with debug log
- File read errors: warning logged, hook skipped

### Decision 5: Integration Distribution Model

**Choice:** Integrations are distributed as standalone packages containing hook files and optional configuration templates.

**Integration package structure:**
```
openspec-linear/                    # npm package or git repo
├── README.md                       # Setup instructions
├── linear/                         # Folder name = integration namespace
│   ├── before-proposal.md          # Linear story selection
│   ├── after-proposal.md           # Move story to Todo
│   ├── before-apply.md             # Update story description
│   ├── after-apply.md              # Move story to In Progress
│   └── after-archive.md            # Move story to Done
├── config/
│   └── linear.yml.example          # Template for openspec/linear.yml
└── install.sh                      # Optional: copies folder to project
```

**Installation methods (user choice):**

1. **Manual copy** (simplest):
   ```bash
   # Clone/download the integration
   git clone https://github.com/user/openspec-linear
   # Copy the integration folder to your project's hooks
   cp -r openspec-linear/linear your-project/openspec/hooks/
   ```

2. **CLI command** (future enhancement):
   ```bash
   openspec integration add linear
   # Copies integration folder from registry or git URL
   ```

3. **npm package with postinstall**:
   ```bash
   npm install openspec-linear --save-dev
   # postinstall script copies linear/ folder to openspec/hooks/
   ```

**Composing multiple integrations:**

Automatic! Each integration lives in its own folder:
```
openspec/hooks/
├── linear/           # From openspec-linear package
├── slack/            # From openspec-slack package
└── jira/             # From openspec-jira package
```

All `before-proposal.md` files from all folders are concatenated into the proposal phase instructions.

**Rationale:**
- Hooks are just markdown files - trivial to distribute
- No plugin API or runtime to maintain
- Works with any package manager or none at all
- Users can inspect and modify hooks freely

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Large hook files bloating instructions | Add max size check (50KB limit per file) |
| Hook content breaking instruction parsing | Hooks are plain markdown - no special parsing required |
| Users expecting executable hooks | Clear documentation that hooks are agent instructions, not scripts |
| Accidental inclusion of unwanted hooks | Each integration is namespaced - remove folder to remove all its hooks |
| Hook ordering conflicts between integrations | Alphabetical by folder name provides deterministic ordering |
| Discovery overhead scanning directories | Hooks directory is small; scan is fast and cached per command |

## Migration Plan

1. **No migration required** - hooks are additive and optional
2. Existing projects continue working unchanged
3. New projects can opt-in by creating `openspec/hooks/{integration}/` directories

## Open Questions

1. **Should hooks support schema-level defaults?** (e.g., hooks defined in schema package)
   - Current decision: No - start simple with project-level hooks only
   - Can add schema-level hooks later if there's demand

2. **Should there be a way to disable specific integrations without removing the folder?**
   - Current decision: No - removing/renaming the folder is simple enough
   - Could add `.disabled` marker file or config override later if needed

3. **Should the CLI provide commands for managing integrations?**
   - Current decision: Defer to future enhancement
   - Manual copy works for MVP; can add `openspec integration add/remove` later
