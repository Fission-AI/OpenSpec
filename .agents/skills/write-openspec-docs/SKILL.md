---
name: write-openspec-docs
description: Switches into OpenSpec docs-writing mode; loads the house style guide and drafts or revises pages in its voice (action-first, no preamble, scannable). Use when writing or editing pages in the OpenSpec docs tree.
argument-hint: page or section
---

# Write OpenSpec docs

You are now writing OpenSpec's user docs. Read [writing.md](writing.md); it is the style authority for everything drafted here. The short version, in effect immediately:

- A page is a retrieval surface, not an essay. Structure decides whether the reader finds the answer; prose only decides how it reads. Open every section with the answer, never a running story.
- Choose the page type before the outline. Guides follow the reader's task; reference mirrors the product's structure and uses exact field, command, and file names as scan anchors. Reference needs complete coverage without compressing several facts into one sentence, cell, or paragraph.
- Draft the shortest version that answers; expanding a spare page is cheap, cutting a bloated one is a rewrite. Plain words, the fewest of them: an idea that fits in one line takes one line. Depth most readers skip goes behind a link, and the payload (commands, real output, failures and fixes) stays whole.
- Dumb sentences, smart structure. Write the obvious sentence (actor, verb, object, stating the literal event); never compress extra facts in or take an angle. No hype adjectives, no preamble, no em dashes.
- One job per slot: one fact per sentence, list intros only announce the list, one reader question or lookup target per section. A related fact gets its own slot, never a ride in someone else's.
- Ground items in what the reader can verify: path or folder first, concept as the gloss, real output shown honestly.
- No house template. Inventories open with a list naming every item, then expand each in its own unit after the list, never inline. Sequences take numbered steps (numbers mean order; inventories take bullets). Single ideas and reasoning stay in short prose.
- Every load-bearing fact sits on a scan anchor: code fence, numbered bold lead-in, `**Term**: fact` bullet, table, file tree. Never only mid-paragraph.
- Before finishing, run two backstop tests. Retrievability: can each question or exact product name be found by scanning alone? The glance: inspect the rendered page as shapes; does it look finishable, or like work? Check table-heavy changes at desktop and narrow widths. A failure means a slot got written without being earned; fix it now, don't leave it for review.

## Ground rules

- Load the `no-ai-slop` skill before drafting; it owns the generic slop patterns, while [writing.md](writing.md) owns what OpenSpec's docs specifically look and sound like.
- Read the target page in full before editing it.
- Real facts only: flags, paths, and output as they exist in source. If a claim can't be checked cheaply, still write it, but name it as unchecked when you show the work; never bridge a gap with a plausible-sounding sentence.
- A fact lives on one page; everywhere else links to it. The docs tree's README owns the page map and structural invariants; check it before restructuring or adding pages.
- For reference pages, inventory the contract from source before drafting prose. Follow the reference process in [writing.md](writing.md#reference-pages).
- When unsure how something should scan or sound, match the exemplars: `docs-lab/start/setup.md` for section shape and inventories, `docs-lab/start/installation.md` (Uninstalling) for multi-step tasks.

## When done

Show the user what changed and name any unchecked claims.

If the user asks for the deep, evidence-first drafting session (run every command, one section per sitting, formal checkpoints), follow [full-process.md](full-process.md).
