# FAQ

> Short answers to the questions that don't need a page.

<!-- WIP: only answered questions are published. Unanswered ones wait in the comment
at the end of this page; move each one back up once it has an answer. -->

<!-- Every entry is a one-liner: a short answer or a router link to the page that owns the topic; how-to content never lives here (README's "FAQ is one-liners" rule). Update/uninstall moved to installation.md; the skills-missing fix and Getting help live in troubleshooting.md; the git question is a one-line yes routing to guides/teams.md, which owns the team conventions. Unfilled headings are skeletons. -->

## Does OpenSpec work with my tool?

If it has a row in the [support matrix](../reference/supported-tools.md), yes.
Pick its id at init. If it isn't listed but reads the shared `.agents/skills/`
folder, pick **Other / Universal** (`--tools agents`), covered by the support
matrix's Other / Universal section. If it reads only its own folder, point that
folder at `.agents/skills/` with one link
([Link another tool](../reference/supported-tools.md#link-another-tool)).

## Can I symlink openspec/ or a folder inside it?

No. Symlinked folders aren't supported, and commands aren't guaranteed to work through the link.

<!-- Unanswered, held back from the site until they have answers:

## Should openspec/ be checked into git?

## What runs in the terminal, and what in chat?

## Where did the old /openspec:* commands go?
-->
