# Overview

> OpenSpec gives you and your coding agent a shared, reviewable plan before code is written.

<!-- Skeleton: headings only.
Narrative beats for the prose pass:
1. Shipping is an alignment problem with two distinct halves: build the RIGHT thing
   (direction) and build the thing RIGHT (execution). Already hard with humans;
   communication overhead grows with every person.
2. Agents amplify it: same problem, much faster and at greater scale. Things go wrong
   faster than you can notice, and every new context session starts from zero.
3. OpenSpec is NOT plan-everything-up-front. It is the shared map: you can update the
   destination and the route mid-journey, and everyone (humans and agents, across
   context sessions) keeps moving in the same direction.
4. Then show the loop, copy-only, and route onward. -->

## Building the right thing, and building it right

## Agents make it go wrong faster

## A shared map, not a plan up front

## The loop in 60 seconds

## Choose your path

## Diagram options under review

<!-- Temporary gallery so the four concepts are reviewable in the browser; cull to the
keepers when prose lands. Editable sources: docs-lab/diagrams/*.excalidraw. To update:
re-render the PNG, run pnpm sync:docs, refresh. -->

**A. Drift:** aligned at the start, small differences compound each session.

![Option A: drift trajectories](/diagrams/option-a-drift.png)

**B. Shared map:** private maps go stale; one shared map reroutes everyone.

![Option B: shared map with reroute](/diagrams/option-b-shared-map.png)

**C. Control loop:** the open loop ships and hopes; the closed loop measures every cycle against the spec.

![Option C: open vs closed control loop](/diagrams/option-c-control-loop.png)

**D. Sessions:** chat context dies between sessions; the plan on disk survives.

![Option D: sessions over a persistent spine](/diagrams/option-d-sessions.png)

**E. Native Mermaid, the loop:** the smallest possible statement of the cycle. Theme-aware, renders from text in this file.

```mermaid
flowchart LR
    p[propose] --> r[review] --> a[apply] --> ar[archive]
    ar -- "specs absorb the change" --> p
```

**F. Native Mermaid, the closed loop (C, redrawn):** same argument as option C, drawn by Mermaid.

```mermaid
flowchart LR
    spec["the spec:<br/>what right looks like"] --> check{aligned?}
    check -- yes --> agent[agent builds]
    agent --> code[code + artifacts]
    code -- "review / verify" --> check
    code -- "archive: the spec absorbs the change" --> spec
```

**G. Native Mermaid, sessions (D, redrawn):** same argument as option D, as a sequence diagram.

```mermaid
sequenceDiagram
    participant S1 as session 1
    participant S2 as session 2
    participant S3 as session 3
    participant M as openspec/ (the map)
    S1->>M: propose: writes the plan
    Note over S1: context lost
    M->>S2: reads the plan
    S2->>M: apply: checks off tasks 1-3
    Note over S2: context lost
    M->>S3: reads the plan
    S3->>M: archive: specs absorb the change
```

**H. Animated SVG (A, animated):** option A redrawn as a hand-authored SVG with CSS keyframes inside the file. The trajectories draw themselves and the loop repeats. No libraries, ships as a plain image, colors picked to read on light and dark.

![Option H: animated drift](/diagrams/option-h-drift-animated.svg)
