# Worksets (beta)

> Open the store and the repos that use it in one editor window, so your agent sees both.

With a store, the context your agent needs is split across folders. The specs and changes live in the store, and the code lives in each repo. An agent started in one repo can read and grep that repo and nothing else, so it works from half the picture.

Worksets are the utility OpenSpec provides for this. A workset is a saved, named list of folders you open together. This page assumes the store is already set up and registered on your machine. [Stores (beta)](stores.md) covers that.

## How it works

- **What it is**: a named list of folders, saved on your machine only. Nothing is written into the member folders, and nothing is committed.
- **What opening does**: OpenSpec generates a `.code-workspace` file from the list and launches your editor on it. Every member folder sits in one window.
- **What you get**: your editor's search, and any agent you run inside that window, can read every member folder. The agent can grep the store's specs and the repo's code in one session.
- **What it doesn't change**: which `openspec/` folder a command uses. That still follows [Where artifacts get created](stores.md#where-artifacts-get-created-when-using-stores).

## Set it up

1. **Save the workset** (once per machine). List the repo and the store as members, and the tool to open them with:

   ```bash
   # save a named list of folders you open together
   openspec workset create platform \
     --member ~/src/web-app \
     --member ~/openspec/team-plans \
     --tool code
   ```

   ```yaml
   Saved workset 'platform' (2 members) to your machine.
   Open it any time with: openspec workset open platform
   ```

2. **Open it** whenever you start work:

   ```bash
   # open every member in one VS Code window
   openspec workset open platform
   ```

`openspec workset list` shows what you saved, and `openspec workset remove <name>` deletes a workset without touching the member folders:

```yaml
platform  (opens in VS Code)
  web-app     /Users/you/src/web-app
  team-plans  /Users/you/openspec/team-plans
```

## Use it: one change, two folders

Say the `add-login` change lives in the `team-plans` store, and the code for it lives in `web-app`. Open the `platform` workset and ask your agent to implement the change. In that one session it can:

- read `team-plans/openspec/changes/add-login/` and the specs next to it
- edit the code in `web-app/`
- run `openspec` commands from inside `web-app`

Without the workset, the agent only sees whichever folder it was started in.

## Tools out of the box

- **VS Code** (`--tool code`) and **Cursor** (`--tool cursor`): built in. Each opens one window with every member folder.
- **Claude Code and Codex in the terminal**: temporarily disabled as workset openers while that flow is reworked. `--tool claude` or `--tool codex` stops with an error that says so and points you to VS Code or Cursor.
- **Other editors**: add them under the `openers` key in [CLI settings (config.json)](../reference/configuration/config-json.md).
