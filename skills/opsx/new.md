Start a new OpenSpec change - create the directory structure and scaffold artifacts one at a time. No CLI required.

This is the step-by-step version. For one-shot artifact generation, use `/opsx:propose` instead.

**Input**: The argument after `/opsx:new` is the change name (kebab-case), OR a description of what the user wants to build.

---

## Spec-Driven Schema Reference (Built-in)

The default workflow is **spec-driven**: `proposal → specs → design → tasks`

Artifact sequence and dependencies:
1. `proposal.md` - requires nothing
2. `specs/<capability>/spec.md` - requires proposal
3. `design.md` - requires proposal
4. `tasks.md` - requires specs AND design

Each artifact is ready to create once its dependencies are done.

---

## Steps

### 1. Determine the change name

If argument is a description (not kebab-case), derive a name:
- "add user authentication" → `add-user-auth`
- "fix login timeout bug" → `fix-login-timeout`

If no input provided, use **AskUserQuestion tool**:
> "What change do you want to work on? Describe what you want to build or fix."

**IMPORTANT**: Do NOT proceed without knowing what to build.

### 2. Validate the name

The name must be kebab-case: lowercase letters, numbers, and hyphens only.
- Valid: `add-dark-mode`, `fix-auth-bug`, `api-v2`
- Invalid: `addDarkMode`, `fix auth bug`, `Add_Feature`

If invalid, ask the user to provide a valid kebab-case name.

### 3. Check if change already exists

Check if `openspec/changes/<name>/` already exists.
- If yes: "A change with this name already exists. Use `/opsx:continue <name>` to continue it, or choose a different name."
- Stop here if it exists.

### 4. Create the change directory structure

```bash
mkdir -p openspec/changes/<name>/specs
```

Create `openspec/changes/<name>/.openspec.yaml`:
```yaml
schema: spec-driven
name: <name>
created: <YYYY-MM-DD>
```

### 5. Show artifact status and first instructions

Display the current state:
```
## Change Created: <name>

**Location:** openspec/changes/<name>/
**Schema:** spec-driven
**Progress:** 0/4 artifacts complete

### Artifact Status
| Artifact   | Status  | Depends On        |
|------------|---------|-------------------|
| proposal   | ready   | -                 |
| specs      | waiting | proposal          |
| design     | waiting | proposal          |
| tasks      | waiting | specs, design     |

---

### Next: proposal.md

Create the proposal document that establishes WHY this change is needed.

**Sections:**
- **Why**: 1-2 sentences on the problem/opportunity
- **What Changes**: Bullet list of specific changes
- **Capabilities**:
  - New Capabilities: list new `specs/<name>/spec.md` files to create
  - Modified Capabilities: list existing capabilities whose requirements change
- **Impact**: Affected code, APIs, dependencies

**Tips:**
- Check `openspec/specs/` to see existing capability names
- Keep it concise (1-2 pages)
- Focus on "why", not implementation details

**Output path:** `openspec/changes/<name>/proposal.md`
```

### 6. STOP and wait for user direction

Do NOT create any artifacts yet - just show the scaffold and instructions.

Prompt: "Ready to create the proposal? Describe what this change is about and I'll draft it, or ask me to continue."

---

## Guardrails

- Do NOT create any artifact files - just show the scaffold and what to do next
- If the name is invalid, ask for a valid kebab-case name before creating anything
- If a change with that name already exists, suggest `/opsx:continue` instead
- This command creates the container; use `/opsx:continue` to actually write the artifacts
