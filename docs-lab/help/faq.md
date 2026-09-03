# FAQ

> Short answers to the questions that don't need a page.

<!-- WIP, on the todo list: this page is not written yet and is held back from the
site (its section is commented out in website/docs.sync.config.mjs, 2026-08-21). The
file stays so the structure and inbound links survive; re-list it in the sync config
once the prose lands. -->

<!-- Every entry is a one-liner: a short answer or a router link to the page that owns the topic; how-to content never lives here (README's "FAQ is one-liners" rule). Update/uninstall moved to installation.md; the skills-missing fix and Getting help live in troubleshooting.md; the git question is a one-line yes routing to guides/teams.md, which owns the team conventions. Unfilled headings are skeletons. -->

## Should openspec/ be checked into git?

## What runs in the terminal, and what in chat?

## Does OpenSpec work with my tool?

If it has a row in the [support matrix](../reference/supported-tools.md), yes.
Pick its id at init. If it isn't listed but reads the shared `.agents/skills/`
folder, pick **Other / Universal (shared .agents skills)** (`--tools agents`) —
the init picker also finds it if you search `universal`, `other`, `generic`,
`custom`, `proprietary`, `unlisted`, or `unsupported`. If neither, request it in
the [OpenSpec repo](https://github.com/Fission-AI/OpenSpec/issues).

## Where did the old /openspec:* commands go?
