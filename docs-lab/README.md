# docs-lab: parallel rebuild of the OpenSpec docs

**Status: prose is landing page by page; the rest are skeletons** (real headings plus a
one-line `>` job statement the site lifts into the page description). The live site
builds from this tree: `website/docs.sync.config.mjs` maps these files to published
pages, and the old `docs/` tree is no longer used by the site.

This README owns the structure: which pages exist and which page teaches what. The
reverse view, from a job or message to the page that owns it, is
[message-map.md](message-map.md). How to
write them (style, voice, formatting) is the `write-openspec-docs` skill's
[writing.md](../.agents/skills/write-openspec-docs/writing.md).

## Structure rules

**Folders are the areas.** Every page lives in its area's folder (`start/`,
`guides/`, `customize/`, `multi-repo/`, `reference/`, `help/`); the root holds only this
README, `message-map.md`, `sources.md`, and `diagrams/`. Most folders publish as one
sidebar group; `guides/` publishes as the Guides group, holding three collapsible
subgroups (Understanding OpenSpec, Using OpenSpec, Adopting OpenSpec), all expanded
by default. Reference holds three nested
folders — `reference/architecture/`, `reference/schemas/`, and
`reference/configuration/` — each publishing as a collapsible group with `index.md` as
its landing page; the spec-driven schema publishes as a single page
(`reference/schemas/spec-driven/index.md`) inside the Schemas group. Labels and URLs come from
`website/docs.sync.config.mjs`, so moving a file never moves a URL.

**Teach once.** The loop (propose, review, apply, archive) has one teacher; every other
page links, never re-teaches:

- `start/quickstart.md` teaches it as UX: how a human moves a change through the
  lifecycle, including what archive does on disk.
- `start/overview.md` shows it as pitch: copy only, no explanation.
- `guides/concepts.md` stays out of it: the page explains the artifacts (specs, changes,
  the delta) and links to the quickstart for the loop. Disk paths appear inline with the
  concept that owns them, never as a layout section.
- `start/installation.md` owns install; `start/setup.md` owns init and what it writes.
  The quickstart opens with one prerequisite line linking both and starts at explore.

**Guides vs reference.** `reference/skills.md` holds each skill's contract: arguments,
what it creates, and what it responds with. Guide pages
(the Using and Adopting subgroups) own the human judgment for a task, including when
to reach for each skill, may span several skills, and never restate skill mechanics.
`reference/architecture/` is the one exception to Reference's look-it-up bar: it's
explanation content, housed here as a pragmatic home while it's three pages. If it
grows (say, by absorbing contributor internals), consider giving it its own folder
and tab.

**Reference is lookup, and named for it.** `reference/schemas/` and
`reference/configuration/` are contracts: keys, values, types, defaults, and
locations, on tables and fences. Anything explanatory (what a schema is, what
to put in config.yaml) lives in Customize or Guides and is linked, never
restated. Naming follows three rules. A reference folder's landing
page is titled "Overview"; the folder label already names the group, and
repeating it double-nests the sidebar. A page documenting one file carries
concept and filename in the title, concept first, where the concept names the
file's use, never just its scope ("Project configuration (config.yaml)", "CLI
settings (config.json)"): the left edge is what the eye disambiguates in the
sidebar, and the filename keeps the title matching what readers search for and
see on disk. A file whose name is the term readers use keeps the filename
alone as the title (`schema.yaml`), and a page owning one product term takes
that term as the title (`spec-driven`), and
a page covering several files takes the concept alone (Stores), naming its
files in the job line.

**FAQ is one-liners.** Every FAQ entry is a short answer, a few lines at most, or a
router link to the page that owns the topic. How-to content never lives in the FAQ:
when an answer outgrows a one-liner, it moves to a guide or reference page and the FAQ
entry becomes a pointer.

## Page index: every page's job

Each goal below is the page's `>` blockquote verbatim, so the promise here is the promise
readers see. A page delivers exactly its goal: content that outgrows it means splitting
the page or rewriting the goal in both places, never letting them drift.

### Start: from "what is this?" to your first archived change

| Page | Goal |
|---|---|
| [Overview](start/overview.md) | OpenSpec gives you and your coding agent a shared, reviewable plan before code is written. |
| [Installation](start/installation.md) | Install the `openspec` CLI on your machine, update it, and uninstall it. |
| [Set up your project](start/setup.md) | Add OpenSpec to a project: run init, see what it wrote, and adjust it. |
| [Quickstart](start/quickstart.md) | Your first change on your existing repo, from idea to archived. |

### Guides: understand the system, use it well, bring it to your codebase and team

