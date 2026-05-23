---
name: "OPSP: Rebuild Assess"
description: Assess rebuild impact when driver specs change
category: Workflow
tags: [workflow, opsp, rebuild, assessment]
---

Assess the impact of changed driver specs on existing decisions.

This skill is the key enabler for the "scrap and rebuild" workflow. When driver specs change (because reality changed), this skill identifies which decisions are invalidated and walks the operator through re-evaluation — asking only the questions that matter.

---

## Steps

1. **Identify changed driver specs**

   Read all files in `opensprint/driver-specs/`. The operator should tell you which driver specs changed, or you can diff against a known previous state.

   If the operator says something like "I've changed DS-PRICING from subscription to utility-based", use that as the starting point.

2. **Trace affected decisions**

   Read `opensprint/DECISION-MAP.md` (or all decision records directly) to find:
   - **Directly affected**: Decisions whose `depends-on` includes the changed driver spec
   - **Transitively affected**: Decisions downstream of directly affected decisions

   Sort by depth (root decisions first) so upstream changes inform downstream re-evaluation.

3. **Preserve unaffected decisions**

   Decisions whose entire `depends-on` chain contains NO changed driver specs are **preserved without asking**. Tell the operator how many decisions are unaffected.

4. **Walk through affected decisions (depth-first)**

   For each affected decision, starting from the shallowest:

   a. **Present the context**:
      - Show the original question and decision
      - Explain what changed in the driver spec(s)
      - Show the consideration factors table from the original ADR

   b. **Ask the operator**:
      - "Does your reasoning still hold, or do you want to reconsider?"
      - Present the original options plus any new options that the changed driver spec enables

   c. **Record the outcome**:
      - **Reaffirmed**: Add a `reaffirmed: YYYY-MM-DD` annotation to the existing record. Skip cascading to downstream decisions of this node.
      - **Changed**: Supersede the old decision (set `status: superseded`, `superseded-by: DEC-NNN`). Create a new decision record. Continue cascading to downstream decisions.
      - **New ambiguity**: If the driver spec change introduces a completely new question, create a new decision record (use /opsp:decide flow).

5. **Cascade intelligently**

   - If an upstream decision is **reaffirmed**, skip its downstream decisions (they were valid given the upstream, and the upstream hasn't changed)
   - If an upstream decision is **changed**, re-evaluate its downstream decisions with the new upstream context
   - If a downstream decision's other dependencies also changed, present the combined context

6. **Produce summary**

   After all affected decisions are processed:

   ```
   ## Rebuild Assessment Complete

   Driver specs changed: 1 (DS-PRICING)
   Decisions evaluated: 4
   - Reaffirmed: 1 (DEC-002)
   - Superseded: 2 (DEC-001 → DEC-008, DEC-004 → DEC-009)
   - New: 1 (DEC-010)
   Unaffected: 3

   DECISION-MAP.md has been regenerated.
   ```

7. **Regenerate DECISION-MAP.md**

   After all re-evaluation is complete, regenerate the decision map with the updated tree.

---

## Guardrails

- **Minimize operator questions** — Only ask about decisions that are actually affected by the change
- **Depth-first order** — Always process root decisions before their children
- **Reaffirm skips cascade** — If operator reaffirms, don't re-ask downstream
- **Never auto-decide** — Present options, but the operator makes every call
- **Use path.join()** — Construct all file paths cross-platform
- **Always regenerate map** — DECISION-MAP.md must reflect the final state

