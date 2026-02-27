# OpenSpec Versioning & Archiving: Quick Guide

> **TL;DR:** When multiple branches modify the same spec, the last archive wins (data loss). **Solution:** Use the OPSX workflow (`/opsx:sync`) for AI-driven intelligent merging. Setup: `openspec artifact-experimental-setup`. [Jump to solution](#the-solution-opsx-workflow)

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


## The Solution: OPSX Workflow

> **Requirements:** Claude Code, experimental workflow (stable and actively used)

The **OPSX workflow** solves the conflict problem with **AI-driven intelligent merging**. Instead of mechanical replacement, Claude reads your delta specs and understands intent.

**Available today.** Setup takes 30 seconds.

### Quick Comparison

```
Standard Archive:              OPSX Sync:
┌──────────────────┐          ┌──────────────────┐
│ Replace entire   │          │ AI-driven merge  │
│ requirement      │          │ Preserves        │
│ block            │          │ unmentioned      │
│                  │          │ scenarios        │
│ Last write wins  │          │ Intelligent      │
│ ⚠️  Data loss    │          │ ✓ Safe           │
└──────────────────┘          └──────────────────┘
```

### How It Works: Your Authentication Example

Let's revisit the SSO/Biometric conflict with OPSX:

```
Week 1:
┌─────────────┐
│  Branch A   │  Delta: "ADDED Requirements: Authentication Methods with SSO"
│  (Feature)  │
└──────┬──────┘
       │ Friday: /opsx:sync feature-a
       ▼
Main Spec: [Password, OAuth, SSO] ✓


┌─────────────┐
│  Branch B   │  Delta: "ADDED Requirements: Authentication Methods with Biometric"
│  (Feature)  │  (Delta created from pre-SSO spec)
└──────┬──────┘
       │ Friday: /opsx:sync feature-b
       │
       │ What Claude does:
       │  1. Reads delta B: "Add Authentication Methods with Biometric"
       │  2. Reads main: "Already has Authentication Methods with SSO"
       │  3. Applies rule: "Preserve existing content not mentioned in delta"
       │  4. Merges: Keep SSO + OAuth, add Biometric
       ▼
Main Spec: [Password, OAuth, SSO, Biometric] ✓✓  ← Both changes preserved!
```

**Key principle:** Claude treats deltas as **instructions** ("add this scenario"), not **replacements** ("make it look exactly like this").

### Your Workflow Options

**Option 1: Friday Batch (Keeps Your Current Rhythm)**

```
Throughout week:
├─ Features complete on branches
└─ Code merges to main

Friday:
┌─────────────────────────────────────────────────┐
│ /opsx:sync feature-a                            │
│   ↓ Main updated with A's changes               │
│                                                  │
│ /opsx:sync feature-b                            │
│   ↓ Claude preserves A's changes, adds B        │
│                                                  │
│ /opsx:sync feature-c                            │
│   ↓ Claude preserves A+B, adds C                │
│                                                  │
│ git diff openspec/specs/  (review all)          │
│                                                  │
│ /opsx:archive feature-a                         │
│ /opsx:archive feature-b                         │
│ /opsx:archive feature-c                         │
└─────────────────────────────────────────────────┘
```

**Option 2: Sync-as-you-go (Even Safer)**

```
Monday:    Feature A merges  →  /opsx:sync feature-a
Wednesday: Feature B merges  →  /opsx:sync feature-b  (auto-merges with A)
Friday:    Just /opsx:archive (specs already synced)
```

### Concrete Example: Three Teams, One Requirement

**Setup:**
- Change A: Adds SSO login
- Change B: Adds Biometric login
- Change C: Updates OAuth token expiry 1h → 2h

**Main spec starts with:**
```markdown
### Requirement: Authentication Methods
#### Scenario: Password login
...
#### Scenario: OAuth login (expires in 1h)
...
```

**Friday batch sync:**

```
/opsx:sync feature-a
├─ Delta A: ADDED "SSO login" scenario
└─ Main spec: [Password, OAuth, SSO]

/opsx:sync feature-b
├─ Delta B: ADDED "Biometric login" scenario
├─ Claude sees: Main already has SSO (not in delta B)
├─ Claude preserves: SSO
└─ Main spec: [Password, OAuth, SSO, Biometric]

/opsx:sync feature-c
├─ Delta C: MODIFIED "OAuth login" scenario (2h expiry)
├─ Claude sees: Main has SSO + Biometric (not in delta C)
├─ Claude preserves: SSO + Biometric
├─ Claude updates: OAuth expiry
└─ Main spec: [Password, OAuth (2h), SSO, Biometric]
```

**Result:** All three changes merged successfully! 🎉

### Getting Started

**1. One-time setup:**
```bash
openspec artifact-experimental-setup
# Creates /opsx:* skills in .claude/skills/
```

**2. Try it this Friday:**
```
# In Claude Code:
/opsx:sync
  → Select a change
  → Claude merges intelligently

git diff openspec/specs/
  → Review what changed

/opsx:archive
  → Move to archive when satisfied
```

**3. For new features:**
```
/opsx:new feature-name    # Start new change
/opsx:ff                  # Create planning artifacts
/opsx:apply               # Implement
/opsx:sync                # Merge specs to main
/opsx:archive             # Archive when done
```

### What Cases Does This Handle?

```
✓ Multiple changes adding different scenarios to same requirement
✓ One change adds, another modifies same requirement
✓ Changes affecting different parts of same requirement
✓ Mix of ADDED/MODIFIED/REMOVED operations
✓ Most real-world parallel development

⚠️ Two changes modifying exact same scenario in conflicting ways
⚠️ One removes what another modifies

Best practice: Always review git diff after each sync
```

### Why This Works

The `/opsx:sync` skill instructs Claude:

> "Preserve scenarios/content not mentioned in the delta. The delta represents *intent*, not a wholesale replacement. Apply changes intelligently - add new scenarios without removing existing ones, update only what's explicitly mentioned."

This is like having a human do the merge instead of a mechanical diff tool.

## If You Can't Use OPSX Yet

If you're not using Claude Code or can't adopt OPSX yet, here are manual workarounds:

### Before Creating Changes

```bash
# Check for conflicts
openspec list
ls openspec/changes/*/specs/your-capability/

# If overlap exists:
→ Coordinate with that team
→ Consider combining changes
→ Or sequence them (one after another)
```

### Archive Order Strategy

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

### Safety Checklist

```bash
□ git diff main -- openspec/specs/your-capability/
□ openspec validate --strict
□ Manual review: did another change land on this spec?
□ If yes: update your delta spec to include their scenarios
```

## Your Action Plan

```
This Week:
├─ Run: openspec artifact-experimental-setup
└─ Try /opsx:sync on one change

Next Sprint:
├─ Adopt /opsx:sync for all Friday archives
└─ Switch to sync-as-you-go if it works well

Ongoing:
└─ Always run git diff after /opsx:sync to review
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ OPENSPEC CONFLICT PREVENTION CHEAT SHEET                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ RECOMMENDED: Use OPSX Workflow                              │
│  ✓ openspec artifact-experimental-setup  (one-time)        │
│  ✓ /opsx:sync after each feature                           │
│  ✓ git diff openspec/specs/  (review)                      │
│  ✓ /opsx:archive when done                                 │
│                                                             │
│ FRIDAY BATCH WORKFLOW:                                      │
│  1. /opsx:sync feature-a                                    │
│  2. /opsx:sync feature-b  (AI merges with A)               │
│  3. /opsx:sync feature-c  (AI merges with A+B)             │
│  4. git diff openspec/specs/  (review all)                 │
│  5. /opsx:archive each                                      │
│                                                             │
│ IF NOT USING OPSX:                                          │
│  □ openspec list  (check overlaps)                         │
│  □ Coordinate with other teams                             │
│  □ Archive non-overlapping first                           │
│  □ Manually merge conflicts in delta specs                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Insight

> **OpenSpec delta specs are instructions, not files.** Standard archiving does mechanical replacement (last write wins). OPSX workflow uses AI to understand intent and merge intelligently (all writes preserved). Use OPSX for parallel development.

## Additional Resources

- **Detailed Technical Analysis:** [openspec-parallel-merge-plan.md](../openspec-parallel-merge-plan.md)
- **OPSX Workflow Guide:** [experimental-workflow.md](./experimental-workflow.md)
- **Join Discussion:** [OpenSpec Discord](https://discord.gg/BYjPaKbqMt)
- **Report Issues:** [GitHub Issues](https://github.com/Fission-AI/openspec/issues)
