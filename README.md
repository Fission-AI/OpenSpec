<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_pixel_dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/openspec_pixel_light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/openspec_pixel_light.svg" alt="OpenSpec logo" height="64">
    </picture>
  </a>
  
</p>
<p align="center">Spec-driven development for AI coding assistants.</p>
<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="node version" src="https://img.shields.io/node/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://conventionalcommits.org"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white&style=flat-square" /></a>
</p>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

<p align="center">
  Follow <a href="https://x.com/0xTab">@0xTab on X</a> for updates · Join the <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> for help and questions.
</p>

<p align="center">
  <sub>🧪 <strong>OPSX Workflow</strong> — schema-driven, hackable, fluid. See <a href="docs/experimental-workflow.md">workflow docs</a> for details.</sub>
</p>

# OpenSpec

OpenSpec aligns humans and AI coding assistants with spec-driven development so you agree on what to build before any code is written. **No API keys required.**

## Why OpenSpec?

AI coding assistants are powerful but unpredictable when requirements live in chat history. OpenSpec adds a lightweight specification workflow that locks intent before implementation, giving you deterministic, reviewable outputs.

Key outcomes:
- Human and AI stakeholders agree on specs before work begins.
- Structured change folders (proposals, tasks, and spec updates) keep scope explicit and auditable.
- Shared visibility into what's proposed, active, or archived.
- Works with the AI tools you already use: custom slash commands where supported, context rules everywhere else.

## How OpenSpec compares (at a glance)

- **Lightweight**: simple workflow, no API keys, minimal setup.
- **Brownfield-first**: works great beyond 0→1. OpenSpec separates the source of truth from proposals: `openspec/specs/` (current truth) and `openspec/changes/` (proposed updates). This keeps diffs explicit and manageable across features.
- **Change tracking**: proposals, tasks, and spec deltas live together; archiving merges the approved updates back into specs.
- **Compared to spec-kit & Kiro**: those shine for brand-new features (0→1). OpenSpec also excels when modifying existing behavior (1→n), especially when updates span multiple specs.

