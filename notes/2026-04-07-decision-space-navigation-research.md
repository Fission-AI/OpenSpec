# Decision Space Navigation — Research Session
**Date:** 2026-04-07

## Context

Exploring whether OpenSpec's linear assembly-line workflow (requirements → design → tasks) can be replaced with a more iterative, non-linear system where users work on any component in any order with continuous feedback.

---

## 1. The Starting Point: Assembly Line vs Iterative

**Current model:** OpenSpec enforces ordering via an ArtifactGraph DAG. Artifacts have hard gates — tasks are blocked until both specs and design are "done."

**Desired model:** User can work on any part in any order. System provides feedback on what's incomplete/inconsistent, but never blocks.

### Patterns explored:
- **Blackboard Architecture** (1970s, Hearsay-II) — multiple specialists read/write shared state, controller suggests what to work on
- **Stigmergy** — agents coordinate by modifying the environment (workspace is the pheromone trail)
- **Tuple Spaces / Linda** — decoupled communication through shared memory
- **ECS (Entity Component System)** — game engine pattern where systems process entities matching their component signature
- **Society of Mind** (Minsky) — intelligence from many simple agents each handling a narrow concern

### Key design:
- **Workspace** — shared state, items with maturity levels (sketch/draft/solid/complete)
- **Concerns** — pluggable perspectives defined as YAML prompt files (security, PM, QA, etc.)
- **The Loop** — classify → capture → dispatch concerns → surface findings

---

## 2. The IDE Analogy — Tested and Found Wanting

### Hypothesis
Background LLM agents act as "language servers" that continuously analyze a shared workspace, like how IDEs surface type errors and lint warnings.

### Agent debate results (4 agents ran in parallel):

**The analogy breaks down on the properties that matter most:**

| IDE Property | Transfers to Specs? | Why |
|---|---|---|
| Formal grammar | NO | Specs are natural language, no AST |
| Objective correctness | PARTIALLY | Some checks are objective (dangling refs), high-value ones are subjective |
| Low false positive rate | NO | LLMs hallucinate. >67% false positive rate = users stop looking (IBM SOC research) |
| Deterministic trust | NO | Same input → different output. Users can't trust it like a type checker |
| Speed (<100ms) | NO | LLM calls are 5-30s. Not ambient, just slow consultation |
| Incrementality | PARTIALLY | Specs are small enough for brute-force re-analysis |
| Actionability | PARTIALLY | "Add return type here" vs "this section may conflict with section 3" |
| Progressive disclosure | YES | Pure UX pattern, transfers cleanly |
| Composability | NO | Multiple LLM concerns will contradict each other |

**Market research confirmed:** No one has shipped a true "IDE for specs" that stuck for general product work. QVscribe works in aerospace/medical (bad requirements kill people). ChatPRD works because it's on-demand, not ambient.

### What survived the critique:
The shift from **review-time to authoring-time** feedback is genuinely valuable. Finding contradictions while writing — not days later in review — is better. The question is delivery mechanism.

---

## 3. Ambient Suggestions — The Graveyard and Survivors

### What died:
- **Clippy (1997-2003)** — interruption without intelligence, high dismissal cost, couldn't learn
- **Cortana proactive suggestions** — 10% usage, generic, required dedicated pane
- **Google Now cards** — ambient card deck abandoned within 4 years
- **Apple Siri Suggestions** — 73% of users say "little to no value"

### What survived:
- **Grammarly** — 40M+ users. Inline underlines, zero cost to ignore, passive/contextual
- **Gmail Smart Compose** — 70% adoption. Ghost text, Tab to accept, zero dismissal cost
- **GitHub Copilot** — 21-30% acceptance rate. Same inline ghost text pattern. BUT sentiment dropping (70% → 60%)
- **Nest thermostat** — Gold standard: invisible when correct. You see outcomes, not suggestions

### The fundamental law:
**The cost of ignoring a suggestion must be lower than the cost of evaluating it, or users disable the system.**

### The pattern:
| Factor | Survives | Dies |
|---|---|---|
| Where | Inline, in workflow | Separate pane, pop-up |
| Ignore cost | Zero | Must actively dismiss |
| Accuracy | High precision | High recall, many false positives |
| Learning | Adapts over time | Same for everyone |
| Agency | User chooses | System interrupts |

---

## 4. The Reframe: Decision Space Navigation

### Key insight
Specs aren't about **construction** (like code). They're about **deciding** — navigating a problem space with many open dimensions. Gaps aren't errors to fix; they're unmade decisions.

The right question isn't "how do we show inline errors" — it's "how do we help someone navigate a large decision space efficiently?"

### The good collaborator model
A good PM doesn't present a list of 12 open questions. They follow your thread and pull you toward the adjacent unexplored area:

> "Solid. What happens when they deny the permission?"

Gaps are the agent's **internal state, not a UI element.** Surface ONE thing at a time, the most relevant to the user's current train of thought.

