<p align="center">
  <a href="https://github.com/viteinfinite/lightspec">
    <picture>
      <source srcset="assets/lightspec_pixel_dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/lightspec_pixel_light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/lightspec_pixel_light.svg" alt="LightSpec logo" height="64">
    </picture>
  </a>
  
</p>
<p align="center">Spec-driven development for AI coding assistants.</p>
<p align="center">
  <a href="https://github.com/viteinfinite/lightspec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/viteinfinite/lightspec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@viteinfinite/lightspec"><img alt="npm version" src="https://img.shields.io/npm/v/@viteinfinite/lightspec?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="node version" src="https://img.shields.io/node/v/@viteinfinite/lightspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://conventionalcommits.org"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white&style=flat-square" /></a>
</p>

<p align="center">
  <img src="assets/lightspec_dashboard.png" alt="LightSpec dashboard preview" width="90%">
</p>

<p align="center">
  Follow <a href="https://x.com/0xTab">@0xTab on X</a> for updates · Join the <a href="https://discord.gg/YctCnvvshC">LightSpec Discord</a> for help and questions.
</p>

# LightSpec

A fork of [LightSpec](https://github.com/Fission-AI/LightSpec) v0.23.0

LightSpec aligns humans and AI coding assistants with spec-driven development so you agree on what to build before any code is written. **No API keys required.**

## Why LightSpec?

AI coding assistants are powerful but unpredictable when requirements live in chat history. LightSpec adds a lightweight specification workflow that locks intent before implementation, giving you deterministic, reviewable outputs.

Key outcomes:
- Human and AI stakeholders agree on specs before work begins.
- Structured change folders (proposals, tasks, and spec updates) keep scope explicit and auditable.
- Shared visibility into what's proposed, active, or archived.
- Works with the AI tools you already use: custom slash commands where supported, context rules everywhere else.

## How LightSpec compares (at a glance)

- **Lightweight**: simple workflow, no API keys, minimal setup.
- **Brownfield-first**: works great beyond 0→1. LightSpec separates the source of truth from proposals: `lightspec/specs/` (current truth) and `lightspec/changes/` (proposed updates). This keeps diffs explicit and manageable across features.
- **Change tracking**: proposals, tasks, and spec deltas live together; archiving merges the approved updates back into specs.
- **Compared to spec-kit & Kiro**: those shine for brand-new features (0→1). LightSpec also excels when modifying existing behavior (1→n), especially when updates span multiple specs.

See the full comparison in [How LightSpec Compares](#how-lightspec-compares).

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

<details>
<summary><strong>Native Slash Commands</strong> (click to expand)</summary>

These tools have built-in LightSpec commands. Select the LightSpec integration when prompted.

| Tool | Commands |
|------|----------|
| **Amazon Q Developer** | `@lightspec-proposal`, `@lightspec-apply`, `@lightspec-archive` (`.amazonq/prompts/`) |
| **Antigravity** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.agent/workflows/`) |
| **Auggie (Augment CLI)** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.augment/commands/`) |
| **Claude Code** | `/lightspec:proposal`, `/lightspec:apply`, `/lightspec:archive` |
| **Cline** | Workflows in `.clinerules/workflows/` directory (`.clinerules/workflows/lightspec-*.md`) |
| **CodeBuddy Code (CLI)** | `/lightspec:proposal`, `/lightspec:apply`, `/lightspec:archive` (`.codebuddy/commands/`) — see [docs](https://www.codebuddy.ai/cli) |
| **Codex** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (global: `~/.codex/prompts`, auto-installed) |
| **Continue** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.continue/prompts/`) |
| **CoStrict** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.cospec/lightspec/commands/`) — see [docs](https://costrict.ai)|
| **Crush** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.crush/commands/lightspec/`) |
| **Cursor** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` |
| **Factory Droid** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.factory/commands/`) |
| **Gemini CLI** | `/lightspec:proposal`, `/lightspec:apply`, `/lightspec:archive` (`.gemini/commands/lightspec/`) |
| **GitHub Copilot** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.github/prompts/`) |
| **iFlow (iflow-cli)** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.iflow/commands/`) |
| **Kilo Code** | `/lightspec-proposal.md`, `/lightspec-apply.md`, `/lightspec-archive.md` (`.kilocode/workflows/`) |
| **OpenCode** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` |
| **Qoder (CLI)** | `/lightspec:proposal`, `/lightspec:apply`, `/lightspec:archive` (`.qoder/commands/lightspec/`) — see [docs](https://qoder.com/cli) |
| **Qwen Code** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.qwen/commands/`) |
| **RooCode** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.roo/commands/`) |
| **Windsurf** | `/lightspec-proposal`, `/lightspec-apply`, `/lightspec-archive` (`.windsurf/workflows/`) |

Kilo Code discovers team workflows automatically. Save the generated files under `.kilocode/workflows/` and trigger them from the command palette with `/lightspec-proposal.md`, `/lightspec-apply.md`, or `/lightspec-archive.md`.

</details>

<details>
<summary><strong>AGENTS.md Compatible</strong> (click to expand)</summary>

These tools automatically read workflow instructions from `lightspec/AGENTS.md`. Ask them to follow the LightSpec workflow if they need a reminder. Learn more about the [AGENTS.md convention](https://agents.md/).

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
npm install -g @viteinfinite/lightspec@latest
```

Verify installation:
```bash
lightspec --version
```

**Option B: Using Nix (NixOS and Nix package manager)**

Run LightSpec directly without installation:
```bash
nix run github:viteinfinite/lightspec -- init
```

Or install to your profile:
```bash
nix profile install github:viteinfinite/lightspec
```

Or add to your development environment in `flake.nix`:
```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    lightspec.url = "github:viteinfinite/lightspec";
  };

  outputs = { nixpkgs, lightspec, ... }: {
    devShells.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.mkShell {
      buildInputs = [ lightspec.packages.x86_64-linux.default ];
    };
  };
}
```

Verify installation:
```bash
lightspec --version
```

#### Step 2: Initialize LightSpec in your project

Navigate to your project directory:
```bash
cd my-project
```

Run the initialization:
```bash
lightspec init
```

**What happens during initialization:**
- You'll be prompted to pick any natively supported AI tools (Claude Code, CodeBuddy, Cursor, OpenCode, Qoder,etc.); other assistants always rely on the shared `AGENTS.md` stub
- LightSpec automatically configures slash commands for the tools you choose and always writes a managed `AGENTS.md` hand-off at the project root
- A new `lightspec/` directory structure is created in your project

**After setup:**
- Primary AI tools can trigger `/lightspec` workflows without additional configuration
- Run `lightspec list` to verify the setup and view any active changes
- If your coding assistant doesn't surface the new slash commands right away, restart it. Slash commands are loaded at startup,
  so a fresh launch ensures they appear

### Optional: Populate Project Context

After `lightspec init` completes, you'll receive a suggested prompt to help populate your project context:

```text
Populate your project context:
"Please read lightspec/project.md and help me fill it out with details about my project, tech stack, and conventions"
```

Use `lightspec/project.md` to define project-level conventions, standards, architectural patterns, and other guidelines that should be followed across all changes.

### Create Your First Change

Here's a real example showing the complete LightSpec workflow. This works with any AI tool. Those with native slash commands will recognize the shortcuts automatically.

#### 1. Draft the Proposal
Start by asking your AI to create a change proposal:

```text
You: Create an LightSpec change proposal for adding profile search filters by role and team
     (Shortcut for tools with slash commands: /lightspec:proposal Add profile search filters)