| Page | Goal |
|---|---|
| [Understanding › Concepts](guides/concepts.md) | What the two artifacts are, and how a change describes a diff against current specs. |
| [Using › Explore an idea](guides/explore.md) | Think it through with the agent before you commit to a proposal. |
| [Using › Review the plan](guides/review-the-plan.md) | The two-minute pass that catches wrong turns before they're code. |
| [Using › Apply a change](guides/apply.md) | Run the plan: pacing, context windows, and picking up where you left off. |
| [Using › Change course](guides/change-course.md) | Revise a change in flight, or decide it's cleaner to start fresh. |
| [Adopting › Existing codebases](guides/existing-codebases.md) | Bring OpenSpec to a codebase with a lot of code and no specs: where to start, what to backfill, and how specs grow from there. |
| [Adopting › Teams](guides/teams.md) | Run OpenSpec as a team: what to commit, how a change rides its PR, and when to archive. |

### Customize: make the workflows fit your project

| Page | Goal |
|---|---|
| [Overview](customize/overview.md) | Your options for customizing OpenSpec. |
| [Profiles](customize/profiles.md) | Choose which workflows are installed, and whether they install as skills, commands, or both. |
| [Project configuration](customize/project-config.md) | Teach OpenSpec your project in config.yaml: context, rules, and conventions. |
| [Schemas](customize/schemas.md) | Change what the workflows produce: artifact schemas and templates. |

### Multi-repo (beta): plan across repository boundaries

| Page | Goal |
|---|---|
| [Stores (beta)](multi-repo/stores.md) | Plan changes that span repositories: one store, many repos. |

### Reference: look it up, exact and complete

| Page | Goal |
|---|---|
| [Skills](reference/skills.md) | Every OpenSpec skill: arguments, what it creates, and what it responds with. |
| [CLI](reference/cli.md) | The `openspec` terminal commands. |
| [Schemas](reference/schemas/index.md) | Every available workflow schema and the artifacts it defines. |
| [Schemas › schema.yaml](reference/schemas/schema-yaml.md) | Every field of a schema definition, for reading or writing one. |
| [Schemas › spec-driven](reference/schemas/spec-driven/index.md) | The default workflow's artifacts: their order, their formats, and the change folder they produce. |
| [Configuration](reference/configuration/index.md) | Every file and setting that changes how OpenSpec behaves, and where each lives. |
| [Configuration › Project configuration (config.yaml)](reference/configuration/config-yaml.md) | Every field of openspec/config.yaml: the schema, context, and rules this project plans with. |
| [Configuration › Change metadata (.openspec.yaml)](reference/configuration/change-metadata.md) | The supported fields and validation rules for the metadata stored with each change. |
| [Configuration › CLI settings (config.json)](reference/configuration/config-json.md) | Every field of config.json: how the openspec CLI behaves on your machine. |
| [Configuration › Environment variables](reference/configuration/environment-variables.md) | Every environment variable OpenSpec reads. |
| [Configuration › Stores](reference/configuration/stores.md) | The files behind multi-repo stores: registry.yaml and store.yaml, and which root a command uses. |
| [Supported tools](reference/supported-tools.md) | Which AI coding tools OpenSpec supports, and each one's command syntax. |
| [Glossary](reference/glossary.md) | Every OpenSpec term, one line each. |
| [Architecture](reference/architecture/index.md) | How OPSX is built: internals for the curious. |
| [Architecture › Workflow runs](reference/architecture/workflow-runs.md) | How a workflow run executes, from invocation to written artifacts. |
| [Architecture › Design decisions](reference/architecture/design-decisions.md) | Why OPSX works the way it does. |

### Help: get unstuck

| Page | Goal |
|---|---|
| [FAQ](help/faq.md) | Short answers to the questions that don't need a page. |
| [Troubleshooting](help/troubleshooting.md) | When OpenSpec doesn't do what you expected: symptoms and their fixes. |

### Legacy: land the old workflow safely

| Page | Goal |
|---|---|
| [Migrating from the legacy workflow](help/legacy/migration.md) | Moving from the legacy `/openspec:*` commands to OPSX. |

## Old docs

[`sources.md`](sources.md) maps every current `docs/` page to its destination here: the
source material while drafting, the redirect list at cutover. Cutover steps are in that
file's [Cutover](sources.md#cutover) section.

## Open TODOs

- Product feedback, not a docs task: spec-driven's design `instruction` lists six
  sections (including Migration Plan and Open Questions) but
  `schemas/spec-driven/templates/design.md` carries only four headers. The docs show
  both verbatim; the mismatch belongs upstream. Noted 2026-08-14 while consolidating
  the spec-driven page.

- `reference/cli.md` is fully drafted: the command table plus one section per real
  command, facts captured from working-tree runs (2026-08-11). The `delivery` key that
  start/setup.md's "Skills, commands, or both" section sets appears there only as
  command output; its field-level home, `reference/configuration/config-json.md`, is
  drafted (2026-08-14).
