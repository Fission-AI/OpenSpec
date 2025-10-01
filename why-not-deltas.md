# Why OpenSpec Uses Full Future States (Not Deltas)

## The Question

When handling concurrent spec modifications, why does OpenSpec store complete future states instead of deltas/diffs like event sourcing systems?

## The Delta Approach (What We Don't Do)

A delta-based system would store changes like:
```diff
+ SHALL support OAuth login
- Timeout: 60 minutes
+ Timeout: 30 minutes
```

## Why We Chose Full Future States

### 1. Clarity of Intent
With full future states, reviewers see exactly what the spec will look like:
- No mental compilation required
- Complete, coherent document to review
- Clear understanding of the end result

### 2. Ambiguity Problems with Deltas

Consider this delta:
```diff
+ Authentication timeout: 30 minutes
```

What does this mean?
- Adding a new field that didn't exist?
- Modifying from a different value?
- Documenting an implicit default?
- Creating an entirely new spec?

Without context, deltas are ambiguous.

### 3. Conflict Detection is Actually Harder with Deltas

**With full states:**
- Git naturally shows conflicts
- Easy to see overlapping changes
- Standard merge resolution tools work

**With deltas:**
- Can't see conflicts without applying them
- Order of application matters (A→B ≠ B→A)
- Need special tooling to detect conflicts

### 4. Review Complexity

**Full state review:**
"Here's exactly what the spec will look like after this change."

**Delta review:**
"Here are the changes. To understand the result, mentally apply them to the current spec (which might have other pending deltas)."

## The Irony

We explored deltas to solve concurrent modification issues, but realized:
1. Deltas make conflict detection harder, not easier
2. Deltas add ambiguity about operations (add vs modify)
3. Deltas reduce readability and increase review complexity
4. Git already handles full-state conflicts well

## Real Event Sourcing Would Require

```yaml
- event: AddAuthenticationMethod
  capability: user-auth
  timestamp: 2024-01-15T10:00:00Z
  data:
    method: oauth
    providers: [google, github]
```

This would need:
- Event schema definitions
- Replay mechanisms
- Conflict resolution rules
- Ordering guarantees
- Compaction strategies

## Our Solution: Boring is Better

1. **Store complete future states** - Maximum clarity
2. **Use git's natural conflict resolution** - Familiar tools
3. **"First deployed wins"** - Simple rule
4. **Document conflicts in proposals** - Human judgment where needed

## Trade-offs We Accept

- **Storage**: Full files take more space than deltas
  - → Git already compresses and stores deltas internally
  
- **Concurrent conflicts**: Multiple changes to same spec need resolution
  - → Same problem exists with deltas, but harder to resolve
  
- **Redundancy**: Future states might duplicate unchanged content
  - → Worth it for clarity and simplicity

## Conclusion

OpenSpec optimizes for:
- **Readability** over storage efficiency
- **Simplicity** over theoretical purity  
- **Clarity** over cleverness
- **Familiar tools** over custom solutions

Sometimes the "boring" approach really is the best. Full future states with git-based conflict resolution gives us 90% of the benefits with 10% of the complexity that a delta-based system would require.