---
name: draft-openspec-docs
description: Collaborative page-drafting mode for the OpenSpec docs. Builds a scratch plan inside the target page (purpose, structure, numbered draft steps), iterates on it with the user, then drafts one section per approved step and cleans up after itself. Use when a page needs a from-scratch rewrite or a new page is being shaped with the user in the loop.
argument-hint: target page
---

# Draft OpenSpec docs (scratch-plan workflow)

You are shaping a docs page with the user in the loop. The page is planned and reviewed inside the page itself, then drafted one section at a time. Load `write-openspec-docs` (the style authority) and `no-ai-slop` before drafting anything.

## 1. Set up the scratch section

Strip the page to its title and `>` goal line, then add a working section below them:

```md
## Scratch: page plan (delete before publish)

### Purpose

### Structure
```

- **Purpose**: 3-5 dot points. Who the reader is and what they come to look up, what the page covers, what it links out to. Check `docs-lab/README.md` (the page's goal line) and `docs-lab/message-map.md` (the questions routed here) before writing it.
- **Structure**: a numbered list of the page's sections, one line each naming the section and the shape of its content (table, fence, tree, bullets).
- Say what the page will do, never what it won't. Plain words and short bullets; the user reads this in their editor.

## 2. Iterate until the plan is approved

- Plan edits are cheap; page edits aren't. Reshape the plan as many times as the user asks before drafting.
- Record every decision in the plan itself, not only in chat. Add a `### Notes` list for follow-ups that belong to other pages and product observations found along the way.
- The user may edit the file directly between turns; their edits are decisions, not drift to revert.
- Surface one open call at a time, with a recommendation.

## 3. Add the draft plan, then draft step by step

Once the structure holds, add a `### Draft plan` below the notes: one step per page section, each with an ID and a readable title (`**D1. Goal line and intro**`), ending with a consolidation step (cross-page updates) and a cleanup step. Then:

- Wait for the user to call a step ID. Draft exactly that step, into the page above the scratch block.
- Verify each fact against source before writing it; a cheap grep beats trust. Reference content shows the raw contract (templates, instructions, config) verbatim in fences, linked to the file on GitHub, rather than paraphrasing it.
- Keep sibling sections on a repeatable sub-structure so the page scans as one system.
- Mark the step `(done)` in the plan, report what landed, and name the next step.

## 4. Consolidation and cleanup

- **Consolidation**: update everything that points at the page. The README goal line (verbatim match with the page's `>` line), the message map, the sync config (`website/docs.sync.config.mjs`), and any cross-links found by grepping the tree. Run `node website/scripts/sync-docs.mjs` to validate.
- **Cleanup**: delete the scratch block, run the retrievability and glance tests from `write-openspec-docs` at desktop and narrow widths, and flip the page's message-map row to Answered if its prose landed.
