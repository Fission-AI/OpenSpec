# Workspace Exploration

## Context

While simplifying skill installation, we identified deeper questions about how profiles, config, and workspaces should work together. This doc captures what we've decided, what's open, and what needs research.

**Update:** Initial exploration revealed that "workspaces" isn't primarily about config layering—it's about a more fundamental question: **where do specs and changes live when work spans multiple modules or repositories?**

---

## Part 1: Profile & Config (Original Scope)

### What We've Decided

#### Profile UX (Simplified)

**Before (original proposal):**
```
openspec profile set core|extended
openspec profile install <workflow>
openspec profile uninstall <workflow>
openspec profile list
openspec profile show
openspec config set delivery skills|commands|both
openspec config get delivery
openspec config list
```
8 subcommands, two concepts (profile + config)

**After (simplified):**
```
openspec config profile          # interactive picker (delivery + workflows)
openspec config profile core     # preset shortcut
openspec config profile extended # preset shortcut
```
1 command with presets, one concept

#### Interactive Picker

```
$ openspec config profile

Delivery: [skills] [commands] [both]
                              ^^^^^^

Workflows: (space to toggle, enter to save)
[x] propose
[x] explore
[x] apply
[x] archive
[ ] new
[ ] ff
[ ] continue
[ ] verify
[ ] sync
[ ] bulk-archive
[ ] onboard
```

One place to configure both delivery method and workflow selection.

#### Why "Profile" (Not "Workflows")

Profiles as an abstraction allow for future extensibility:
- Methodology bundles (spec-driven, test-driven)
- User-created profiles
- Shareable profiles
- Different skill/command sets for different approaches

### Config Layering Research

We researched how similar tools handle config layering:

| Tool | Model | Key Pattern |
|------|-------|-------------|
| **VSCode** | User → Workspace → Folder | Objects merge, primitives override. Workspace = committed `.vscode/` in repo |
| **ESLint (flat)** | Single root config | *Deliberately killed cascading* - "complexity exploded exponentially" |
| **Turborepo** | Root + package extends | Per-package `turbo.json` with `extends: ["//"]` for overrides |
| **Nx** | Integrated vs Package-based | Two modes - shared root OR per-package. Hard to migrate from integrated. |
| **pnpm** | Workspace root defines scope | `pnpm-workspace.yaml` at root. Dependencies can be shared or per-package |
| **Claude Code** | Global + Project | `~/.claude/` for global, `.claude/` per-project. No workspace tracking. |
| **Kiro** | Distributed per-root | Each folder has `.kiro/`. Aggregated display, no inheritance. |

**Key insight from ESLint:** The ESLint team explicitly removed cascading in flat config because cascading was a complexity nightmare. Their new model: one config at root, use glob patterns to target subdirectories.

**Recommendation for profiles/config:** Two layers is enough.
- **Global** = user's defaults (`~/.config/openspec/`)
- **Project** = repo-level config (`.openspec/` or committed to repo)

No "workspace" layer needed for config. This matches Claude Code's model.

### Config Decision (For This Change)

Keep it simple:
1. Global profile as default for `openspec init`
2. `openspec init` applies current profile to project
3. No workspace tracking (yet)
4. No auto-sync of existing projects

This is explicit and doesn't prevent future features.

---

## Part 2: The Deeper Problem (Spec & Change Organization)

### The Real Question

The workspace question isn't about config—it's about **where specs and changes live** when:

1. **Monorepos**: A spec or change might span multiple packages/apps
2. **Multi-repo**: A change might span multiple repositories entirely
3. **Cross-functional work**: A feature affects multiple teams (backend, web, iOS, Android)

### Current OpenSpec Architecture

OpenSpec currently assumes:
- One `openspec/` per repo, always at root
- CLI doesn't walk up directories—expects you're at root
- Changes can touch ANY spec (no scoping)
- Single config applies to everything
- No notion of "scope" or "boundary" within a project

```
openspec/
├── specs/
│   ├── auth/spec.md           # Domain-organized specs
│   ├── payments/spec.md
│   └── checkout/spec.md
├── changes/
│   └── add-oauth/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/             # Delta specs (can touch multiple)
│           ├── auth/spec.md
│           └── checkout/spec.md
└── config.yaml
```

