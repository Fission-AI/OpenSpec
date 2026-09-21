# Message map: the questions the docs must answer, and where

The [README](README.md) index runs page to job. This file runs the other way: one flat
list of the questions we need the docs to answer, each pointing at the group and page
that owns the answer. Status says whether that answer exists yet: **Answered** (the
owning page's prose has landed), **Skeleton** (owner assigned, page is headings only),
**Gap** (no owner), **Off-site** (answered outside these docs by decision). Flip a row
to Answered when its page's prose lands. Rows follow the sidebar order of the owning
page; gaps sit where their proposed home would fall, and off-site rows go last. Keep
rows coarse (question to page, never sentence to section) so this stays cheap to
maintain.

| Question | Answered by | Status |
|---|---|---|
| How do we pitch the core idea (keeping larger features on track and aligned, not just a plan before code)? | [Start › Overview](start/overview.md) (emptied 2026-08-21 for a from-scratch rewrite and pulled from the site until then; brief in Notes.md) | Skeleton |
| How does someone decide OpenSpec is worth their time? | [Start › Overview](start/overview.md) (emptied 2026-08-21, see row above) | Skeleton |
| How should a user install the CLI, update it, uninstall it? | [Start › Installation](start/installation.md) | Answered |
| How can a user hand install and setup to their AI assistant? | [Start › Installation](start/installation.md), the install.md prompt | Answered |
| How should a user add OpenSpec to their repo? | [Start › Set up your project](start/setup.md) | Answered |
| How do the workflows get into a user's tool, and why skills and commands both? | [Start › Set up your project](start/setup.md) | Answered |
| How do we teach the loop: propose, review, apply, archive? | [Start › Quickstart](start/quickstart.md) | Answered |
| How should a user run their first change end to end? | [Start › Quickstart](start/quickstart.md) | Answered |
| How does a user know which prompts go in the AI chat and which commands in the terminal? | [Start › Quickstart](start/quickstart.md) inline with each step, then [Help › FAQ](help/faq.md) | Answered |
| How do we explain what specs and changes are? | [Guides › Understanding › Concepts](guides/concepts.md) | Skeleton |
| How should a user think through an idea before proposing? | [Guides › Using › Explore an idea](guides/explore.md) | Skeleton |
| How should a user review a plan? | [Guides › Using › Review the plan](guides/review-the-plan.md) | Skeleton |
| How does a user check the implementation matches the plan before archiving? | [Guides › Using › Review the plan](guides/review-the-plan.md), the verify pass | Skeleton |
| How should a user run a plan across sessions and context limits? | [Guides › Using › Apply a change](guides/apply.md) | Skeleton |
| How should a user pace the plan: draft everything at once, or artifact by artifact? | [Guides › Using › Apply a change](guides/apply.md), continue and fast-forward | Skeleton |
| How do we explain the standard flow (propose drafts every artifact in one step) vs the iterative flow (new creates the change, continue drafts the next artifact, fast-forward catches up)? | [Start › Quickstart](start/quickstart.md) teaches only the standard flow; [Guides › Using › Apply a change](guides/apply.md) owns pacing once a change exists; [Reference › Skills](reference/skills.md) holds the new/continue/ff contracts; [Customize › Profiles](customize/profiles.md) covers installing them; a [README](README.md) TODO proposes a Using guide | Gap |
| How should a user change direction mid-change, or bail out? | [Guides › Using › Change course](guides/change-course.md) | Skeleton |
| How should a team run OpenSpec together? | [Guides › Adopting › Teams](guides/teams.md) | Skeleton |
| How should a user work on several changes at once? | [Guides › Adopting › Teams](guides/teams.md) owns the touching-one-spec collision case; the general answer (solo included, not just teams) has no owner yet | Gap |
| How should a user handle git across the loop: branching, commits, PRs? | Only archive-vs-PR ordering is owned, by [Guides › Adopting › Teams](guides/teams.md); README TODO proposes a guide | Gap |
| What does a good change look like? | `guides/examples.md` is parked until real archived changes can fill it (README TODO); no published owner | Gap |
| How should a user adopt OpenSpec on code that already exists? | [Guides › Adopting › Existing codebases](guides/existing-codebases.md) | Skeleton |
| How should a user run OpenSpec in a monorepo? | Legacy `docs/existing-projects.md` owned it (one `openspec/` at the repo root, domains map to packages); likely home is [Guides › Adopting › Existing codebases](guides/existing-codebases.md), with [Multi-repo › Stores](multi-repo/stores.md) taking packages treated as separate repos | Gap |
| How do we explain what's customizable in OpenSpec? | [Customize › Overview](customize/overview.md) | Answered |
| How does a user pick the right customization level, and when should they escalate from config to schemas? | [Customize › Overview](customize/overview.md), the "Not sure which to use?" section | Answered |
| How should a user choose which workflows are installed? | [Customize › Profiles](customize/profiles.md) | Answered |
| How does a user switch to skills only or commands only? | [Customize › Profiles](customize/profiles.md), Delivery section; [Start › Set up your project](start/setup.md) owns why both forms exist | Answered |
| How does a user make the workflows plan changes their way: context, rules, and guidance? | [Customize › Project configuration](customize/project-config.md) | Answered |
| How does a user get artifacts written in a language other than English? | [Customize › Project configuration](customize/project-config.md), the context section's "Another language" note | Answered |
| How should a user change what OpenSpec produces? | [Customize › Schemas](customize/schemas.md), with the fork walkthrough in "Creating your own custom schema" | Answered |
| How should a user edit the installed skill prompts? | No owner: `customize/skills.md` is parked (README TODO) until there's a good answer to `openspec update` overwriting edits | Gap |
| How should a user run OpenSpec across multiple repos? | [Multi-repo › Stores](multi-repo/stores.md); [Start › Set up your project](start/setup.md) routes there from "Pick where OpenSpec lives" | Answered |
| How should a user plan a change that spans repos? | [Multi-repo › Stores](multi-repo/stores.md) | Answered |
| What does each skill do, and when should a user reach for it? | [Reference › Skills](reference/skills.md) | Answered |
| Where does a user look up a terminal command? | [Reference › CLI](reference/cli.md) | Answered |
| How does a user learn what telemetry is collected, and opt out? | [Reference › Configuration › Environment variables](reference/configuration/environment-variables.md) owns the facts (was a README-TODO gap); [Help › FAQ](help/faq.md) routes searchers there | Skeleton |
| Where does a user look up an artifact's format, or a schema definition's fields? | [Reference › Schemas](reference/schemas/index.md) | Answered |
| Where does a user look up a setting or a file that changes OpenSpec's behavior? | [Reference › Configuration](reference/configuration/index.md) | Answered |
| Which openspec/ tree does a command operate on? | [Reference › Configuration › Stores](reference/configuration/stores.md) owns the whole resolution ladder, including the everyday case (nearest openspec/ wins); readers reach it from the Stores row of the [Configuration overview](reference/configuration/index.md) map | Skeleton |
| How should a user run a change with no spec impact, or retire a capability outright? | [Reference › Configuration › Change metadata](reference/configuration/change-metadata.md) owns the `skip_specs` and `retire_capabilities` contracts; [Reference › Schemas › spec-driven](reference/schemas/spec-driven/index.md), Delta specs section, owns their effect on deltas and archive; neither half has a guide owner | Gap |
| What is an initiative, and how does a change join one? | No owner: the `initiative` field's contract sits on [Reference › Configuration › Change metadata](reference/configuration/change-metadata.md), but no page teaches initiatives (multi-repo has only Stores) | Gap |
| What is a workset, and how does a user open one in their editor? | [Multi-repo › Worksets](multi-repo/worksets.md); the `openers` field's contract stays on [Reference › Configuration › CLI settings](reference/configuration/config-json.md) | Answered |
| Which AI tools work, and what's each one's syntax? | [Reference › Supported tools](reference/supported-tools.md) | Answered |
| My tool isn't listed, can I still use OpenSpec? | [Help › FAQ](help/faq.md) routes: the shared `.agents` target or an issue; [Reference › Supported tools](reference/supported-tools.md), Per-tool notes, holds the shared target's contract | Answered |
| Where does a user look up a term? | [Reference › Glossary](reference/glossary.md) | Answered |
| How is OPSX built? | [Reference › Architecture](reference/architecture/index.md) | Skeleton |
| How do we explain that the workflow is fluid, actions not phases? | [Start › Overview](start/overview.md) will carry the pitch once rewritten (the "shared map, not a plan up front" framing was in the cleared skeleton); [sources.md](sources.md) routes opsx.md's explanation to [Guides › Understanding › Concepts](guides/concepts.md), but that page narrowed to artifacts only in review round 3; likely home is Guides › Understanding, widening [Concepts](guides/concepts.md) or adding a sibling page, with [Reference › Architecture › Design decisions](reference/architecture/design-decisions.md) keeping the why | Gap |
| What should a user do when OpenSpec doesn't do what they expected? | [Help › Troubleshooting](help/troubleshooting.md), then [Help › FAQ](help/faq.md) | Skeleton |
| Where does a user go for help or to report a bug? | [Help › Troubleshooting](help/troubleshooting.md), Getting help | Skeleton |
| How should a user move off the legacy `/openspec:*` commands? | [Help › Migration](help/legacy/migration.md) | Skeleton |
| How does a script or CI drive the CLI programmatically? | Off-site by decision: repo-side contributor docs, per [sources.md](sources.md) | Off-site |