See the full comparison in [How OpenSpec Compares](#how-openspec-compares).

## How It Works

```
┌────────────────────┐
│ Draft Change       │
│ Proposal           │
└────────┬───────────┘
         │ share intent with your AI
         ▼
┌────────────────────┐
│ Review & Align     │
│ (edit specs/tasks) │◀──── feedback loop ──────┐
└────────┬───────────┘                          │
         │ approved plan                        │
         ▼                                      │
┌────────────────────┐                          │
│ Implement Tasks    │──────────────────────────┘
│ (AI writes code)   │
└────────┬───────────┘
         │ ship the change
         ▼
┌────────────────────┐
│ Archive & Update   │
│ Specs (source)     │
└────────────────────┘

1. Draft a change proposal that captures the spec updates you want.
2. Review the proposal with your AI assistant until everyone agrees.
3. Implement tasks that reference the agreed specs.
4. Archive the change to merge the approved updates back into the source-of-truth specs.
```

## Getting Started

### Supported AI Tools

OpenSpec generates **Agent Skills** and **/opsx:\* slash commands** for supported tools during `openspec init`.

<details>
<summary><strong>Tools with Agent Skills + Slash Commands</strong> (click to expand)</summary>

These tools support the full OpenSpec workflow with skills and commands:

| Tool | Skills Location | Commands |
|------|-----------------|----------|
| **Claude Code** | `.claude/skills/` | `/opsx:new`, `/opsx:apply`, `/opsx:archive`, etc. |
| **Cursor** | `.cursor/skills/` | `/opsx:*` commands via prompts |

Run `openspec init` and select the tools you use. Skills and commands are generated automatically.

</details>

<details>
<summary><strong>AGENTS.md Compatible</strong> (click to expand)</summary>

Tools that support AGENTS.md can follow OpenSpec workflows by reading `openspec/AGENTS.md`. Ask them to follow the OpenSpec workflow if they need a reminder. Learn more about the [AGENTS.md convention](https://agents.md/).

| Tools |
|-------|
| Amp • Jules • Others |

</details>

### Install & Initialize

#### Prerequisites
- **Node.js >= 20.19.0** - Check your version with `node --version`

#### Step 1: Install the CLI globally

**Option A: Using npm**

```bash
npm install -g @fission-ai/openspec@latest
```

Verify installation:
```bash
openspec --version
```

**Option B: Using Nix (NixOS and Nix package manager)**

Run OpenSpec directly without installation:
```bash
nix run github:Fission-AI/OpenSpec -- init
```

Or install to your profile:
```bash
nix profile install github:Fission-AI/OpenSpec
```

Or add to your development environment in `flake.nix`:
```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:Fission-AI/OpenSpec";
  };

  outputs = { nixpkgs, openspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ openspec.packages.x86_64-linux.default ];
    };
  };
}
```

Verify installation:
```bash
openspec --version
```

#### Step 2: Initialize OpenSpec in your project

Navigate to your project directory:
```bash
cd my-project
```

Run the initialization:
```bash
openspec init
```

**What happens during initialization:**
- You'll see an interactive tool selector to pick AI tools (Claude Code, Cursor, etc.)
- OpenSpec generates **Agent Skills** in tool-specific directories (e.g., `.claude/skills/`)
- **/opsx:\* slash commands** are created for each selected tool
- A `openspec/config.yaml` file is created for project configuration
- The `openspec/` directory structure is created (specs, changes, archive)

**Legacy upgrade:** If you have files from an older OpenSpec version, init will detect them and offer to clean up automatically. Use `--force` to skip the confirmation prompt.

**Non-interactive mode:** For CI or scripted setups:
```bash
openspec init --tools claude,cursor  # Specific tools
openspec init --tools all            # All supported tools
openspec init --tools none           # Skip tool setup
```

**After setup:**
- Run `/opsx:new` to start your first change
- Run `openspec list` to verify the setup and view any active changes
- Restart your IDE for slash commands to take effect

### Optional: Configure Project Context

After `openspec init`, you can customize `openspec/config.yaml` to inject project-specific context into all artifacts:

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  Testing: Vitest for unit tests
  Style: ESLint with Prettier

rules:
  proposal:
    - Include rollback plan
  specs:
    - Use Given/When/Then format for scenarios
```

This context is automatically included in artifact instructions, helping the AI understand your project's conventions.

### Create Your First Change

Here's a real example showing the complete OpenSpec workflow using `/opsx:*` commands.

#### 1. Start a New Change
```text
You: /opsx:new

AI:  What do you want to build?
You: Add profile search filters by role and team

AI:  I'll create a new change for profile filters.
     *Creates openspec/changes/add-profile-filters/ with proposal.md*
```

#### 2. Build Out Artifacts
Use `/opsx:continue` to create artifacts one at a time, or `/opsx:ff` to fast-forward through all planning artifacts:

```text
You: /opsx:continue

AI:  Proposal is done. Ready to create: specs, design
     Which artifact should I create?
You: specs

AI:  *Creates specs with requirements and scenarios*
```

Or fast-forward through everything:
```text
You: /opsx:ff add-profile-filters

AI:  *Creates proposal → specs → design → tasks in sequence*
```

#### 3. Verify & Review
```bash
$ openspec list                             # Confirm the change folder exists
$ openspec validate add-profile-filters     # Validate spec formatting
$ openspec show add-profile-filters         # Review proposal, tasks, and spec delta
```

#### 4. Implement the Change
```text
You: /opsx:apply

AI:  I'll work through the tasks in the add-profile-filters change.
     *Implements tasks, marking them complete as it goes*
```

**Key feature:** If you discover issues during implementation, you can update specs, design, or tasks — then continue. No phase gates.

#### 5. Archive the Completed Change
```text
You: /opsx:archive

AI:  I'll archive the add-profile-filters change.
     *Runs: openspec archive add-profile-filters --yes*
     ✓ Change archived. Specs updated. Ready for the next feature!
```

Or run directly in terminal:
```bash
$ openspec archive add-profile-filters --yes
```

## Command Reference

### Slash Commands (in your AI tool)

| Command | What it does |
|---------|--------------|
| `/opsx:explore` | Think through ideas, investigate problems, clarify requirements |
| `/opsx:new` | Start a new change |
| `/opsx:continue` | Create the next artifact (based on what's ready) |
| `/opsx:ff` | Fast-forward — create all planning artifacts at once |
| `/opsx:apply` | Implement tasks, updating artifacts as needed |
| `/opsx:sync` | Sync delta specs to main specs |
| `/opsx:archive` | Archive when done |
| `/opsx:verify` | Verify implementation matches change artifacts |

### CLI Commands (in terminal)

```bash
openspec init               # Initialize OpenSpec with skills and commands
openspec list               # View active change folders
openspec view               # Interactive dashboard of specs and changes
openspec show <change>      # Display change details (proposal, tasks, spec updates)
openspec validate <change>  # Check spec formatting and structure
openspec archive <change> [--yes|-y]   # Move a completed change into archive/
openspec update             # Refresh skills and commands for configured tools
```

## Example: How AI Creates OpenSpec Files

When you ask your AI assistant to "add two-factor authentication", it creates:

```
openspec/
├── specs/
│   └── auth/
│       └── spec.md           # Current auth spec (if exists)
└── changes/
    └── add-2fa/              # AI creates this entire structure
        ├── proposal.md       # Why and what changes
        ├── tasks.md          # Implementation checklist
        ├── design.md         # Technical decisions (optional)
        └── specs/
            └── auth/
                └── spec.md   # Delta showing additions
```

### AI-Generated Spec (created in `openspec/specs/auth/spec.md`):

```markdown
# Auth Specification

## Purpose
Authentication and session management.

## Requirements
### Requirement: User Authentication
The system SHALL issue a JWT on successful login.

#### Scenario: Valid credentials
- WHEN a user submits valid credentials
- THEN a JWT is returned
```

### AI-Generated Change Delta (created in `openspec/changes/add-2fa/specs/auth/spec.md`):

```markdown
# Delta for Auth

## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- WHEN a user submits valid credentials
- THEN an OTP challenge is required
```

### AI-Generated Tasks (created in `openspec/changes/add-2fa/tasks.md`):

```markdown
## 1. Database Setup
- [ ] 1.1 Add OTP secret column to users table
- [ ] 1.2 Create OTP verification logs table

## 2. Backend Implementation  
- [ ] 2.1 Add OTP generation endpoint
- [ ] 2.2 Modify login flow to require OTP
- [ ] 2.3 Add OTP verification endpoint

## 3. Frontend Updates
- [ ] 3.1 Create OTP input component
- [ ] 3.2 Update login flow UI
```

**Important:** You don't create these files manually. Your AI assistant generates them based on your requirements and the existing codebase.

## Understanding OpenSpec Files

### Delta Format

Deltas are "patches" that show how specs change:

- **`## ADDED Requirements`** - New capabilities
- **`## MODIFIED Requirements`** - Changed behavior (include complete updated text)
- **`## REMOVED Requirements`** - Deprecated features

**Format requirements:**
- Use `### Requirement: <name>` for headers
- Every requirement needs at least one `#### Scenario:` block
- Use SHALL/MUST in requirement text

## How OpenSpec Compares

### vs. spec-kit
OpenSpec’s two-folder model (`openspec/specs/` for the current truth, `openspec/changes/` for proposed updates) keeps state and diffs separate. This scales when you modify existing features or touch multiple specs. spec-kit is strong for greenfield/0→1 but provides less structure for cross-spec updates and evolving features.

### vs. Kiro.dev
OpenSpec groups every change for a feature in one folder (`openspec/changes/feature-name/`), making it easy to track related specs, tasks, and designs together. Kiro spreads updates across multiple spec folders, which can make feature tracking harder.

### vs. No Specs
Without specs, AI coding assistants generate code from vague prompts, often missing requirements or adding unwanted features. OpenSpec brings predictability by agreeing on the desired behavior before any code is written.

## Team Adoption

1. **Initialize OpenSpec** – Run `openspec init` in your repo and select your team's tools.
2. **Start with new features** – Use `/opsx:new` to capture upcoming work as change proposals.
3. **Grow incrementally** – Each change archives into living specs that document your system.
4. **Stay flexible** – Different teammates can use Claude Code, Cursor, or any AGENTS.md-compatible tool while sharing the same specs.

Run `openspec update` to refresh skills and commands when upgrading OpenSpec or adding new tools.

## Updating OpenSpec

1. **Upgrade the package**
   ```bash
   npm install -g @fission-ai/openspec@latest
   ```
2. **Refresh skills and commands**
   ```bash
   openspec update
   ```
   This regenerates skills and slash commands for all configured tools.

3. **Restart your IDE** for slash commands to take effect.

## Workflow Customization

<details>
<summary><strong>Custom Schemas & Templates</strong></summary>

OpenSpec uses a **schema-driven workflow** that you can customize:

**Why customize:**
- **Hackable** — edit templates and schemas yourself, test immediately, no rebuild
- **Granular** — each artifact has its own instructions, test and tweak individually
- **Customizable** — define your own workflows, artifacts, and dependencies

**Built-in schemas:**
- `spec-driven` (default): proposal → specs → design → tasks
- `tdd`: tests → implementation → docs

**Create custom schemas:**
```bash
openspec schema init my-workflow     # Create new schema interactively
openspec schema fork spec-driven my-workflow  # Fork existing schema
openspec schemas                     # List available schemas
```

Schemas are stored in `openspec/schemas/` (project) or `~/.local/share/openspec/schemas/` (global).

[Full documentation →](docs/experimental-workflow.md)

</details>

<details>
<summary><strong>Telemetry</strong> – OpenSpec collects anonymous usage stats (opt-out: <code>OPENSPEC_TELEMETRY=0</code>)</summary>

We collect only command names and version to understand usage patterns. No arguments, paths, content, or PII. Automatically disabled in CI.

**Opt-out:** `export OPENSPEC_TELEMETRY=0` or `export DO_NOT_TRACK=1`

</details>

## Contributing

- Install dependencies: `pnpm install`
- Build: `pnpm run build`
- Test: `pnpm test`
- Develop CLI locally: `pnpm run dev` or `pnpm run dev:cli`
- Conventional commits (one-line): `type(scope): subject`

<details>
<summary><strong>Maintainers & Advisors</strong></summary>

See [MAINTAINERS.md](MAINTAINERS.md) for the list of core maintainers and advisors who help guide the project.

</details>

## License

MIT