AI:  I'll create an LightSpec change proposal for profile filters.
     *Scaffolds lightspec/changes/add-profile-filters/ with proposal.md, tasks.md, spec deltas.*
```

#### 2. Verify & Review
Check that the change was created correctly and review the proposal:

```bash
$ lightspec list                             # Confirm the change folder exists
$ lightspec validate add-profile-filters     # Validate spec formatting
$ lightspec show add-profile-filters         # Review proposal, tasks, and spec delta
```

#### 3. Refine the Specs
Iterate on the specifications until they match your needs:

```text
You: Can you add acceptance criteria for the role and team filters?

AI:  I'll update the spec delta with scenarios for role and team filters.
     *Edits lightspec/changes/add-profile-filters/specs/profile/spec.md and tasks.md.*
```

#### 4. Implement the Change
Once specs look good, start implementation:

```text
You: The specs look good. Let's implement this change.
     (Shortcut for tools with slash commands: /lightspec:apply add-profile-filters)

AI:  I'll work through the tasks in the add-profile-filters change.
     *Implements tasks from lightspec/changes/add-profile-filters/tasks.md*
     *Marks tasks complete: Task 1.1 ✓, Task 1.2 ✓, Task 2.1 ✓...*
```

#### 5. Archive the Completed Change
After implementation is complete, archive the change:

```text
AI:  All tasks are complete. The implementation is ready.

