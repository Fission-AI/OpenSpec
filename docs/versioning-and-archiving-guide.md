# OpenSpec Versioning & Archiving: Quick Guide

## The Core Problem

**OpenSpec can silently lose changes when multiple branches modify the same requirement:**

```
Week 1:
┌─────────────┐
│  Branch A   │  Adds: "Support SSO login"
│  (Feature)  │  To requirement: "Authentication Methods"
└──────┬──────┘
       │ Archives Monday ✓
       ▼
Main Spec now has: [Password, OAuth, SSO]


Week 1:
┌─────────────┐
│  Branch B   │  Adds: "Support biometric login"
│  (Feature)  │  To requirement: "Authentication Methods"
└──────┬──────┘  (Started from pre-SSO spec)
       │ Archives Friday
       ▼
Main Spec now has: [Password, OAuth, Biometric]  ← SSO disappeared! 😱
```

**Why?** OpenSpec replaces entire requirement blocks. No Git-like merging. No conflict detection.

## Workflow Risk

```
Multiple feature branches
       │
       ├─── Change X: updates "Auth" requirement
       ├─── Change Y: updates "Auth" requirement
       ├─── Change Z: updates "Logging" requirement
       │
Weekly batch archive (Friday)
       │
       └─── Last archive wins, earlier scenarios may vanish
```

## Recommended Best Practices

### 1. Before Creating Changes

```bash
# Check for conflicts
openspec list
ls openspec/changes/*/specs/your-capability/

# If overlap exists:
→ Coordinate with that team
→ Consider combining changes
→ Or sequence them (one after another)
```

### 2. Archive Order Strategy

```
Friday Archive Session:

Step 1: Group by overlap
  ┌─────────────────────────────────────┐
  │ No Overlap:  [Z, W, V]              │  ← Archive these first
  │ Low Overlap: [A touches auth only]  │  ← Then these
  │ High Overlap:[X, Y both touch auth] │  ← Coordinate these last
  └─────────────────────────────────────┘

Step 2: Archive in order
  Z → W → V → A → (manually check X vs Y) → X → fix Y's delta → Y
                     ↑
                  Key step: update Y's delta spec
                  to include X's changes before
                  archiving Y
```

### 3. Before Each Archive

```bash
# The safety checklist:
□ git diff main -- openspec/specs/your-capability/
□ openspec validate --strict
□ Manual review: did another change land on this spec?
□ If yes: update your delta spec to include their scenarios
```

## CodeRabbit Configuration

**Recommendation: Exclude spec files**

```yaml
# .coderabbit.yaml
reviews:
  path_filters:
    - "!openspec/changes/*/specs/**/*.md"
    - "!openspec/specs/**/*.md"
```

**Why?**
- CodeRabbit doesn't understand OpenSpec delta semantics
- Spec files are AI organization tools, not deliverables
- Focus code review on actual implementation
- Validation is handled by `openspec validate`

## Better Alternative: OPSX Workflow

The experimental workflow has smarter merging:

```
Standard Archive:              OPSX Sync:
┌──────────────────┐          ┌──────────────────┐
│ Replace entire   │          │ AI-driven merge  │
│ requirement      │          │ Preserves        │
│ block           │          │ unmentioned      │
│                  │          │ scenarios        │
│ ⚠️  Data loss    │          │ ✓ Safer          │
└──────────────────┘          └──────────────────┘

Usage in Claude Code:
/opsx:sync     # Before archiving
/opsx:archive  # Checks sync status
```

## The Roadmap

```
Today (Phase 0):
  → Manual coordination + careful ordering
  ✓ Works but requires discipline

Coming Soon (Phase 1):
  → openspec change sync <id>
  → 3-way merge with conflict markers
  → Fingerprint validation blocks bad archives
  ✓ Git-like experience

Future (Phase 2-3):
  → Scenario-level operations (not just requirements)
  → True parallel development
  → No ordering concerns
  ✓ Problem solved completely
```

## Your Action Plan

```
This Week:
├─ Add CodeRabbit exclusions for spec files
├─ Document archive ordering policy for your team
└─ Create pre-archive checklist

Next Sprint:
├─ Try /opsx:sync workflow on one change
└─ Watch for Phase 1 release announcement

Ongoing:
└─ Before Friday archives: run openspec list, coordinate overlaps
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ OPENSPEC CONFLICT PREVENTION CHEAT SHEET                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ BEFORE:                                                     │
│  □ openspec list                   (check overlaps)         │
│  □ Coordinate with other teams                             │
│                                                             │
│ DURING:                                                     │
│  □ Keep changes scoped                                     │
│  □ Monitor what merges to main                             │
│                                                             │
│ FRIDAY:                                                     │
│  □ Archive non-overlapping first                           │
│  □ git diff after each archive                             │
│  □ Manually merge conflicts in delta specs                 │
│                                                             │
│ CODERABBIT:                                                 │
│  □ Exclude openspec/**/*.md files                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Insight

> **OpenSpec specs are not like code files.** They're instructions for how to update specifications during archiving. Multiple "instructions" on the same spec = last one wins. Treat them like database migrations — order matters, conflicts need manual resolution.

## Additional Resources

- **Detailed Technical Analysis:** [openspec-parallel-merge-plan.md](../openspec-parallel-merge-plan.md)
- **OPSX Workflow Guide:** [experimental-workflow.md](./experimental-workflow.md)
- **Join Discussion:** [OpenSpec Discord](https://discord.gg/BYjPaKbqMt)
- **Report Issues:** [GitHub Issues](https://github.com/Fission-AI/openspec/issues)