**This works well for single-project repos.** But what about:
- Large monorepos with 50+ packages?
- Multi-repo microservices?
- Cross-functional features spanning multiple teams?

### The Checkout/Payment Example

Imagine a payment system with:
- **Backend billing team**: Owns payment processing
- **Web team**: Owns web checkout UX
- **iOS team**: Owns iOS checkout UX
- **Android team**: Owns Android checkout UX
- **Cross-cutting**: The payment *contract* all clients must follow

**Questions:**
- Where does the shared payment contract spec live?
- Where do platform-specific checkout specs live?
- If iOS spec "extends" the shared contract, how is that expressed?
- When the contract changes, how do downstream specs get updated?
- Who owns what?

### The Core Tension

```
                    SCOPE
                      │
         Narrow       │       Broad
    (team/module)     │    (cross-cutting)
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    │  "Our team's    │   "Shared       │
    │   checkout      │    checkout     │
    │   behavior"     │    contract"    │
    │                 │                 │
────┼─────────────────┼─────────────────┼──── OWNERSHIP
    │                 │                 │
    │  Easy:          │   Hard:         │
    │  One team,      │   Multiple      │
    │  one spec       │   stakeholders  │
    │                 │                 │
    └─────────────────┴─────────────────┘
```

---

## Part 3: How Other Domains Solve This

### Patterns from Research

| Domain | Shared Stuff | Specific Stuff | How They Connect |
|--------|-------------|----------------|------------------|
| **Protobuf** | `common/` at root | `domain/service/` per service | Imports from common |
| **Design Systems** | Design tokens, component names, APIs | Platform implementations | "Same properties, different rendering" |
| **DDD** | Shared Kernel | Bounded Contexts | Context mapping defines relationships |
| **RFCs** | Cross-cutting RFCs | Team-scoped RFCs | Different review processes |
| **OpenAPI** | Base schemas | Per-service specs | `$ref` to shared definitions |

### Protobuf Monorepo Pattern

```
proto/
├── common/              # Shared, low-churn types
│   └── money.proto
│   └── address.proto
├── billing/             # Domain-specific
│   └── service.proto
└── checkout/
    └── service.proto    # Imports from common/
```

**Key insight:** "Most engineering organizations should keep their proto files in one repo. The mental overhead stays constant instead of scaling with organization size."

### Design Systems Pattern (Booking.com, Uber)

> "Components can look quite different between iOS and Android, as they use native app design standards, but still share the **same exact properties in code**. This is what makes properties so powerful—it's the **one source of truth** for every component."

**Key insight:** Shared spec defines the *contract* (properties, behavior). Platform specs define *implementation details* (how it looks/works on that platform).

### DDD Bounded Contexts

> "One context, one team. Clear ownership avoids miscommunication."

**Key insight:** Specs should have clear ownership. Cross-cutting concerns use a "Shared Kernel" pattern—explicitly shared code/specs that require coordination to change.

---

## Part 4: Three Models for OpenSpec

### Model A: Flat Root (Current)

```
openspec/
├── specs/
│   ├── checkout-contract/    # Shared contract
│   ├── checkout-web/         # Web-specific
│   ├── checkout-ios/         # iOS-specific
│   ├── checkout-android/     # Android-specific
│   ├── billing/              # Backend
│   └── ... (50+ specs at root level)
└── changes/
```

**Pros:**
- Simple mental model
- All specs in one place
- No nesting complexity

**Cons:**
- Gets unwieldy at scale (50+ directories)
- No clear ownership signals
- Hard to see which specs are related
- Naming conventions become critical (`checkout-*`)

### Model B: Nested Specs (Domain → Platform)

```
openspec/
├── specs/
│   ├── checkout/
│   │   ├── spec.md              # Shared contract (the "interface")
│   │   ├── web/spec.md          # Web implementation spec
│   │   ├── ios/spec.md          # iOS implementation spec
│   │   └── android/spec.md      # Android implementation spec
│   └── billing/
│       └── spec.md
└── changes/
```

**Pros:**
- Clear hierarchy (shared at top, specific nested)
- Related specs are co-located
- Scales better visually
- Ownership can follow structure

**Cons:**
- More complex spec references (`checkout/web` vs `checkout`)
- Need to define inheritance/extension semantics
- Does iOS spec "extend" base spec, or just reference it?

