# Migrating to OPSX

This guide helps you transition from the legacy Pscode workflow to OPSX. The migration is designed to be smooth—your existing work is preserved, and the new system offers more flexibility.

## What's Changing?

OPSX replaces the old phase-locked workflow with a fluid, action-based approach. Here's the key shift:

| Aspect | Legacy | OPSX |
|--------|--------|------|
| **Commands** | `/pscode:proposal`, `/pscode:apply`, `/pscode:archive` | Default: `/ps:propose`, `/ps:apply`, `/ps:sync`, `/ps:complete` (expanded workflow commands optional) |
| **Workflow** | Create all artifacts at once | Create incrementally or all at once—your choice |
| **Going back** | Awkward phase gates | Natural—update any artifact anytime |
| **Customization** | Fixed structure | Schema-driven, fully hackable |
| **Configuration** | `CLAUDE.md` with markers + `project.md` | Clean config in `pscode/config.yaml` |

**The philosophy change:** Work isn't linear. OPSX stops pretending it is.

---

## Before You Begin

### Your Existing Work Is Safe

The migration process is designed with preservation in mind:

- **Active changes in `pscode/changes/`** — Completely preserved. You can continue them with OPSX commands.
- **Archived changes** — Untouched. Your history remains intact.
- **Main specs in `pscode/specs/`** — Untouched. These are your source of truth.
- **Your content in CLAUDE.md, AGENTS.md, etc.** — Preserved. Only the Pscode marker blocks are removed; everything you wrote stays.

### What Gets Removed

Only Pscode-managed files that are being replaced:

| What | Why |
|------|-----|
| Legacy slash command directories/files | Replaced by the new skills system |
| `pscode/AGENTS.md` | Obsolete workflow trigger |
| Pscode markers in `CLAUDE.md`, `AGENTS.md`, etc. | No longer needed |

**Legacy command locations by tool** (examples—your tool may vary):

- Claude Code: `.claude/commands/pscode/`
- Cursor: `.cursor/commands/pscode-*.md`
- Windsurf: `.windsurf/workflows/pscode-*.md`
- Cline: `.clinerules/workflows/pscode-*.md`
- Roo: `.roo/commands/pscode-*.md`
- GitHub Copilot: `.github/prompts/pscode-*.prompt.md` (IDE extensions only; not supported in Copilot CLI)
- And others (Augment, Continue, Amazon Q, etc.)

The migration detects whichever tools you have configured and cleans up their legacy files.

The removal list may seem long, but these are all files that Pscode originally created. Your own content is never deleted.

### What Needs Your Attention

One file requires manual migration:

**`pscode/project.md`** — This file isn't deleted automatically because it may contain project context you've written. You'll need to:

1. Review its contents
2. Move useful context to `pscode/config.yaml` (see guidance below)
3. Delete the file when ready

**Why we made this change:**

The old `project.md` was passive—agents might read it, might not, might forget what they read. We found reliability was inconsistent.

The new `config.yaml` context is **actively injected into every Pscode planning request**. This means your project conventions, tech stack, and rules are always present when the AI is creating artifacts. Higher reliability.

**The tradeoff:**

Because context is injected into every request, you'll want to be concise. Focus on what really matters:
- Tech stack and key conventions
- Non-obvious constraints the AI needs to know
- Rules that frequently got ignored before

Don't worry about getting it perfect. We're still learning what works best here, and we'll be improving how context injection works as we experiment.

---

## Running the Migration

Both `pscode init` and `pscode update` detect legacy files and guide you through the same cleanup process. Use whichever fits your situation:

- New installs default to profile `core` (`propose`, `explore`, `apply`, `sync`, `archive`).
- Migrated installs preserve your previously installed workflows by writing a `custom` profile when needed.

### Using `pscode init`

Run this if you want to add new tools or reconfigure which tools are set up:

```bash
pscode init
```

The init command detects legacy files and guides you through cleanup:

```
Upgrading to the new Pscode

Pscode now uses agent skills, the emerging standard across coding
agents. This simplifies your setup while keeping everything working
as before.

Files to remove
No user content to preserve:
  • .claude/commands/pscode/
  • pscode/AGENTS.md

Files to update
Pscode markers will be removed, your content preserved:
  • CLAUDE.md
  • AGENTS.md

Needs your attention
  • pscode/project.md
    We won't delete this file. It may contain useful project context.

    The new pscode/config.yaml has a "context:" section for planning
    context. This is included in every Pscode request and works more
    reliably than the old project.md approach.

    Review project.md, move any useful content to config.yaml's context
    section, then delete the file when ready.

? Upgrade and clean up legacy files? (Y/n)
```

**What happens when you say yes:**

1. Legacy slash command directories are removed
2. Pscode markers are stripped from `CLAUDE.md`, `AGENTS.md`, etc. (your content stays)
3. `pscode/AGENTS.md` is deleted
4. New skills are installed in `.claude/skills/`
5. `pscode/config.yaml` is created with a default schema

### Using `pscode update`

Run this if you just want to migrate and refresh your existing tools to the latest version:

```bash
pscode update
```

The update command also detects and cleans up legacy artifacts, then refreshes generated skills/commands to match your current profile and delivery settings.

### Non-Interactive / CI Environments

For scripted migrations:

```bash
pscode init --force --tools claude
```

The `--force` flag skips prompts and auto-accepts cleanup.

---

## Migrating project.md to config.yaml

The old `pscode/project.md` was a freeform markdown file for project context. The new `pscode/config.yaml` is structured and—critically—**injected into every planning request** so your conventions are always present when the AI works.

### Before (project.md)

```markdown
# Project Context

This is a TypeScript monorepo using React and Node.js.
We use Jest for testing and follow strict ESLint rules.
Our API is RESTful and documented in docs/api.md.

## Conventions

- All public APIs must maintain backwards compatibility
- New features should include tests
- Use Given/When/Then format for specifications
```

### After (config.yaml)

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  Testing: Jest with React Testing Library
  API: RESTful, documented in docs/api.md
  We maintain backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan for risky changes
  specs:
    - Use Given/When/Then format for scenarios
    - Reference existing patterns before inventing new ones
  design:
    - Include sequence diagrams for complex flows
```

### Key Differences

| project.md | config.yaml |
|------------|-------------|
| Freeform markdown | Structured YAML |
| One blob of text | Separate context and per-artifact rules |
| Unclear when it's used | Context appears in ALL artifacts; rules appear in matching artifacts only |
| No schema selection | Explicit `schema:` field sets default workflow |

### What to Keep, What to Drop

When migrating, be selective. Ask yourself: "Does the AI need this for *every* planning request?"

**Good candidates for `context:`**
- Tech stack (languages, frameworks, databases)
- Key architectural patterns (monorepo, microservices, etc.)
- Non-obvious constraints ("we can't use library X because...")
- Critical conventions that often get ignored

**Move to `rules:` instead**
- Artifact-specific formatting ("use Given/When/Then in specs")
- Review criteria ("proposals must include rollback plans")
- These only appear for the matching artifact, keeping other requests lighter

**Leave out entirely**
- General best practices the AI already knows
- Verbose explanations that could be summarized
- Historical context that doesn't affect current work

### Migration Steps

1. **Create config.yaml** (if not already created by init):
   ```yaml
   schema: spec-driven
   ```

2. **Add your context** (be concise—this goes into every request):
   ```yaml
   context: |
     Your project background goes here.
     Focus on what the AI genuinely needs to know.
   ```

3. **Add per-artifact rules** (optional):
   ```yaml
   rules:
     proposal:
       - Your proposal-specific guidance
     specs:
       - Your spec-writing rules
   ```

4. **Delete project.md** once you've moved everything useful.

**Don't overthink it.** Start with the essentials and iterate. If you notice the AI missing something important, add it. If context feels bloated, trim it. This is a living document.

### Need Help? Use This Prompt

If you're unsure how to distill your project.md, ask your AI assistant:

```
I'm migrating from Pscode's old project.md to the new config.yaml format.

