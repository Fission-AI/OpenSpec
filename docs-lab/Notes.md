Ok these are my notes when reviewing the different sections/file in docs-lab.
I've written down my thoughts when looking at these sections so we can think about how to update these
docs with the feedback in mind.


## Start > Overview

Ok the following subtitle here is horrible:

> OpenSpec gives you and your coding agent a shared, reviewable plan before code is written.

This is not a strong value prop in the day and age of plan mode, but other than that i don't think it sells openspec hard enough

OpenSpec is not really about a shared plan for a single session it's about a keeping things on track and aligned for larger features.

what we focus on:
- making it work for teams
- git native / things checked into vcs
- intented behaviour matches the implemented behaviour
- we help you capture intendede behaviour and match it to the implemented behaviour.
- it's about correctness, coherence,

Control theory inspiration:

Instructors break down how a system measures its current state, compares it to a desired goal, and adjusts its actions to reduce the difference. 



## Guides > Explore and idea

I think in this section we should mention:

This is about exploring the problem space, figuring out what problems you care about and diving deeper into them.

It was designed with a very different philiosphy in mind of giving you the freedom to explore the problem space and jump around to different ideas and sections.

It serves a similar purpose to other newer entrees in the fields like superpowers or matt pocock's skills.

We often do see people combining explore with 

Often this is a matter of UX and personal preference. There is no single best skill or method to getting to
aligment with your agent.

Some people prefer a conversing with a thoughtful design partner, others might prefer being asked questions till they have a good understanding of a problem.

Feel free to customize the explore skills to your needs.

Unrelated to docs:

How do we solve the problem for PM's?
How do we give them a good home? - what is their job to be done?
How we efficiently help them achieve that?

- they're basically turning it into tickets?


What do we want to get across the line this week?

- The spec drift agent?
- The dashboard?

- figure out how we use agent session and traces better


## From docs-lab drafting (2026-08-19, project-config page)

Product issue, not docs: the installed skills in this repo are stale against the current
templates. `.claude/skills/openspec-archive-change/SKILL.md` has no `openspec instructions`
call at all, while `src/core/templates/workflows/archive-change.ts:40` instructs one; the
installed apply skill also doesn't mention the `context`/`operationGuidance` fields in the
JSON it reads. So config injection reaches the CLI output, but a stale skill never tells
the agent to consume it. Running `openspec update` should refresh them.


## From docs-lab drafting (2026-08-19, schemas page)

Product issues found while verifying the schema system (all file refs current as of today):

- `schema init` next-steps output prints a command that doesn't exist in that form:
  "Use with: openspec new --schema <name>" (schema.ts:999); real syntax is
  `openspec new change <name> --schema <name>`.
- `openspec new change` spinner prints the hardcoded default schema, not the resolved one
  (new-change.ts:118): "Creating change 'x' with schema 'spec-driven'..." then "Schema: lite".
- `schema fork` re-serializes schema.yaml (literal `instruction: |` becomes folded `>`,
  comments dropped), so diffing a fork against upstream is noisy (schema.ts:706-712).
- All `openspec schema` subcommands plus `openspec schemas`/`templates` use process.cwd()
  and take no --store; they silently see nothing when run from a subdirectory, unlike
  root-resolved commands (schema.ts:383/485/634/768).
- `suggestSchemas` fuzzy "did you mean" helper exists but is wired to nothing
  (project-config.ts:420).

Docs follow-up: the community schema catalog lives only in legacy docs/customization.md
(#community-schemas); customize/schemas.md links to it on GitHub. When the old docs tree
retires, the catalog needs a docs-lab home.