**Open question:** What does "extends" mean?
```yaml
# checkout/ios/spec.md
extends: ../spec.md   # Inherits all requirements?
requirements:
  - System SHALL support Apple Pay  # Adds to base?
```

### Model C: Distributed Specs (Near the Code)

```
monorepo/
├── services/
│   └── billing/
│       └── openspec/specs/billing/spec.md
├── clients/
│   ├── web/
│   │   └── openspec/specs/checkout/spec.md
│   ├── ios/
│   │   └── openspec/specs/checkout/spec.md
│   └── android/
│       └── openspec/specs/checkout/spec.md
└── openspec/           # Root-level for cross-cutting
    ├── specs/
    │   └── checkout-contract/spec.md   # Shared contract
    └── changes/        # Where do cross-cutting changes live?
```

**Pros:**
- Specs live near the code they describe
- Teams own their specs naturally
- Works for multi-repo too (each repo has its own `openspec/`)

**Cons:**
- Cross-cutting specs are awkward (where do they go?)
- Changes that span multiple `openspec/` directories = ???
- Need a "workspace" concept to aggregate
- Multiple `openspec/` roots to manage

### Model D: Hybrid (Model B Inside Each Project + Model C Across Projects)

Use one `openspec/` root per project, but allow nested specs within that root for clear ownership and shared contracts.
For multi-repo work, use a workspace manifest to coordinate multiple projects without duplicating canonical specs.

**Monorepo shape (single project, nested specs):**
```
repo/
└── openspec/
    ├── specs/
    │   ├── contracts/
    │   │   └── checkout/spec.md
    │   ├── billing/
    │   │   └── spec.md
    │   └── checkout/
    │       ├── web/spec.md
    │       ├── ios/spec.md
    │       └── android/spec.md
    └── changes/
        └── add-3ds/
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                ├── contracts/checkout/spec.md
                ├── billing/spec.md
                ├── checkout/web/spec.md
                ├── checkout/ios/spec.md
                └── checkout/android/spec.md
```

**Multi-repo shape (multiple projects + workspace orchestration):**
```
~/work/
├── contracts/
│   └── openspec/
│       ├── specs/checkout/spec.md
│       └── changes/add-3ds-contract/
├── billing-service/
│   └── openspec/
│       ├── specs/billing/spec.md
│       └── changes/add-3ds-billing/
├── web-client/
│   └── openspec/
│       ├── specs/checkout/spec.md
│       └── changes/add-3ds-web/
├── ios-client/
│   └── openspec/
│       ├── specs/checkout/spec.md
│       └── changes/add-3ds-ios/
└── payments-workspace/
    └── .openspec-workspace/
        ├── workspace.yaml
        └── initiatives/add-3ds/links.yaml
```

`workspace.yaml` lists projects/roots. `links.yaml` maps one cross-cutting initiative to per-project changes.
Canonical specs stay in owning repos; workspace data is coordination metadata only.

**Pros:**
- Clear ownership boundaries (one project owns its specs and changes)
- Shared contracts can have a dedicated owner repo (no duplication as source of truth)
- Works for monorepo and multi-repo with one mental model
- Avoids inheritance complexity (relationships can start as explicit references)
- Incremental migration path from current model

**Cons:**
- Requires new workspace UX for cross-repo coordination
- Cross-repo feature work creates multiple change IDs to manage
- Needs conventions for contracts ownership and initiative linking
- Some users may expect one global "mega change" instead of linked per-project changes
- Tooling must support nested spec paths in both main specs and change deltas

---

## Part 5: Multi-Repo Considerations

For multi-repo setups, Model C (or the coordination half of Model D) is almost forced:

```
~/work/
├── billing-service/
│   └── openspec/specs/billing/
├── web-client/
│   └── openspec/specs/checkout/
├── ios-client/
│   └── openspec/specs/checkout/
└── contracts/                    # Dedicated repo for shared specs?
    └── openspec/specs/
        └── checkout-contract/
```

### Questions for Multi-Repo

1. **Where do shared specs live?**
   - Dedicated "contracts" repo?
   - Duplicated in each repo (drift risk)?
   - One repo is "source of truth" and others reference it?

2. **Where do cross-repo changes live?**
   - In one of the repos? (feels wrong—biased ownership)
   - In a separate "workspace" repo?
   - In `~/.config/openspec/workspaces/my-platform/changes/`?