Here's my current project.md:
[paste your project.md content]

Please help me create a config.yaml with:
1. A concise `context:` section (this gets injected into every planning request, so keep it tight—focus on tech stack, key constraints, and conventions that often get ignored)
2. `rules:` for specific artifacts if any content is artifact-specific (e.g., "use Given/When/Then" belongs in specs rules, not global context)

Leave out anything generic that AI models already know. Be ruthless about brevity.
```

The AI will help you identify what's essential vs. what can be trimmed.

---

## The New Commands

Command availability is profile-dependent:

**Default (`core` profile):**

| Command | Purpose |
|---------|---------|
| `/ps:propose` | Create a change and generate planning artifacts in one step |
| `/ps:explore` | Think through ideas with no structure |
| `/ps:apply` | Implement tasks from tasks.md |
| `/ps:complete` | Finalize and archive the change |

**Expanded workflow (custom selection):**

| Command | Purpose |
|---------|---------|
| `/ps:new` | Start a new change scaffold |
| `/ps:continue` | Create the next artifact (one at a time) |
| `/ps:ff` | Fast-forward—create planning artifacts at once |
| `/ps:verify` | Validate implementation matches specs |
| `/ps:sync` | Merge delta specs into main specs |
| `/ps:bulk-archive` | Archive multiple changes at once |
| `/ps:onboard` | Guided end-to-end onboarding workflow |

Enable expanded commands with `pscode config profile`, then run `pscode update`.

### Command Mapping from Legacy

| Legacy | OPSX Equivalent |
|--------|-----------------|
| `/pscode:proposal` | `/ps:propose` (default) or `/ps:new` then `/ps:ff` (expanded) |
| `/pscode:apply` | `/ps:apply` |
| `/pscode:archive` | `/ps:complete` |

### New Capabilities

These capabilities are part of the expanded workflow command set.

**Granular artifact creation:**
```
/ps:continue
```
Creates one artifact at a time based on dependencies. Use this when you want to review each step.

**Exploration mode:**
```
/ps:explore
```
Think through ideas with a partner before committing to a change.

---

## Understanding the New Architecture

### From Phase-Locked to Fluid

The legacy workflow forced linear progression:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │
│    PHASE     │      │    PHASE     │      │    PHASE     │
└──────────────┘      └──────────────┘      └──────────────┘

If you're in implementation and realize the design is wrong?
Too bad. Phase gates don't let you go back easily.
```

OPSX uses actions, not phases:

```
         ┌───────────────────────────────────────────────┐
         │           ACTIONS (not phases)                │
         │                                               │
         │     new ◄──► continue ◄──► apply ◄──► archive │
         │      │          │           │             │   │
         │      └──────────┴───────────┴─────────────┘   │
         │                    any order                  │
         └───────────────────────────────────────────────┘
```

### Dependency Graph

Artifacts form a directed graph. Dependencies are enablers, not gates:

```
                        proposal
                       (root node)
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
           specs                       design
        (requires:                  (requires:
         proposal)                   proposal)
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                         tasks
                     (requires:
                     specs, design)
```

When you run `/ps:continue`, it checks what's ready and offers the next artifact. You can also create multiple ready artifacts in any order.

### Skills vs Commands

The legacy system used tool-specific command files:

```
.claude/commands/pscode/
├── proposal.md
├── apply.md
└── archive.md
```

OPSX uses the emerging **skills** standard:

```
.claude/skills/
├── pscode-explore/SKILL.md
├── pscode-new-change/SKILL.md
├── pscode-continue-change/SKILL.md
├── pscode-apply-change/SKILL.md
└── ...
```

Skills are recognized across multiple AI coding tools and provide richer metadata.

---

## Continuing Existing Changes

Your in-progress changes work seamlessly with OPSX commands.

**Have an active change from the legacy workflow?**