### Two types of gaps:
- **Decision gaps** — only the user can resolve ("should we support multiple providers?"). Surface as questions.
- **Research gaps** — system can explore autonomously ("what OAuth libraries does the project use?"). Run in background.

### The model: Research team, not IDE
- **Lead agent** (foreground) — follows your thread, asks the next relevant question
- **Research agents** (background) — explore research gaps, report findings
- **Internal state** (never shown raw) — full map of all gaps, dependencies, priorities

---

## 5. UX: Spatial vs Temporal

### The fundamental tension
Chat is temporal (sequential). Decision spaces are spatial (multi-dimensional). Can't represent a map in a line.

### Three models explored:

**Model 1: Workspace file as passive map**
Agent maintains a markdown file open in user's editor. Chat is focused work, file is the map. Works today, zero infrastructure.

**Model 2: Named focus areas**
`/focus auth` — switch between dimensions. Agent gives a briefing on entry ("here's where we are, what changed since last time"). Still a single chat thread.

**Model 3: Parallel conversations**
Each dimension is its own persistent agent conversation. Map view shows the landscape. Cross-impacts propagate automatically. Requires new runtime model.

### Core structure all models share:
```
MAP (spatial, always available, shows whole landscape)
  ├── DIMENSION (focused workspace, deep conversation)
  ├── DIMENSION
  ├── DIMENSION
CROSS-CUTS (propagation layer, how decisions ripple)
```

### What's genuinely new:
**Decision propagation.** When you make a decision in one dimension, the system understands implications for other dimensions, updates their state, and briefs you when you arrive. No existing tool does this well.

---

## 6. Desktop App — Not Worth It

### Agent debate results (4 agents):

**Market evidence on spatial tools:**
| Tool | Approach | Outcome |
|---|---|---|
| Muse (Ink & Switch) | Spatial-first | Dead ($120K ARR peak) |
| Roam Research | Graph-first | Collapsed from $200M hype |
| Scapple, TheBrain, Kinopio | Spatial/graph | Permanent niche |
| Obsidian Canvas | Canvas as feature | "Half-baked," minimal sustained use |
| Miro | Spatial whiteboard | $665M ARR but only for brainstorming |
| Linear | Structured-first | Won |
| Notion | Structured-first | Won |
| Claude Code, Cursor | Text/chat-first | Won |

**Cognitive Fit Theory (Vessey, 1991):** Spatial helps with spatial tasks (seeing relationships). Hurts analytical tasks (prioritizing, sequencing). Planning requires both. Answer: **structured-first with spatial views as a lens.**

**The Muse lesson:** Spatial was great for ideation but users couldn't bridge to execution. Exactly the transition our product needs.

**Engineering cost:** 70% of effort goes to UI, 30% to AI. Inverted from where value lives.

### Recommendation:
1. **Weeks 1-4:** Build the AI. Ship as Claude Code skill. Markdown workspace as map.
2. **Months 2-3:** Add lightweight web viz (ReactFlow). Browser tab alongside terminal.
3. **Months 4-6:** Invest in whatever surface drives retention.
4. **Probably never:** Desktop app. Moat is in AI judgment, not renderer.

---

## 7. Where's the Moat? (The Uncomfortable Truth)

### What the "judgment layer" actually is:

| Component | What it really is |
|---|---|
| Detect cross-impacts | A prompt |
| Rank gaps by importance | A prompt |
| Decide when to speak | A prompt with rules |
| Propagate decisions | A prompt |
| Choose which concern to consult | A few lines of routing code |
| Classify user input | A prompt |

**Day one, it's prompts and files. No moat.** Someone with Claude and a markdown file gets 80% of the value.

### Where real brain could emerge over time:

| Timeline | Component | Moat type |
|---|---|---|
| Day 1 | Prompts + files | None |
| Month 3 | Formal decision graph with deterministic constraint propagation | Structural — code enforces what LLM guesses |
| Month 6 | Learned silence model from usage patterns | Data — when to speak, trained on real sessions |
| Month 12 | Temporal provenance + decision decay | Product — tracking how decisions evolve over weeks |

### The honest framing:
The moat isn't in technology on day one. It's in **product design** — getting the conversation rhythm right. When to ask, how to bridge dimensions, how to surface cross-impacts. Design moats are real (Linear, Figma) but defended by taste and iteration speed, not patents.

---

## Open Questions

1. Is the "good collaborator" conversational model enough, or do users actually need to see the decision map?
2. Does the formal decision graph (month 3 milestone) actually improve over LLM reasoning, or is it unnecessary engineering?
3. How many dimensions does a typical feature planning session actually have? If it's 4-6, markdown is fine. If it's 15, we need something more.
4. Can the "silence problem" (when to speak vs stay quiet) be solved with heuristics, or does it genuinely require learned models?
5. Is this a product or a feature? Could this be a mode within an existing tool (Claude Code, Linear, Notion) rather than standalone?
