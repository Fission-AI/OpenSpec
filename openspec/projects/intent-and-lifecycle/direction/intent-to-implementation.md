# Product Direction: Intent to Implementation

**Status:** Working direction · Six product decisions agreed in principle\
**Updated:** November 5, 2026\
**Next product increment:** [Use Existing Context in Changes](./external-context-for-changes.md)

## The idea

**OpenSpec should help teams turn evolving information into scoped software changes, keep track of why the work matters, and assess the result with evidence.**

Software work rarely starts from a blank prompt. The context may be requirements, architecture, designs, API contracts, decisions, prototypes, benchmarks, code, issues, or conversations. It often spans teams and repositories and changes while the work is underway.

OpenSpec should connect that information to the work it informs **without requiring the team to move or recreate it**. It should help people decide what to change, carry decisions through implementation, revisit them as circumstances evolve, and determine what the outcome actually demonstrates.

```text
Existing information and activity
  docs · designs · specs · decisions · code · sessions
                    │
           links + explanations
                    ▼
              Scoped changes
         propose · implement · revise
                    │
                    ▼
             Result + evidence
         tests · demos · benchmarks
                    │
              review and learn
                    └────► update work or shared information
```

This is a product model, not a required file layout or a plan to build a general knowledge-management system.

## The concepts

| Concept | What it means |
| --- | --- |
| **Information** | Anything relevant to work, including a whole resource or a passage within it. It keeps its existing location and format. |
| **Relationship** | An explanation of how information relates to work: *implements*, *follows*, *depends on*, *investigates*, *informed by*, or simply why it matters. It need not be a typed graph edge. |
| **Change** | A scoped unit of proposed or ongoing work, with the decisions and steps needed to execute it. |
| **Expectation / contract** | Something a product, system, API, or component is expected to satisfy. It might be functional, technical, operational, or non-functional, and may span repositories. An OpenSpec spec is one particular way to express a behavioral contract. |
| **Evidence** | Something that supports or challenges a claim about the result: tests, demos, simulations, reviews, benchmarks, and observed outcomes. |
| **Project** | A shared workspace for information and related work. In time, it can also be a boundary for an observer that understands activity and discovers relationships. |

A requirement, decision, or constraint **does not have to become a first-class OpenSpec entity**. An agent can interpret it within a document. OpenSpec needs to preserve enough of the accepted connection to the work for people and later agents to understand it.

### Shared expectations and changes have different jobs

**An expectation describes what should hold true. A change may revise that expectation, implement it, or do both.** Not all relevant information is a contract; some is motivation, design context, or evidence.

For example, one shared checkout contract may cover iOS, Android, and backend systems. Each team can implement its slice against that contract, with its own plan, decisions, tasks, and evidence. The shared requirement need not be copied into each repository. A local spec is useful when the component has additional behavior of its own.

This is about the **boundary a contract governs**, not whether a requirement is “high-level” or “low-level.” The same principle applies to platform constraints, performance targets, and architecture decisions. Ownership may be formal, informal, or unclear; OpenSpec should work without imposing approval bureaucracy.

## What we decided, and why

These six decisions establish the *direction*. They are not claims that every capability is shipped or that its internal design is finished.

### D1. Information stays where it is maintained

**Decision:** Allow shared contracts and other authoritative information to remain outside the implementing change. Changes can modify a contract, implement one, or both. Avoid maintaining equivalent contracts in multiple places simply to use OpenSpec.

**Why:** Teams commonly implement against a shared checkout, billing, platform, or infrastructure specification across repositories. Rewriting it for each implementation adds work and creates competing versions.

**Trade-off:** OpenSpec's current spec lifecycle assumes that changes propose behavior deltas to maintained OpenSpec specs. Supporting *implement-only* work against an externally maintained contract requires a deliberate lifecycle design. We have agreed on the desired behavior, **not its mechanism or release date**.

### D2. Relationships are more general than requirements

**Decision:** Connect work to **any relevant information**, without requiring a classification such as requirement, decision, or design. Let agents interpret what matters. Preserve the connection and its meaning once the developer accepts it.

**Why:** Product, platform, and infrastructure work are shaped by different kinds of information. A paragraph, diagram, benchmark, or issue may matter as much as a formal spec.

**Trade-off:** Free-form meaning is flexible but harder to query mechanically. Inferred connections are suggestions, not agreed facts.

### D3. Start with links and prose

**Decision:** Use existing Markdown links and URLs, accompanied by a short explanation of *why the source matters*. Use a heading, block, or native item link when helpful. Read existing wikilinks, frontmatter, or OKF conventions where available; do not require them. Let agents locate the relevant content.

**Why:** Developers already write this way, and agents can usually work with it. A new ontology or ID scheme would create cost before we've demonstrated the need.

| Alternative | Why we are not making it mandatory now |
| --- | --- |
| **Wikilinks** | Convenient in supporting tools, but not universally portable. |
| **YAML frontmatter / OKF** | Useful for teams already adopting those conventions, but not needed to express an ordinary change-to-source connection. |
| **Stable IDs, selectors, semantic graph/index** | Could support precise lookup and impact analysis, but adds indexing and reconciliation complexity before the failure mode is proven. |

**Accepted limits:** Links can break, passages can move, and agents can interpret them differently. Prose links alone do not provide reliable reverse lookup or complete dependency analysis.

**Revisit when:** Reviewers often cannot recover the relevant passage, agents repeatedly disagree about important links, or users need deterministic impact queries. Introduce the smallest extra structure that solves the observed problem.

### D4. Context can be revisited on demand or observed continuously

**Decision:** Build toward **one review-and-reconciliation capability with two ways to trigger it**:

- **On demand, open-source direction:** A developer asks OpenSpec to revisit context, identify possible differences or inconsistencies, and propose human-reviewed changes.

