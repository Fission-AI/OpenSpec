# Explore Workflow UX

## Context

The explore workflow is part of the core loop (`propose`, `explore`, `apply`, `archive`). Users should be able to think through ideas in explore mode, then smoothly transition into a formal change proposal.

Currently, explore references `/opsx:new` and `/opsx:ff` which are being replaced with `/opsx:propose`. But beyond just updating references, there are deeper UX questions about how explore should work.

## Open Questions

### Exploration Artifacts

1. **Should exploration be exportable to .md?**
   - Currently explorations are ephemeral (just conversation)
   - Would users benefit from saving exploration notes?

2. **Where should exploration files live?**
   - `openspec/explorations/<name>.md`?
   - `openspec/changes/<change>/explorations/`?
   - Somewhere else?

3. **What should the format be?**
   - Free-form markdown?
   - Structured template (problem, insights, open questions)?
   - Conversation transcript?

### Multiple Explorations

4. **Can a user have multiple explorations related to a change?**
   - e.g., exploring auth approaches separately from UI approaches
   - How would these relate to each other?

5. **How do explorations relate to changes?**
   - Before change exists: standalone exploration
   - After change exists: exploration linked to change?

### Lifecycle & Transitions

6. **What happens before a change proposal exists?**
   - Exploration is standalone
   - When ready, user runs `/opsx:propose`
   - Should exploration context automatically seed the proposal?

7. **What happens after a change proposal exists?**
   - Exploration can reference existing artifacts
   - Should exploration be able to update artifacts directly?
   - Or just inform the user what to update?

8. **How does explore → propose transition work?**
   - Manual: user copies insights and runs propose separately
   - Semi-auto: explore offers "Create proposal from this exploration?"
   - Auto: explore detects crystallization and proactively starts propose

### Context Handoff

9. **How do exploration insights flow into proposals?**
   - User manually incorporates insights
   - Exploration summary becomes input to propose prompt
   - Exploration file linked/referenced in proposal

10. **Should propose be able to read exploration files?**
    - "I see you explored authentication approaches. Using those insights..."

## Potential Approaches

### Approach A: Ephemeral Explorations (Status Quo+)
- Explorations remain conversational only
- Just update references to `/opsx:propose`
- User manually carries insights forward
- **Pro:** Simple, no new artifacts
- **Con:** Insights can be lost, no audit trail

### Approach B: Optional Export
- Add "save exploration" option at end
- Saves to `openspec/explorations/<name>.md`
- Propose can optionally read these for context
- **Pro:** Opt-in complexity, preserves insights
- **Con:** Another artifact type to manage

### Approach C: Exploration as Proposal Seed
- Exploration automatically saves structured notes
- When transitioning to propose, notes become proposal input
- **Pro:** Seamless handoff, context preserved
- **Con:** More complexity, tight coupling

### Approach D: Explorations Within Changes
- Before change: standalone exploration
- After change created: exploration notes live in `changes/<name>/explorations/`
- Artifacts can reference exploration notes
- **Pro:** Clear relationship to changes
- **Con:** Where do pre-change explorations go?

## Next Steps

- [ ] User research: How do people actually use explore today?
- [ ] Prototype: Try saving explorations and see if propose benefits
- [ ] Decide: Pick an approach based on findings
- [ ] Implement: Update explore workflow accordingly

## Related

- `openspec/changes/simplify-skill-installation/` - current change updating core workflows
- `src/core/templates/workflows/explore.ts` - explore workflow template
