## Context

The openspec workflow today has a gap between thinking and building: the explore skill is a free-form conversation that leaves no trace, and the propose skill has no awareness of prior exploration. This change adds a persistent exploration layer — exploration docs written during explore sessions — and connects the propose workflow to that layer. It also introduces `enpal-spec-driven` as a named schema that documents this convention.

**Current state:**
- `openspec-explore`: free-form thinking partner, no output, no gate
- `openspec-propose`: creates change artifacts independently, no exploration context
- `schemas/spec-driven/`: only schema, ships with the package

**Stakeholders:** Engineers using enpalspec as their development workflow tool.

## Goals / Non-Goals

**Goals:**
- Exploration sessions produce a durable, structured document in `openspec/explorations/`
- Propose checks for exploration before creating artifacts, makes its context explicit
- `enpal-spec-driven` schema exists as a named, project-local alternative to `spec-driven`
- Explore skill transitions naturally from free-form to structured Q&A without forcing it

**Non-Goals:**
- Exploration is not a schema artifact (no changes to artifact graph, status command, or path resolution)
- No changes to the `spec-driven` schema or existing installed skills
- No CLI command changes — this is entirely skill-level behavior
- Skill prefix renaming (`opsx` → `enpalspec`) is out of scope (belongs to `enpalspec-fork`)

## Decisions

### Decision 1: Exploration docs live outside the change directory

**Choice:** `openspec/explorations/<yyyy-mm>/exploration-<date>-<topic>.md` at project root level, not inside `openspec/changes/<name>/`.

**Why:** Explorations are not one-to-one with changes. A single exploration may seed multiple changes, or an exploration may happen before a change exists. Keeping them in a shared folder with date-based subdirectories makes them discoverable and gives a historical trail.

**Alternatives considered:**
- `openspec/changes/<name>/exploration.md` — would require a change to exist first; exploration docs would be buried and archived along with the change
- Single flat `openspec/explorations/` folder — loses chronological structure at scale

### Decision 2: Exploration gate lives in the propose skill, not the schema

**Choice:** Propose skill scans for exploration docs and gates; the schema dependency graph is not modified.

**Why:** Exploration is interactive and conversational — it can't be expressed as a file-existence artifact in the current schema model (which checks for files in the change directory with fixed `generates` paths). Putting the gate in the skill keeps the schema system clean and avoids the need to extend `artifactOutputExists` to support project-root-level paths.

**Alternatives considered:**
- `exploration` as a schema artifact with `scope: project` — would require extending the artifact graph resolver; worthwhile future work but not needed now
- No gate at all — propose just reads explorations opportunistically — loses the "mandatory for non-trivial" intent

### Decision 3: Hybrid explore flow — free-form first, Q&A second

**Choice:** Explore starts open-ended (diagrams, codebase reads, thinking out loud), transitions to structured Q&A rounds when concrete decisions surface.

**Why:** Forcing Q&A from the start would interrupt the natural thinking process. Most of the value in exploration is the unstructured wandering; Q&A rounds are for locking in decisions that have emerged, not for driving the exploration forward.

**Alternatives considered:**
- Q&A structured from the start — predictable but interrupts open thinking
- Two separate skills (`explore` + `spec`) — cleanest separation but requires users to know when to switch

### Decision 4: Q&A log appended to doc after each round (not at end)

**Choice:** After the user answers a round, the skill immediately appends that round's Q&A log to the exploration doc before asking the next round.

**Why:** Incremental writes mean progress is never lost if the conversation is interrupted. The doc reflects the live state of the exploration.

### Decision 5: Topic matching in propose uses filename + header heuristic

**Choice:** Propose scans `openspec/explorations/<yyyy-mm>/` files, matches by topic similarity between the change description and the exploration filename + `# Exploration: <topic>` header line.

**Why:** Simple and predictable. The agent performs the similarity judgment; no embedding or search infrastructure needed. When a match is found, the agent states it explicitly.

**Alternatives considered:**
- Explicit exploration reference in change metadata (`.openspec.yaml`) — more precise but requires user action to link; defeats the benefit of automatic context handoff

## Risks / Trade-offs

- **[Risk] Topic matching is fuzzy** → Mitigation: agent states which doc it's using; user can correct if wrong match. False positives are low-cost (user says "that's not the right one").
- **[Risk] Exploration doc grows large over many rounds** → Mitigation: Q&A log format is compact; each round adds ~10-20 lines. Not a practical concern.
- **[Risk] Agent misjudges triviality** → Mitigation: gate is a confirmation prompt, not a hard block. User can always bypass by answering "continue anyway."
- **[Risk] Exploration docs accumulate unbounded** → Mitigation: date-subfolder structure (`<yyyy-mm>/`) keeps them organised; no cleanup mechanism needed now.

## Migration Plan

- No migration required for existing projects using `spec-driven`
- Projects that want `enpal-spec-driven` run `openspec schema fork spec-driven enpal-spec-driven` and update `openspec/config.yaml`
- Existing installed skills are unaffected; new skill behavior takes effect when skills are re-installed via `enpalspec init` (or `openspec init`)