You: Please archive the change
     (Shortcut for tools with slash commands: /lightspec:archive add-profile-filters)

AI:  I'll archive the add-profile-filters change.
    *Runs: lightspec archive add-profile-filters --yes*
     ✓ Change archived successfully. Specs updated. Ready for the next feature!
```

Or run the command yourself in terminal:
```bash
$ lightspec archive add-profile-filters --yes  # Archive the completed change without prompts
```

**Note:** Tools with native slash commands (Claude Code, CodeBuddy, Cursor, Codex, Qoder, RooCode) can use the shortcuts shown. All other tools work with natural language requests to "create an LightSpec proposal", "apply the LightSpec change", or "archive the change".

## Command Reference

```bash
lightspec list               # View active change folders
lightspec view               # Interactive dashboard of specs and changes
lightspec show <change>      # Display change details (proposal, tasks, spec updates)
lightspec validate <change>  # Check spec formatting and structure
lightspec archive <change> [--yes|-y]   # Move a completed change into archive/ (non-interactive with --yes)
```

## Example: How AI Creates LightSpec Files

When you ask your AI assistant to "add two-factor authentication", it creates:

```
lightspec/
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

### AI-Generated Spec (created in `lightspec/specs/auth/spec.md`):

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

### AI-Generated Change Delta (created in `lightspec/changes/add-2fa/specs/auth/spec.md`):

```markdown
# Delta for Auth

## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- WHEN a user submits valid credentials
- THEN an OTP challenge is required
```

### AI-Generated Tasks (created in `lightspec/changes/add-2fa/tasks.md`):

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

## Understanding LightSpec Files

### Delta Format

Deltas are "patches" that show how specs change:

- **`## ADDED Requirements`** - New capabilities
- **`## MODIFIED Requirements`** - Changed behavior (include complete updated text)
- **`## REMOVED Requirements`** - Deprecated features

**Format requirements:**
- Use `### Requirement: <name>` for headers
- Every requirement needs at least one `#### Scenario:` block
- Use SHALL/MUST in requirement text

## How LightSpec Compares

### vs. spec-kit
LightSpec’s two-folder model (`lightspec/specs/` for the current truth, `lightspec/changes/` for proposed updates) keeps state and diffs separate. This scales when you modify existing features or touch multiple specs. spec-kit is strong for greenfield/0→1 but provides less structure for cross-spec updates and evolving features.

### vs. Kiro.dev
LightSpec groups every change for a feature in one folder (`lightspec/changes/feature-name/`), making it easy to track related specs, tasks, and designs together. Kiro spreads updates across multiple spec folders, which can make feature tracking harder.

### vs. No Specs
Without specs, AI coding assistants generate code from vague prompts, often missing requirements or adding unwanted features. LightSpec brings predictability by agreeing on the desired behavior before any code is written.

## Team Adoption

1. **Initialize LightSpec** – Run `lightspec init` in your repo.
2. **Start with new features** – Ask your AI to capture upcoming work as change proposals.
3. **Grow incrementally** – Each change archives into living specs that document your system.
4. **Stay flexible** – Different teammates can use Claude Code, CodeBuddy, Cursor, or any AGENTS.md-compatible tool while sharing the same specs.

Run `lightspec update` whenever someone switches tools so your agents pick up the latest instructions and slash-command bindings.

## Updating LightSpec

1. **Upgrade the package**
   ```bash
   npm install -g @viteinfinite/lightspec@latest
   ```
2. **Refresh agent instructions**
   - Run `lightspec update` inside each project to regenerate AI guidance and ensure the latest slash commands are active.

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

## Agent Skills

LightSpec includes 3 Claude Code skills for the core development workflow:
- `lightspec-new` - Create a new change
- `lightspec-apply` - Get apply instructions for implementation
- `lightspec-archive` - Archive a completed change

See [README_SKILLS.md](README_SKILLS.md) for details.

## License

MIT