- **Observer, potential paid direction:** A service watches relevant files, events, sessions, and work, including relationships nobody explicitly linked. It surfaces findings and may prepare updates or PRs for review.

**Why:** Information changes in both directions. Requirements or architecture can change during implementation; engineering and real-world experience can also reveal that shared context needs updating. People need useful action, not a notification for every file edit.

**Trade-off:** A change in a source is not automatically a conflict. Historical comparison is stronger when we can recover the version originally used, for example from Git. How much history to capture for other providers is an implementation choice. Neither mode silently decides which side is correct or rewrites accepted work.

### D5. Verification connects claims to evidence

**Decision:** Help teams answer **“Did we build it right?”** and, increasingly, **“Are we building the right thing?”**. Start by checking the result against *current agreed expectations* with appropriate evidence.

**Why:** Finishing tasks is not proof. Tests, demos, simulations, benchmarks, and reviews can establish different things. Real users and production outcomes ultimately tell us whether the product is valuable.

**Trade-off:** Evidence is partial. A passing test supports the behavior it checks, not every possible claim. The system should show supporting evidence, conflicting evidence, and uncertainty instead of claiming everything is verified.

### D6. Projects bring context and work together

**Decision:** An OpenSpec Project should be a shared workspace for arbitrary context and related work: documents, designs, prototypes, spikes, tests, benchmarks, changes, sessions, and more. A future observer can use a project as an initial context boundary, with wider organizational scope possible later.

**Why:** Shared context and decisions outlive individual changes. A workspace also gives developers and agents a place to understand parallel work.

**Trade-off:** We have **not** chosen Project storage, indexing, observer deployment, or its technical relationship to existing Stores and Worksets. Those designs should follow usage, not dictate the first feature.

## Lifecycle model decision — November 5, 2026

Use **actions and triggers** for lifecycle behavior. Checks are actions that return findings; suggested agent reviews are optional work. A checkpoint names the moment where a caller invokes the system. Keep findings separate from suggestions, and start with a built-in check plus a suggested review rather than a general event engine.

Ordinary links and prose remain the default for connecting context. Optional Git pins serve deterministic drift checks; they are not mandatory for every change or source. The [technical design](../lifecycle/lifecycle-checkpoints.md) owns this model and its unresolved details. The [roadmap](roadmap.md) owns sequencing for both lifecycle behavior and the existing-context workflow.

## The experience to build toward

1. **Use existing context.** An agent reads what is relevant from the tools and repositories the team already uses.

2. **Choose the work.** A developer defines a slice and its boundaries. Different changes can draw on the same shared information.

3. **Plan and implement.** OpenSpec retains the important relationships and decisions as the work progresses. A change can implement an existing contract, modify a contract, or both.

4. **Reconcile change.** Developers can review evolving context and propose changes to plans or upstream information. Later, an observer can surface relevant activity and unrecorded dependencies proactively.

5. **Assess outcomes.** OpenSpec helps test claims against current expectations and preserve evidence; product outcomes remain grounded in real usage.

The same model should work for a solo developer with Markdown and for teams spanning repositories. More powerful automation should build on the same concepts, rather than requiring a different knowledge format.

## Where this meets OpenSpec today

The current default `spec-driven` workflow has a **proposal** (why and scope), **delta specs** (proposed behavior changes), **design** (technical approach), and **tasks** (execution). Sync/archive merges those delta specs into the maintained `openspec/specs/` behavior contract. `skip_specs` covers work with no spec-level behavior changes; it is not an implement-only external-contract feature.

`openspec/config.yaml` already offers shared agent `context` and `references` to registered read-only OpenSpec Stores. Those references are **not** arbitrary, change-specific source links. Change metadata in `.openspec.yaml` likewise has no generic source-link contract today.

Our near-term work should use the existing workflow wherever it fits while making **implementing an already-defined external contract** an explicit, testable case for its evolution. We should not claim that simple source links alone solve contract duplication.

## What we build next

The [Working PRD](./external-context-for-changes.md) explores one coherent increment: **create a scoped change from existing information, retain meaningful links, and revisit the information later**. It should improve the handoff across sessions and teams, not merely add decoration to a proposal.

The context workflow and a small actions/triggers pilot can be validated independently. Broader historical comparison, team packaging, Projects, and the observer follow demonstrated needs. See the [roadmap](roadmap.md) for the proposed sequence; dates and release packaging remain uncommitted.

### The real questions left

The **product direction is settled enough to build against**. The remaining work is release and implementation design:

- **Implement-only workflow:** What does an existing-contract implementation change contain, and how does it validate and archive without artificial behavior deltas? This is the main lifecycle question, not a reopening of D1.

- **History contract:** For a given source, what baseline can we actually recover? Git revisions may suffice for Git content; other systems may need snapshots or weaker guarantees.

- **Reliability of the simple approach:** Can agents consistently preserve and revisit meaningful links across the real workflows and custom schemas? Prototype this before inventing structured machinery.

We should use concrete user cases to determine **what belongs in the first release**, rather than treating these engineering questions as new strategic debates.

---

**Verified existing behavior:** [Concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md) · [Default schema](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml) · [Change metadata](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/change-metadata/schema.ts) · [Project config](https://github.com/Fission-AI/OpenSpec/blob/main/src/core/project-config.ts) · [Stores beta](https://github.com/Fission-AI/OpenSpec/blob/main/docs/stores-beta/user-guide.md).\
**Discovery input:** Enterprise feedback and upstream integration requirements, treated as evidence of user needs rather than a prescribed design.\
**Adjacent convention:** [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md) can coexist with OpenSpec; it represents knowledge, while OpenSpec focuses on the work and evidence connected to that knowledge.