- Telemetry is undocumented. `OPENSPEC_TELEMETRY=0` appears nowhere in the tree; the
  Deno install command grants `--allow-net=edge.openspec.dev` with no explanation (the
  telemetry gloss was deliberately pulled pending a real home). The home now exists:
  write `reference/configuration/environment-variables.md` (the env var, what's
  collected, the opt-out, the CI auto-disable), then have the Deno section link to it
  to explain the flag. Noted 2026-08-07; home settled 2026-08-10.
- Product feedback, not a docs task: init doesn't say when the global profile changed what
  it wrote. A machine with `profile: custom` silently installs a different workflow set
  than a stock machine, and nothing in the init output names the profile that shaped it.
  Noted 2026-08-05 while verifying installation.md; track upstream, don't paper over in prose.
- Product feedback, not a docs task: drop the sync-specs skill from the default set; its
  job reads as reference content, not a workflow, and it pads the skill list every reader
  scans. Noted 2026-08-08 while writing start/setup.md's workflow tree.
- Product feedback, not a docs task: make the shared `.agents/` folder the default install
  target for every tool, with tool-specific folders (`.claude/`, ...) the exception. The
  docs already prefer `.agents/` in examples; the product should match. Noted 2026-08-08.
- `help/troubleshooting.md`'s skeleton has no section for install-time failures
  (`command not found`, wrong Node version, PATH). Old `docs/troubleshooting.md` covered
  them; `start/installation.md` carries caveats inline but there is no symptom-to-fix
  home. Add a section or an installation.md anchor. Noted 2026-08-10 during the old-docs
  message audit.
- Missing guide: the iterative flow. new/continue/fast-forward have no owner for the
  judgment: what the flow is, when to pick it over propose, and ff vs continue. Old
  `docs/workflows.md` covered it (Two Modes, When to Use What); `sources.md` routes that
  page's mechanics to `guides/apply.md` and contracts to `reference/skills.md`, so the
  choice itself landed nowhere. Likely a Guides › Using page slotted between Explore and
  Review the plan, with a pointer to `customize/profiles.md` (the skills are optional
  workflows outside the core set). Salvage only the ff-vs-continue rule of thumb; the rest of
  workflows.md is unverified. Noted 2026-08-11. Related: message-map row 29 words
  apply.md's pacing question as drafting-time pacing, the same creation-stage choice;
  fix that row's wording or owner when this guide lands. Noted 2026-08-14.
- Missing guide: working with git. OpenSpec never touches git, so every git decision
  lands on the reader with no page to answer it: do you branch before or after propose,
  does a task get its own commit, what goes in the PR, where does the archive commit
  land. `guides/teams.md` owns the archive-vs-PR ordering; the rest is unowned. Likely a
  `guides/` file in the Adoption group. Noted 2026-08-08.
- `customize/skills.md` is parked: the skeleton stays on disk but is out of the page
  index, the sidebar, and the sync config. Editing installed skill prompts has no good
  answer yet (`openspec update` overwrites edits); the message map keeps the question as
  a Gap. Revive when the product has a real story for surviving updates. Parked 2026-08-14.
- `guides/examples.md` is parked: the skeleton stays on disk but is out of the page
  index, the sidebar, and the sync config. Contrived examples teach the wrong lesson for
  this product; revive the page when real archived changes from actual usage can fill it.
  The content plan (weak-vs-reviewed pairs, archived-changes gallery) is in the file's
  comment. Parked 2026-08-11.
- Product feedback, not a docs task: "expanded" survives in product strings and the
  update workflow is unlabeled in the picker. The only stored profile values are core
  and custom, but `src/core/templates/workflows/update-change.ts` says "expanded-profile
  workflow", and `WORKFLOW_PROMPT_META` (`src/commands/config.ts`) has no `update` entry,
  so the `openspec config` workflow picker renders a core workflow as raw `update` /
  "Workflow: update". Docs standardized on core/custom with "expand the set" as a verb
  (2026-08-12). Noted 2026-08-12 during the glossary product sweep.
- Product feedback, not a docs task: converge on skills only, soon. A workflow's skill and
  command are the same instructions, Claude Code has already merged commands into skills
  upstream, and setup spends a whole subsection explaining why two forms exist. Every page
  gets simpler when commands go. Noted 2026-08-08 while writing start/setup.md.
- Website QOL backlog, site build not prose: i18n; AI search layered on the stock keyword
  search (an ask-the-docs answer box, not just matching); proper light/dark themes that
  carry the Survey palette (DESIGN.md tokens) into both modes instead of a stock dark
  theme. Candidates to bundle in the same pass: `llms.txt` plus a per-page "copy as
  Markdown" button so agents can ingest pages, copy buttons on code blocks, and
  "edit this page on GitHub" links. Noted 2026-08-11.