3. **How do changes propagate?**
   - Change to `checkout-contract` affects all client repos
   - Do we need explicit dependency tracking?
   - Or is this "out of band" (teams coordinate manually)?

### What "Workspace" Might Mean for Multi-Repo

If we add workspace support, it could be:

> **A workspace is a collection of OpenSpec roots that can be operated on together.**

```yaml
# ~/.config/openspec/workspaces.yaml (or similar)
workspaces:
  my-platform:
    roots:
      - ~/work/billing-service
      - ~/work/web-client
      - ~/work/ios-client
      - ~/work/contracts
    shared_context: |
      All services use TypeScript.
      API contracts follow OpenAPI 3.1.
```

This would enable:
1. **Cross-repo changes**: Create a change that tracks deltas across multiple roots
2. **Aggregated spec view**: See all specs across workspace
3. **Shared context**: Context/rules that apply to all roots

---

## Part 6: Key Design Questions

### 1. Should specs be hierarchical (with inheritance)?

**Option A: No inheritance, just organization**
- Nested directories are purely organizational
- Each spec is independent
- Relationships are implicit (naming) or documented manually

**Option B: Explicit inheritance**
```yaml
# checkout/ios/spec.md
extends: ../spec.md
requirements:
  - System SHALL support Apple Pay  # Adds to base
```
- Child specs inherit parent requirements
- Can add, override, or extend
- More powerful but more complex

**Option C: References without inheritance**
```yaml
# checkout/ios/spec.md
references:
  - ../spec.md  # "See also" but no inheritance
requirements:
  - System SHALL implement checkout per checkout-contract
  - System SHALL support Apple Pay
```
- Explicit references for documentation
- No automatic inheritance
- Simpler semantics

### 2. Where does the "shared kernel" live?

**Option A: Root level (Model B)**
- `openspec/specs/checkout/spec.md` is the shared kernel
- Platform specs nest under it

**Option B: Dedicated area**
- `openspec/specs/_shared/checkout-contract/spec.md`
- Or `openspec/specs/_contracts/checkout/spec.md`
- Explicit "shared" namespace

**Option C: Separate repo (Model C for multi-repo)**
- A dedicated `contracts` or `specs` repo
- Other repos reference it

### 3. What's a "workspace" vs a "project"?

If we introduce workspaces:

| Concept | Definition |
|---------|------------|
| **Project** | Single OpenSpec root (one `openspec/` directory) |
| **Workspace** | Collection of projects that can be operated on together |

A workspace would enable:
- Aggregated spec viewing across projects
- Cross-project changes
- Shared context across projects

