# OpenSpec 1.0 Twitter Thread

## OPENERS (pick one)

### 1a
```
OpenSpec 1.0 is out.

The OPSX workflow is now the default.

Thread on what's new 👇
```

### 1b
```
Shipped OpenSpec 1.0 today.

Took what we learned from the experimental workflow and made it the default.

Here's what changed:
```

### 1c
```
OpenSpec 1.0 just dropped.

TL;DR: Skills for 21 coding agents. Better workflow. Breaking changes (but migration is smooth).
```

---

## SKILLS

### 2
```
Skills now generate for all major coding agents — Claude Code, Cursor, Windsurf, and 18 others.

Tools that don't support invocable skills get matching commands instead.

One `openspec init`, works everywhere.
```

---

## WORKFLOW IMPROVEMENTS (mix and match)

### 3a - Explore
```
/opsx:explore

Think through an idea before committing to a change. Good for unclear requirements or when you need to investigate first.
```

### 3b - FF vs Continue
```
/opsx:ff vs /opsx:continue

ff = generate all planning artifacts at once
continue = one at a time

Pick what fits the situation.
```

### 3c - Verify
```
/opsx:verify

Checks your implementation against your specs before you archive. Catches drift between what you planned and what you built.
```

### 3d - Bulk Archive
```
/opsx:bulk-archive

Working on multiple changes in parallel? Archive them all at once. Detects spec conflicts and resolves in order.
```

### 3e - Onboard
```
/opsx:onboard

Guided walkthrough of the full workflow. ~15 min, codebase-aware. Good starting point if you're new.
```

---

## CUSTOMIZATION

### 3f - Project Config
```
New: openspec/config.yaml

Set your default schema. Inject project context (tech stack, conventions). Add per-artifact rules.

AI gets the right context automatically. No more repeating yourself.
```

### 3g - Custom Schemas
```
Teams can define their own artifact workflows.

Built-in: spec-driven, tdd
Custom: drop a schema.yaml in openspec/schemas/ and it just works.

Version control your workflow.
```

### 3h - Dynamic Instructions
```
AI instructions are no longer static.

Now assembled from 3 layers:
• Context (project background)
• Rules (artifact-specific constraints)
• Template (output structure)

Edit any layer. No rebuild needed.
```

### 3i - Schema Overrides (Power Users)
```
Override schemas at user level via XDG directories.

Your customizations persist across projects. Package updates don't overwrite them.
```

---

## BREAKING CHANGES

### 4
```
Breaking: old /openspec:* commands are gone. Config files like CLAUDE.md are replaced by skills.

Migration preserves your active changes and specs. Run `openspec init` or `openspec upgrade`.
```

---

## CLOSER (pick one)

### 5a
```
Release notes: https://github.com/Fission-AI/OpenSpec/releases/tag/v1.0.0

Migration guide: https://github.com/Fission-AI/OpenSpec/blob/main/docs/migration-guide.md

Issues? Open a GitHub issue or find me here.
```

### 5b
```
Upgrade:

openspec init

Full release notes + migration guide in the replies.
```

---

## SUGGESTED COMBINATIONS

**5-tweet thread:**
1a → 2 → 3b → 4 → 5a

**Shorter 3-tweet version:**
1c → 2 → 5a

**Feature-focused (6 tweets):**
1a → 2 → 3a → 3c → 4 → 5a

**Customization-focused (6 tweets):**
1a → 2 → 3f → 3g → 4 → 5a

**Full thread (8 tweets):**
1b → 2 → 3b → 3f → 3g → 3c → 4 → 5a

---

## DISCORD ANNOUNCEMENT

```
**OpenSpec 1.0** is out.

The OPSX workflow is now the default. Skills are now generated for all major coding agents — Claude Code, Cursor, Windsurf, and 18 others. For tools that don't support directly invocable skills, matching commands are provided.

Upgrade with:

openspec init

(or `openspec upgrade`)

**What's better:**

• **Explore first** — `/opsx:explore` lets you think through an idea before creating a change. Good for unclear requirements.

• **Your pace** — `/opsx:ff` creates all planning artifacts at once. `/opsx:continue` creates them one at a time. Pick what fits.

• **Verify before you close** — `/opsx:verify` checks that your implementation actually matches your specs. Catches drift.

• **Bulk archive** — Working on multiple changes? `/opsx:bulk-archive` handles them all, detects spec conflicts, resolves in order.

• **Onboarding** — `/opsx:onboard` walks you through the full workflow. 15 min, codebase-aware.

**What's customizable:**

• **Project config** — `openspec/config.yaml` lets you set default schemas, inject project context, and add per-artifact rules. AI gets the right context automatically.

• **Custom schemas** — Define your own artifact workflows in `openspec/schemas/`. Version control your workflow with your project.

• **Dynamic instructions** — AI instructions are assembled from context + rules + template. Edit any layer, no rebuild needed.

**Breaking:** Old `/openspec:*` commands are gone. Config files like `CLAUDE.md` are replaced by skills. Migration preserves your active changes and specs.

→ Release notes: https://github.com/Fission-AI/OpenSpec/releases/tag/v1.0.0
→ Migration guide: https://github.com/Fission-AI/OpenSpec/blob/main/docs/migration-guide.md

Run into issues? Drop them in #openspec or open a GitHub issue: https://github.com/Fission-AI/OpenSpec/issues
```
