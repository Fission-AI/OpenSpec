# RFC 0001 Appendix: Research, Decisions & Background

> This document accompanies [RFC 0001: OpenSpec Workspaces](./0001-openspec-workspaces.md).
> It contains the research, Q&A, decision rationale, and design exploration that informed the main RFC.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Background & Motivation](#background--motivation)
3. [Key Decisions (V1)](#key-decisions-v1)
4. [Research: Cross-Platform Storage](#research-cross-platform-storage)
5. [Q&A: Design Clarifications](#qa-design-clarifications)
6. [Risk Analysis](#risk-analysis)
7. [Alternatives Considered](#alternatives-considered)
8. [Future Considerations](#future-considerations)

---

## Executive Summary

OpenSpec is being split into two concerns:

1. **Specs** (source of truth) — remain in-repo at `/openspec/specs/`
2. **Change proposals** (planning context) — move to a centralized user-scoped directory at `~/.config/openspec/`

This enables:
- Multi-repo planning without duplicating proposals
- Simplified change lifecycle (no archival step)
- Path to customizable planning workflows
- Better agent context management

---

## Background & Motivation

### Problems Being Solved

1. **Multi-repo coordination**: Teams working across multiple repos currently must duplicate change proposals in each repo, leading to drift and coordination overhead.

2. **Convoluted archival process**: The current workflow requires agents to make exact copies of specs, then archive changes after applying. This is error-prone and adds friction.

3. **Limited customization**: The tightly-coupled structure makes it hard to customize the planning process or add features.

### Benefits of the New Approach

| Benefit | Single-Repo Users | Multi-Repo Teams |
|---------|-------------------|------------------|
| Simpler workflow | No archival step | Single change spans repos |
| Better PRs | Spec + code diff together | Coordinated changes |
| Agent context | Clear active change | Cross-repo awareness |
| Customization | Planning templates | Shared workflows |

### Why Split Specs and Changes?

- **Specs are code** — they belong with the codebase, versioned in git, reviewed in PRs
- **Changes are ephemeral** — they're planning artifacts that don't need to live in the repo permanently
- **Cross-repo changes need a home** — can't pick one repo arbitrarily; centralized location is neutral ground

---

## Key Decisions (V1)

### 1. Workspace/Index Location

**Decision**: `~/.config/openspec/index.json` (XDG-style)

**Rationale**: XDG spec is the modern standard for CLI tools, has clear cross-platform mappings, and libraries exist in every language.

**RepoId format**: `{primary-remote-url}@{default-branch}`
- Supports multiple local clone paths for the same repo
- SSH/HTTPS variants normalize to same ID
- Repos without remotes fall back to local path hash

### 2. Active Context Projection

**Decision**: Write a git-ignored shadow manifest `./.openspec-context.json` in each attached repo.

**V1 Schema**:
```
schemaVersion, generatedAt, repoId, workspaceId, branch,
activeChangeId|null, changeTitle, status,
specRoots, tasks array, warnings,
sourceHash/sourceVersion
```

**Rationale**: Agents can discover context without CLI calls; file is lightweight and regenerated on demand.

### 3. Refresh Policy

**Decision**: Regenerate the manifest on any context-touching command (`openspec status/context/set-active/attach`) if missing or branch mismatch detected. Force refresh via `openspec context --refresh`.

**V1 Simplification**: No age checks; git-less repos skip branch checks.

### 4. Drift Detection

**Decision**: `openspec verify` auto-runs on `status/context`, surfaces drift as **warnings only** (non-blocking).

**Rationale**: Start with visibility, not enforcement. Let users understand drift before making it blocking.

### 5. Task Storage

**Decision**: Stay as Markdown checkboxes in V1.

**Future option**: Normalize to structured format (JSONL/SQLite) for better agent integration, but not required for V1.

### 6. Cross-Repo Specs

**Decision**: Defer to future version with dedicated "specs repo" as canonical home for cross-repo capabilities.

**Rationale**: This is complex and not needed for V1. Single-repo and simple multi-repo cases work without it.

### 7. Active Change Detection

**Decision**: Use git branch to determine which change is active.

**How it works**:
- When user creates a change, they optionally create a feature branch
- OpenSpec detects current branch and maps it to corresponding change
- If on main/master, user can manually select which change to work on

**Open questions** (deferred):
- Where is branch→change mapping stored?
- Handling multiple changes for same branch?
- Branch renames?

### 8. Agent Integration Strategy

**Decision**: Support multiple modes (hybrid approach).

| Mode | Target | How it works |
|------|--------|--------------|
| SDK mode | Claude Code, etc. | OpenSpec invokes agent, injects context, verifies completion |
| CLI mode | Cursor, etc. | Agent calls CLI commands, best-effort tracking |
| Manual mode | Any | User manually syncs, OpenSpec provides verification |

**Rationale**: Provide best experience where possible while still working with any agent.

### 9. Spec Sync Strategy

**Decision**: Push-based updates as ideal path, `openspec verify` for manual sync/drift detection.

**Push-based** (ideal): All changes go through OpenSpec commands which update both the proposal and trigger code changes.

**Pull-based** (fallback): `openspec verify` command compares spec-deltas to actual spec files and reports what's out of sync.

**Automatic sync** (future): File watchers or git hooks, but start with manual for V1.

---

## Research: Cross-Platform Storage

### Location Options Compared

| Approach | macOS | Linux | Windows | Used by |
|----------|-------|-------|---------|---------|
| XDG spec | `~/.config/openspec` | `~/.config/openspec` | `%APPDATA%\openspec` | Many CLI tools |
| Home dotfile | `~/.openspec` | `~/.openspec` | `%USERPROFILE%\.openspec` | npm, cargo, rustup |
| App Support | `~/Library/Application Support/openspec` | `~/.local/share/openspec` | `%LOCALAPPDATA%\openspec` | VS Code, Electron apps |

### Recommendation

Use XDG-style (`~/.config/openspec`) because:
- Modern standard for CLI tools
- Clear cross-platform mappings
- Libraries exist in every language (`dirs` in Rust, `appdirs` in Python, `env-paths` in Node)
- Keeps home directory cleaner than dotfiles

**Note**: `~/.openspec` is hidden by default (dot prefix) which conflicts with "open in editor" goal. Consider `~/openspec` if visibility matters, but XDG is more conventional.

---

## Q&A: Design Clarifications

### Location and Structure

**Q1: Where exactly does `.openspec` live?**

A: `~/.config/openspec` (XDG-style). For V1, assume change proposals only exist locally. Cloud/git-based sync for team sharing is deferred.

**Q2: What's the structure inside `.openspec`?**

A: File-based structure so teams can open the folder in their code editor:
```
~/.config/openspec/
├─ index.json                    # repo/workspace index
└─ workspaces/<workspace-id>/
   ├─ workspace.json             # attached repos, defaults
   └─ changes/<change-id>/
       ├─ proposal.md            # overview, design choices
       ├─ tasks.md               # task breakdown with checkboxes
       └─ specs/                 # spec deltas
```

**Q3: How are repos "attached" to a workspace?**

A: Configuration reference (not symlinks). User selects a folder/repository locally. Does not need to be git-enabled, but git provides branch detection benefits.

### Multi-Repo Mechanics

**Q4: How does a single change span multiple repos?**

A: Expand existing spec-deltas concept across repos. Task phases can be split between repos (e.g., "Phase 1: API repo", "Phase 2: Frontend repo").

**Q5: How do PRs work across repos?**

A: Left to the developer. OpenSpec helps create changes in each repo; PR management is manual. This is intentional — automated cross-repo transactions are complex and error-prone.

**Q6: How do you handle version coordination?**

A: Planning is based on local version of repos (or main/master). Explicit version dependencies are out of scope for V1.

**Q7: Where do cross-repo specs live?**

A: Deferred. Initial thinking: a dedicated "specs repo" that OpenSpec manages. For V1, keep specs in individual repos.

### Agent Integration

**Q8: How do agents discover the relevant context?**

A: Agent calls OpenSpec CLI from the repository. CLI identifies workspace and returns relevant context. Alternatively, read `.openspec-context.json` manifest directly.

**Q9: Do agents need CLI commands to access context?**

A: CLI is the primary method. The manifest (`.openspec-context.json`) provides a cached view to reduce CLI calls. Trade-off: manifest can be stale, but refresh is cheap.

**Q10: What if an agent modifies specs directly?**

A: Changes live in `~/.config/openspec`, specs live in repos. Agent can modify specs directly (they're just files). `openspec verify` detects drift between expected and actual state.

### Workflow and State

**Q11: What's the lifecycle of a change?**

A: `Draft → In Progress → Completed`

There may be sub-states in drafting (research, planning, breakdown). This should be configurable for users.

**Q12: What does the "work log" contain?**

A: Agent-generated record of work done. Less important for V1; deferred.

**Q13: How does "active change" context work?**

A: Branch-based detection is the primary method. Open question: how to handle non-git repos or when working on main. Stored state vs. git reconstruction needs more thought.

**Q14: How do you resume work on a change?**

A: Agent reads the change, looks at which tasks are ticked off, reviews any work log, and picks up from there.

### Task Management

**Q15: Why is task management "unknown" if it's core to planning?**

A: Goal is minimal V1, not complete solution. Markdown checkboxes work today. Agent forgetfulness is a known issue but not blocking for V1.

**Q16: What's wrong with current task tracking?**

A: Agents forget to tick checkboxes after doing work. This is an agent behavior problem, not purely a data model problem. Solutions involve better prompting, verification, or agent-side tooling.

**Q17: Should task state live in `.openspec` or in-repo?**

A: Central (`~/.config/openspec`) for simplicity.

### Migration and Compatibility

**Q18: How do existing users migrate?**

A: Automatic migration on CLI update. Detect existing `/openspec/changes`, copy to workspace store, write manifests.

**Q19: Are you removing the in-repo changes workflow?**

A: Yes, eventually. One flow to maintain. May keep legacy layout as read-only during transition.

---

## Risk Analysis

### High Risk

#### Agent Context Accessibility (Partially Mitigated)

Moving change context outside the repo is the biggest risk. Currently, agents work because all context is co-located in `/openspec/`.

**Concerns**:
- Agents lose direct filesystem access to change proposals
- CLI fetch adds friction and indirection
- Not all agent systems can invoke CLI commands mid-task
- Mental model breaks: "where I'm coding" vs. "where my plan lives"

**Mitigation**: Hybrid agent integration (SDK/CLI/Manual modes), shadow manifest for quick reads.

### Medium-High Risk

#### Multi-Repo Coordination Complexity

Multi-repo is the main selling point but introduces complexity:
- No atomic cross-repo git transactions
- PR coordination is manual and error-prone
- Version dependencies need explicit modeling
- CI/CD becomes more complex

**Mitigation**: V1 keeps it simple — no automated PR orchestration, no version enforcement. Let users handle coordination manually.

#### Cross-Repo Spec Ownership

Where do specs live that span multiple repos?

**Options considered**:
| Option | Problem |
|--------|---------|
| Duplicated in each repo | Sync problems, unclear authority |
| In one "primary" repo | Arbitrary, hard to discover |
| In centralized `.openspec` | Split location for specs |
| In separate "specs repo" | Another repo to maintain |

**Decision**: Defer to future "specs repo" concept. V1 keeps specs in individual repos.

### Medium Risk

#### Task Management Undefined

Task management is central but left undefined. This affects:
- Data model for tasks
- Agent integration
- Work log concept

**Mitigation**: Start with Markdown checkboxes. Iterate based on real usage.

#### Location and Portability (Partially Mitigated)

User-level directory creates challenges:
- CI/CD access
- Team collaboration
- Machine portability
- Discoverability

**Mitigation**: Cross-platform location research done. V1 is local-only; team sync deferred.

#### State Synchronization (Partially Mitigated)

Specs in-repo, changes out-of-repo can drift:
- Direct spec edits bypass change tracking
- Stale `.openspec` state
- Orphaned changes when repos deleted

**Mitigation**: `openspec verify` for drift detection. Automatic sync is future work.

### Low-Medium Risk

#### Backwards Compatibility

Existing users have workflows around `/openspec/changes/`.

**Mitigation**: Clear migration path, automatic migration on update, optional read-only legacy support during transition.

---

## Alternatives Considered

### Keep Everything In-Repo

**Pros**: Simple, portable, git-versioned, agent-friendly
**Cons**: Can't support multi-repo, archival is messy

**Why rejected**: Multi-repo is a key goal; this doesn't solve it.

### Monorepo-Only Support

**Pros**: Simpler than true multi-repo, single git history
**Cons**: Many teams don't use monorepos, doesn't help existing multi-repo setups

**Why rejected**: Too limiting; multi-repo is common in practice.

### Git Submodules for Changes

**Pros**: Git-native, versioned, portable
**Cons**: Submodules are notoriously painful, adds complexity

**Why rejected**: Complexity outweighs benefits.

### Cloud-First Storage

**Pros**: Team sync built-in, no local state issues
**Cons**: Requires account/auth, internet dependency, privacy concerns

**Why rejected**: Local-first is simpler for V1; cloud can be added later.

---

## Future Considerations

### Post-V1 Features

1. **Team sync**: Git-based or cloud-based workspace sharing
2. **CI/CD integration**: Environment overrides, workspace exports
3. **Structured tasks**: JSONL or SQLite for better agent integration
4. **Cross-repo specs**: Dedicated specs repo as canonical home
5. **Work logs**: Agent-generated session records
6. **Branch→change mapping**: More robust active change detection
7. **API/SDK**: Programmatic access beyond CLI

### Open Design Questions

- How granular is drift detection?
- Should verification block PR creation or just warn?
- How to handle branch renames?
- What if multiple changes exist for the same branch?
- How to represent cross-repo spec ownership without a dedicated specs repo?

### Agent Integration Evolution

Current thinking on improving agent task completion:
1. Better prompting (explicit reminders to tick checkboxes)
2. Verification commands (agent calls `openspec verify` before finishing)
3. SDK mode (OpenSpec invokes agent, validates completion)
4. Work log (track what agent actually did vs. what was planned)

---

## References

- [RFC 0001: OpenSpec Workspaces](./0001-openspec-workspaces.md) — the main RFC
- XDG Base Directory Specification
- Similar tools: Nx, Turborepo, Lerna (monorepo coordination)
