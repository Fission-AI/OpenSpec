# OpenSpec docs: the style guide

Structure, voice, tone, and language for OpenSpec's user docs. This file is the primary style authority for the docs tree. The tree's own README owns structure (the page map and which page teaches what); when this file and that README disagree, the README wins. `no-ai-slop` owns the generic slop patterns; this file owns what OpenSpec's docs specifically look and sound like.

## Six principles

Every rule below applies one of these; when rules collide, the principles decide.

- **A page is a retrieval surface, not an essay.** The reader arrives mid-task with a question, scans for the answer, and leaves. Structure decides whether they find it; prose only decides how it reads. Structure wins.
- **The shortest version that answers is the right length, drafted that way from the start.** Expanding a spare page is cheap; cutting a bloated one is a rewrite. Plain words, and the fewest of them: an idea that fits in one line takes one line.
- **Dumb sentences, smart structure.** Write the obvious sentence: actor, verb, object, stating the literal event ("Running init creates two things in your project"). Never the version that compresses facts in or takes an angle ("Everything init creates is meant to be committed"). If a sentence needs unpacking, it failed.
- **One job per slot.** A sentence carries one fact (one carrying three hides two). A list intro only announces its list. A section owns one reader question or lookup target. Related facts get their own slot, never a ride in someone else's.
- **Ground everything in what the reader can verify.** Name things by path, file, or real output: what the reader could match against `ls`. The concept is the gloss, never the name.
- **No house template.** Shape follows content: inventories get overview-then-expand, sequences get numbered steps, a single idea gets short paragraphs, and reasoning lives in prose. The universal check is the retrievability test, not bullet count.

## The retrievability test

Name the questions or exact product terms a reader would bring to the section ("does init touch `.gitignore`?", "how do I add a tool later?", `generates`). Each answer or term must be findable by scanning, heading to anchor to fact, without reading paragraphs. If finding a fact means reading sentences, restructure; prose that passes needs no bullets, and no amount of bullets saves a section that fails.

## The shortest draft

Brevity happens at drafting time, not review. A page that needs heavy cutting in review gets rewritten, and a rewrite costs more than writing it spare the first time. Start from the shortest version that answers and expand only where a real reader question goes unanswered.

Every slot is earned before it's written:

- **The unit**: it answers a reader question or documents a lookup target, or it doesn't go in. Tight prose on the wrong scope is still the wrong scope.
- **The sentence**: would any reader come back for it? If not, it spends attention without buying anything; don't write it.
- **The depth**: an edge case or rationale most readers skip goes behind a link to its canonical page, not inline. The docs keep the depth; this page doesn't charge every reader for it.
- **The payload**: the command, the real output, the failure and its fix stay whole. Spare means no wind-up and no commentary, never fewer facts.

The glance test is the backstop, not the method. Scroll the rendered page and read it as shapes: short units, air between anchors, no screen-filling block of anything. A page that looks like work loses its reader before the first sentence; if yours does, something above got in without earning its slot. For table or layout changes, check both desktop and narrow widths; the Markdown source can't show cramped columns, poor wrapping, or horizontal scrolling.

## Shape of a section

- **Answer first**: open with the command, the inventory, or the fact in one line. Context and rationale come after, never first.
- **Inventory, then expand**: when a section covers several things (what init installs, what an uninstall leaves behind), open with a list naming every item in one line each, then expand each in its own unit after the list (a subsection or bold lead-in).
- **The overview only names**: a count ("two things:") is not an inventory, and expansion never happens inline in the list; the reader sees the whole footprint, then the detail.
- **Place first, meaning second**: name each on-disk item by its path or folder ("an `openspec/` folder at the repo root"), never by concept alone ("the planning folder"). The concept gloss can wait for the item's expansion. When a location varies (per tool, per OS), anchor it with a real folder or two ("`.agents/`, `.claude/`") and link the full list.
- **Core before nuance**: inside every unit, the answer, then what to expect, then edge cases last. A reader who stops early still leaves with the core.
- **One unit per target**: task pages separate different reader questions. Reference pages separate different product elements when readers look them up independently. Two facts with different targets get separate units, even when one elegant sentence could join them.

## Scan anchors

Every load-bearing fact sits on an anchor: something the eye lands on without reading. A fact a reader might come back for never lives only in the middle of a paragraph. The anchors these docs use:

- Code fences, for commands and real output.
- Numbered steps with bold lead-ins (`**1. Remove the package.**`) for multi-step tasks.
- `**Term**: fact` bullets for options, properties, and locations.
- Tables, when several items share the same attributes (mostly reference pages).
- File trees with inline annotations for layouts.

A full screen of content with no anchor is a wall, even when every sentence in it is true.

## Choosing the shape

No house template: facts go on anchors (enumerable content defaults to a list or table); explanation, reasoning, and judgment go in prose. The content picks the form:

- **Sequences**: numbered steps, one bounded action each. Numbers mean order of execution; an inventory of things takes bullets, never numbers. Restate any value a step needs rather than pointing back three steps.
- **Options, properties, locations**: `**Term**: fact` bullets.
- **Items sharing the same attributes**: a table.
- **A single idea** (why a store is worth it, what sync treats as drift): a couple of short paragraphs; that is the right shape.
- **Connected reasoning**: a paragraph. Shredding a thought into fragments makes it harder to read, not easier; a bullet list of full explanatory sentences is a paragraph in costume, so write the paragraph.

Across every form:

- Cap lists at about five items. Longer than that, split by priority: common path first, edge cases into their own list or a linked page.
- Keep items parallel: same internal order (name, fact, catch, link), same grammatical shape. Repetition across items is what makes scanning work; never vary structure between items for the sake of the prose.
- Uniformity is right when the content is uniform (a reference table, an install matrix). When every section on a varied page resolves to the same pattern, some of those lists are disguised paragraphs.

## Prose budget

Paragraphs are glue between anchors, not containers for facts.

- One to three lines. Three is the ceiling; a glue line between two anchors is often enough.
- The list intro has exactly one job: say what the list is ("Running init creates two things in your project:"). Never spend that slot on a different fact, however related; it gets its own line after the list.
- Parentheses and semicolon riders are for true asides only (a version caveat, a pointer). If a reader might return for the fact, it gets its own anchor.
- A section that is mostly paragraphs is misshaped, unless the page is genuinely conceptual (Concepts, explanations of the model). Even there, front-load each paragraph and leave air between them.

## Sentences

- Short sentences, active voice. Default subject is "you" or the tool by name.
- No preamble. The first sentence of any unit states the thing itself, never wind-up ("Before we get into...", "It's worth understanding that...").
- No em dashes anywhere in these docs. Use a colon, a comma, parentheses, or two sentences.
- Write the sentence you would say out loud. A draft that splices clauses with semicolons or colon-stacked fragments ("different documents: fewer of them, different names, different structure") gets rewritten as the spoken version ("when you want these to be different documents, whether that means fewer of them, different names, or a different structure"). Colons still introduce lists, fences, and labels; they don't splice prose.
- Contractions are fine ("you're set", "doesn't come along"). These docs talk, they don't proclaim.
- Inside narrative paragraphs, vary sentence length so the prose doesn't read staccato. Paragraphs only; list items stay parallel even when the cadence repeats.

## Voice

The narrator is a colleague who has run every command on the page, hit the failure modes personally, and is telling you what they know. Not a marketer, not a tutorial host, not a manual.

- Calm and specific. The reader wants the fact, the command, and the catch, in that order.
- Confidence comes from precision, not emphasis. Never "very", "extremely", "critical", bold-for-importance, or exclamation marks.
- Plain judgment is welcome. The docs may tell the reader what to do and what to skip: "The `openspec/` folder: pause first."
- Address the reader as "you". OpenSpec, the CLI, and init do things. "We" appears only for project decisions ("we say skills"), never as a tour guide.
- Dry beats chirpy. No cheerleading, no apologizing, no drama around failures. A failure is a fact with a fix.

## Structure and tone by page type

Same voice everywhere; structure and temperature shift:

- **Start pages**: numbered steps and short units, nothing assumed, every step ends in something visible. Warmest the docs get, which is still plain.
- **Guides**: peer to peer, skip re-orientation. The judgment calls are the reason guides exist; put them on anchors so they scan.
- **Reference**: mirror the product, use its exact names as anchors, and cover the contract without compressing it. Tables and fragments are common, but scan speed decides the shape. No motivation or persuasion; the reader is here to look something up and leave.
- **Troubleshooting**: symptom, cause, fix, in that order, one unit per symptom. Name the error the reader sees. Never "you may notice" or "sometimes it can happen that".

Guides and Customize pages share one skeleton: a one-line what, a link to the Quickstart (never a recap), the 80% path, then Advanced. The exception is the concepts page, which is an explanation, not a task guide; its shape follows its concerns.

## Reference pages

Reference describes the product for a reader who is already working with it. The outline follows the machinery: file, block, field; command group, command, option; object, property, value. Use the product's exact names as headings when readers will search for those names. Reader-question headings belong to task pages unless the question itself is the established lookup term.

Cover the full contract without packing several facts into one sentence, cell, or paragraph.

### Draft the contract first

Before writing prose:

1. Inventory the product elements from source.
2. Arrange them in the same hierarchy as the product.
3. Write the smallest complete contract for each element.
4. Expand only the elements whose behavior needs more room.
5. Add examples that illustrate one rule at a time.
6. Audit defaults, constraints, failures, ignored input, and validation gaps.