**Question:** Do we need explicit workspace tracking, or just ad-hoc multi-root (like Claude Code's `/add-dir`)?

### 4. Does OpenSpec need to understand dependencies?

If `checkout-web` depends on `checkout-contract`:
- Should OpenSpec know this relationship?
- Should a change to `checkout-contract` warn about downstream specs?
- Or is dependency tracking "out of scope"?

**Trade-off:**
- With dependency tracking: More powerful, automatic propagation warnings
- Without: Simpler, teams manage dependencies themselves

### 5. How should changes work for cross-cutting work?

**For monorepos (Model B):**
- One change, multiple delta specs in `specs/`
- Already works today

**For multi-repo (Model C):**
- Option A: One "workspace change" that references multiple repo changes
- Option B: Separate changes in each repo that reference each other
- Option C: Changes always live in one repo, reference specs in others

---

## Part 7: What Would "Amazing" Look Like?

Based on research, teams love:

1. **One place to look** (Protobuf: "mental overhead stays constant")
2. **Clear ownership** (DDD: "one context, one team")
3. **Shared contracts with local extensions** (Design Systems: "same properties, different rendering")
4. **Automatic consistency** (Design Systems: "design tokens as foundation")
5. **Low cognitive load** (shouldn't have to think about organization too much)

### Possible North Stars

**Ambitious:**
> OpenSpec automatically understands your repo structure, detects cross-cutting specs, and helps you create changes that flow to the right places.

**Simpler:**
> You organize specs however you want. OpenSpec just works.

**Practical:**
> Nested specs for organization. Explicit dependencies for cross-cutting. No magic.

---

## Part 8: Possible Paths Forward

### For This Change (simplify-skill-installation)

Don't solve spec organization now. Keep scope to:
1. Profile UX simplification
2. `openspec init` improvements
3. No workspace tracking yet

### Future: Spec Organization Change

A separate change to explore and implement:

1. **Decide on Model A, B, C, or D (hybrid)**
2. **Decide on inheritance semantics** (or none)
3. **Update spec resolution** to handle nesting
4. **Update change deltas** to handle nested specs

### Future: Multi-Repo / Workspace Change

If needed, a separate change for:

1. **Define workspace concept**
2. **Implement workspace tracking** (or ad-hoc multi-root)
3. **Cross-repo changes**
4. **Shared context across repos**

---

## Part 9: Spec Philosophy (Behavior First, Lightweight, Agent-Aligned)

### What is a spec in OpenSpec?

For OpenSpec, a spec should be treated as a **verifiable behavior contract at a boundary**:
- What users, integrators, or operators can observe and rely on
- What can be validated with tests, checks, or explicit review
- What should remain stable even if internal implementation changes

### What should and should not be in specs

**Include:**
- Observable behavior and outcomes
- Interface/data contracts (inputs, outputs, error conditions)
- Non-functional constraints that matter externally (privacy, security, reliability)
- Compatibility guarantees that downstream consumers depend on

**Avoid:**
- Internal implementation details (class names, library choices, control flow)
- Tooling mechanics that can change without affecting behavior
- Step-by-step execution plans (belongs in tasks/design)

### Keep rigor proportional (to avoid bureaucracy)

Use progressive rigor:

1. **Lite spec (default for most changes)**
   - Short behavior bullets, clear scope, and acceptance checks
2. **Full spec (only for high-risk or cross-boundary work)**
   - Deeper contract detail for API breaks, migrations, security/privacy, or cross-team/repo changes

This keeps day-to-day usage lightweight while preserving clarity where failures are expensive.

### Human exploration -> agent-authored specs

OpenSpec is often agent-authored from human exploration. To make that reliable:

- Humans provide intent, constraints, and examples from exploration
- Agents convert that into concise, behavior-first requirements and scenarios
- Agents keep implementation detail in design/tasks, not specs
- Validation checks enforce structure and testability

In short: humans shape intent; agents produce consistent, verifiable contracts.

### Where this philosophy should live

To avoid losing this in exploration notes, codify it in:
1. `docs/concepts.md` for human-facing framing
2. `openspec/specs/openspec-conventions/spec.md` for normative spec conventions
3. `openspec/specs/docs-agent-instructions/spec.md` for agent-instruction authoring rules

---

## Summary

| Question | Status | Notes |
|----------|--------|-------|
| Profile UX | Decided | `openspec config profile` with presets |
| Config layering | Decided | Two layers: global + project (no workspace layer) |
| Spec organization | Open | Four models under consideration (including hybrid Model D) |
| Spec philosophy | Direction set | Behavior-first contracts, progressive rigor, and agent-aligned authoring |
| Spec inheritance | Open | Inheritance vs references vs none |
| Multi-repo support | Open | Workspace concept TBD |
| Dependency tracking | Open | Probably out of scope initially |

### Key Insight

The "workspace" question is really two separate questions:
1. **Config/profile scope** → Solved with global + project (no workspace needed)
2. **Spec/change organization** → Unsolved, needs deeper design work

These should be separate changes with separate explorations.

---

## References

- [VSCode Settings Precedence](https://code.visualstudio.com/docs/configure/settings)
- [ESLint Flat Config in Monorepos Discussion](https://github.com/eslint/eslint/discussions/16960)
- [Turborepo Package Configurations](https://turborepo.dev/docs/reference/package-configurations)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [Kiro Multi-Root Workspaces](https://kiro.dev/docs/editor/multi-root-workspaces/)
- [DDD Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)
- [Protobuf Monorepo Patterns](https://www.lesswrong.com/posts/xts8dC3NeTHwqYgCG/keep-your-protos-in-one-repo)
- [Booking.com Multi-Platform Design System](https://booking.design/how-we-built-our-multi-platform-design-system-at-booking-com-d7b895399d40)
- [InnerSource RFC Patterns](https://patterns.innersourcecommons.org/p/transparent-cross-team-decision-making-using-rfcs)
