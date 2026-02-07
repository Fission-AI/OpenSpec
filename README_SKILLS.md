# LightSpec Skills

LightSpec includes 3 Claude Code skills for the core development workflow:

## Available Skills

### lightspec-new

Create a new change proposal to track development work.

```
"I want to start a new change for adding user authentication"
```

Creates:
- `lightspec/changes/<name>/` directory
- `.lightspec.yaml` metadata file
- Optional README.md with description

### lightspec-apply

Get instructions for implementing the tasks in a change.

```
"Show me the apply instructions for this change"
"What tasks do I need to work on?"
```

Shows:
- Artifact completion status
- Task progress with checkboxes
- Context files to read
- Implementation instructions
- Blockers (if any)

### lightspec-archive

Archive a completed change and update main specs.

```
"Archive this change"
"This change is complete, integrate it"
```

Does:
- Validates the change
- Merges delta specs into main specs
- Moves change to archive
- Updates spec versions

## CLI Commands (via npm)

All other LightSpec commands are available through the CLI:

```bash
# Install globally
npm install -g lightspec

# Or use npx
npx lightspec <command>

# Available commands
lightspec init           # Initialize LightSpec in a project
lightspec list           # List changes and specs
lightspec validate       # Validate changes and specs
lightspec show           # Display a change or spec
lightspec completion     # Manage shell completions
```

## Workflow

1. **Initialize**: `lightspec init` (one-time per project)
2. **New Change**: Use `lightspec-new` skill
3. **Create Artifacts**: Work through proposal, specs, design, tasks
4. **Apply**: Use `lightspec-apply` skill to implement
5. **Archive**: Use `lightspec-archive` skill when complete