For each field, option, command, or file, record the identity facts that apply:

- Exact name and syntax
- Type or accepted values
- Required state and default
- Scope, location, or base path

Then record the behavior facts that apply:

- Behavior and side effects
- Constraints
- Failure and ignored-input behavior
- What validation catches and misses

Don't create empty sections or table columns for facts that don't apply.

### Inventory, then expand

Open with a complete table or list. Expand an item below the inventory only when its behavior can't fit cleanly in the overview. Put the expansion under the item's exact name so the table of contents works as an index.

For field and option references, `Field | Contract` is the safe table shape when definitions need sentences. Add more columns only when every cell is short and comparable. If columns split one coherent definition into fragments or wrap badly at a narrow width, use fewer columns or move the detail below the inventory.

### Examples and edge cases

An example illustrates one mapping, rule, or result. It doesn't become a sequence the reader follows or a narrative about completing a task. A complete example may follow the contract when seeing the elements together helps lookup.

Put the concrete default path or value in the primary slot. Put environment variables and uncommon overrides afterward.

State the observable consequence of a limit. If OpenSpec ignores a misspelled field, say that validation passes and the field has no effect. If a value falls back, name the value OpenSpec uses.

## Two surfaces

OpenSpec spans the terminal and the AI chat, and readers mix them up. Label every snippet:

```
In your terminal:
  openspec init

In your AI chat:
  /opsx:propose add-rate-limit
```

Where the reader could doubt it worked (a fresh install, a first run, a command with no output of its own), end with the concrete success signal: the line the command prints, the file that now exists, what the agent says next. Where the outcome is obvious, stop; an unneeded success line is noise.

## Authoring mechanics

Pages are plain markdown; GitHub and the site both render them. JSX components (`<Callout>`, `<Tabs>`, `<details>`) don't render; never use them.

- **Install commands**: write the global npm command once, in a fence whose language is `npm`; the site renders it as npm/pnpm/yarn/bun tabs with a copy button per tab (`remarkNpm` in `website/source.config.ts`, which also persists the reader's choice across blocks). On GitHub the fence degrades to the plain npm command.
- **Callouts**: GitHub-style blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`); GitHub styles them natively and the site renders them as callouts (`remarkGfmAlert` in `website/lib/remark-gfm-alert.ts`). Never place one directly under the page title: the sync lifts the leading blockquote into the page description.

## What earns a developer's trust

- Show the real command and its real output, trimmed honestly. A retouched output is a lie the reader catches on their first run.
- No hype and no comfort adjectives: easy, simple, just, powerful, seamless, robust. Three lines that show the thing beat any adjective about it.
- State limits plainly. A named limitation builds more trust than praise: "Your assistant does need to be able to run shell commands; a few IDE integrations can't."
- Don't generalize. Where you're tempted to write what OpenSpec "helps" with, write what actually happens: which file appears, what the diff shows, what the agent does next.
- Don't define what you can show. An unfamiliar term whose instances explain themselves (the workflow list: propose, explore, apply...) is introduced by showing the instances with one-phrase glosses; the abstraction can wait.
- Exact names: flags, paths, config keys, and versions as they exist in source, linked to their canonical page on first use.

## Naming and terms

- One term per concept, the glossary's term if the tree has one; today that means "skills", never "slash commands".
- No invented taxonomy. Product terms (spec, change, delta, profile, store) name real things; use them freely. Any other organizing word in a heading or goal ("layers", "levers", "pillars") must pass one test: would a reader use it to ask their own question? If not, write the reader's question or the plain enumeration ("What you can customize", never "The three layers").
- Examples invoke workflows by skill: the ask that triggers it ("ask your agent to propose a change") or the skill's name (`openspec-propose`), which is the same in every tool. A command spelling (`/opsx:propose`) appears only as a labeled per-tool example, never as the generic instruction; commands are headed for deprecation and their spellings vary per tool.
- Prefer the shared `.agents/` folder in file-path examples; a tool-specific folder (`.claude/`) appears only when the example is about that tool.
- Headings lead with a verb when the section is something the reader does ("Initialize your project"). Found content takes a plain noun phrase ("Install methods"). Never a vague verb ("Understand it") and never a pun.
- If the page carries a one-line job statement under the title (docs-lab uses a `>` blockquote the site lifts into the page description), keep it plain, concrete, and true of the finished page.

## One canonical home

A fact lives on exactly one page; everywhere else links to it. A second copy is a future contradiction. The tree's README says which page owns what; when in doubt, link.

## Exemplars

When unsure how something should scan or sound, match these:

- `docs-lab/start/setup.md`: section shape, inventory-then-expand, enumerable facts on bullets.
- `docs-lab/start/installation.md`, the Uninstalling section: multi-step tasks with bold numbered lead-ins.
