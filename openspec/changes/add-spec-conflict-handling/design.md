# Design Decisions

## Approach: Optimistic Concurrency with Natural Resolution

### Core Principles

1. **No Forced Dependencies** - Changes can proceed in parallel
2. **Git-Like Conflict Resolution** - Handle conflicts during implementation, not planning
3. **First Deployed Wins** - Later changes adapt to deployed reality
4. **Minimal Tooling** - Leverage existing git workflows where possible

### Rejected Alternatives

#### Explicit Dependencies
- Would require `depends-on` field in proposals
- Forces sequential development
- Creates bottlenecks and blocks parallel work
- Rejected for being too rigid

#### Full Delta-Based Specs
- Would store only changes, not full future state
- Makes it harder to visualize end result
- Adds complexity to spec reading
- Rejected for reducing clarity

#### Automated Merge Resolution
- Would require complex tooling
- May produce incorrect merged specs
- Rejected in favor of human judgment

### Implementation Strategy

#### Phase 1: Documentation and Guidelines
Start with conventions and best practices before building tools.

#### Phase 2: Detection Tooling
Add simple conflict detection without blocking workflows.

#### Phase 3: Enhanced Tracking (Future)
Consider adding base tracking if needed based on real usage.

### Conflict Resolution Workflow

```
1. Detect: Notice overlapping changes during planning/review
2. Document: Note potential conflicts in proposal.md
3. Proceed: Implement changes optimistically
4. Resolve: Handle merge conflicts naturally during implementation
5. Update: Adjust proposals if implementation differs
6. Deploy: First change updates specs, later changes adapt
```

### Trade-offs

**Pros:**
- Maintains development velocity
- Doesn't block parallel work
- Uses familiar git conflict resolution
- Simple to understand and implement

**Cons:**
- Requires manual conflict detection initially
- May need proposal updates after conflicts
- Potential for surprise conflicts

### Examples

#### Scenario: Two Auth Changes
- Change A: Adds OAuth support
- Change B: Adds 2FA support

Both modify `specs/user-auth/spec.md`. They can proceed in parallel, with natural git merge resolution during implementation.

#### Scenario: Conflicting Logic Changes
- Change A: Password reset timeout 30min → 1hr
- Change B: Password reset timeout 30min → 2hr

Requires human decision during merge. Document resolution in PR.