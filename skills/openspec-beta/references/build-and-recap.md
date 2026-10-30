# Onboarding phases 9-11: build, archive, recap

## Phase 9: Apply (Implementation)

**EXPLAIN:**
```
## Implementation

Now we implement each task, checking them off as we go. I'll announce each one and occasionally note how the specs/design informed the approach.
```

**DO:** For each task:

1. Announce: "Working on task N: [description]"
2. Implement the change in the codebase
3. Reference specs/design naturally: "The spec says X, so I'm doing Y"
4. Mark complete in tasks.md: `- [ ]` → `- [x]`
5. Brief status: "✓ Task N complete"

Keep narration light—don't over-explain every line of code.

After all tasks:

```
## Implementation Complete

All tasks done:
- [x] Task 1
- [x] Task 2
- [x] ...

The change is implemented! One more step—let's archive it.
```

---

## Phase 10: Archive

**EXPLAIN:**
```
## Archiving

When a change is complete, we archive it. The archive path is derived from `planningHome.changesDir` and the date.

Archived changes become your project's decision history—you can always find them later to understand why something was built a certain way.
```

**DO:** Archive the change (`--yes` answers the confirmation prompts, which you cannot answer from a tool call):
```bash
openspec archive "<name>" --yes
```

**SHOW:**
```
Archived to: `<planningHome.changesDir>/archive/<target-name>/` (the target name prepends today's date, unless the name already starts with a `YYYY-MM-DD-` prefix — then it is kept as-is, no second date)

The change is now part of your project's history. The code is in your codebase, the decision record is preserved.
```

---

## Phase 11: Recap & Next Steps

```
## Congratulations!

You just completed a full OpenSpec cycle:

1. **Explore** - Thought through the problem
2. **New** - Created a change container
3. **Proposal** - Captured WHY
4. **Specs** - Defined WHAT in detail
5. **Design** - Decided HOW
6. **Tasks** - Broke it into steps
7. **Apply** - Implemented the work
8. **Archive** - Preserved the record

This same rhythm works for any size change—a small fix or a major feature.

---

## Command Reference

**The commands you have installed:**

 | Command          | What it does                               |
 |------------------|--------------------------------------------|
 | `/openspec-beta-propose` | Create a change and generate all artifacts |
 | `/openspec-beta-explore` | Think through problems before/during work  |
 | `/openspec-beta-apply`   | Implement tasks from a change              |
 | `/openspec-beta-archive` | Archive a completed change                 |
 | `/openspec-beta-new`     | Start a new change, one artifact at a time |
 | `/openspec-beta-continue` | Continue working on an existing change    |
 | `/openspec-beta-ff`      | Fast-forward: create all artifacts at once |
 | `/openspec-beta-verify`  | Verify implementation matches artifacts    |

---

## What's Next?

Try `/openspec-beta-propose` on something you actually want to build. You've got the rhythm now!
```