```
/ps:apply add-my-feature
```

OPSX reads the existing artifacts and continues from where you left off.

**Want to add more artifacts to an existing change?**

```
/ps:continue add-my-feature
```

Shows what's ready to create based on what already exists.

**Need to see status?**

```bash
pscode status --change add-my-feature
```

---

## The New Config System

### config.yaml Structure

```yaml
# Required: Default schema for new changes
schema: spec-driven

# Optional: Project context (max 50KB)
# Injected into ALL artifact instructions
context: |
  Your project background, tech stack,
  conventions, and constraints.

# Optional: Per-artifact rules
# Only injected into matching artifacts
rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format
  design:
    - Document fallback strategies
  tasks:
    - Break into 2-hour maximum chunks
```

### Schema Resolution

When determining which schema to use, OPSX checks in order:

1. **CLI flag**: `--schema <name>` (highest priority)
2. **Change metadata**: `.pscode.yaml` in the change directory
3. **Project config**: `pscode/config.yaml`
4. **Default**: `spec-driven`

### Available Schemas

| Schema | Artifacts | Best For |
|--------|-----------|----------|
| `spec-driven` | proposal → specs → design → tasks | Most projects |

List all available schemas:

```bash
pscode schemas
```

### Custom Schemas

Create your own workflow:

```bash
pscode schema init my-workflow
```

Or fork an existing one:

```bash
pscode schema fork spec-driven my-workflow
```

See [Customization](customization.md) for details.

---

## Troubleshooting

### "Legacy files detected in non-interactive mode"

You're running in a CI or non-interactive environment. Use:

```bash
pscode init --force
```

### Commands not appearing after migration

Restart your IDE. Skills are detected at startup.

### "Unknown artifact ID in rules"

Check that your `rules:` keys match your schema's artifact IDs:

- **spec-driven**: `proposal`, `specs`, `design`, `tasks`

Run this to see valid artifact IDs:

```bash
pscode schemas --json
```

### Config not being applied

1. Ensure the file is at `pscode/config.yaml` (not `.yml`)
2. Validate YAML syntax
3. Config changes take effect immediately—no restart needed

### project.md not migrated

The system intentionally preserves `project.md` because it may contain your custom content. Review it manually, move useful parts to `config.yaml`, then delete it.

### Want to see what would be cleaned up?

Run init and decline the cleanup prompt—you'll see the full detection summary without any changes being made.

---

## Quick Reference

### Files After Migration

```
project/
├── pscode/
│   ├── specs/                    # Unchanged
│   ├── changes/                  # Unchanged
│   │   └── archive/              # Unchanged
│   └── config.yaml               # NEW: Project configuration
├── .claude/
│   └── skills/                   # NEW: OPSX skills
│       ├── pscode-propose/     # default core profile
│       ├── pscode-explore/
│       ├── pscode-apply-change/
│       ├── pscode-sync-specs/
│       └── ...                   # expanded profile adds new/continue/ff/etc.
├── CLAUDE.md                     # Pscode markers removed, your content preserved
└── AGENTS.md                     # Pscode markers removed, your content preserved
```

### What's Gone

- `.claude/commands/pscode/` — replaced by `.claude/skills/`
- `pscode/AGENTS.md` — obsolete
- `pscode/project.md` — migrate to `config.yaml`, then delete
- Pscode marker blocks in `CLAUDE.md`, `AGENTS.md`, etc.

### Command Cheatsheet

```text
/ps:propose      Start quickly (default core profile)
/ps:apply        Implement tasks
/ps:complete      Finish and archive

# Expanded workflow (if enabled):
/ps:new          Scaffold a change
/ps:continue     Create next artifact
/ps:ff           Create planning artifacts
```

---

## Getting Help

- **Discord**: [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues**: [github.com/thiagodiogo/Pscode/issues](https://github.com/thiagodiogo/Pscode/issues)
- **Documentation**: [docs/pastel.md](pastel.md) for the full OPSX reference
