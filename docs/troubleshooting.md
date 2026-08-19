# Troubleshooting

Concrete fixes for concrete problems. Each entry names a symptom, explains the likely cause in a sentence, and gives you the fix. If you don't see your issue here, the [FAQ](faq.md) may help, and the [Discord](https://discord.gg/YctCnvvshC) definitely will.

## Installation and setup

### `openspec: command not found`

The CLI isn't installed, or your shell can't find it. Install it globally and check:

```bash
npm install -g @fission-ai/openspec@latest
openspec --version
```

If it installed but still isn't found, your global npm bin directory probably isn't on your `PATH`. Run `npm prefix -g` to see where global packages live: on macOS and Linux the binaries are in that directory's `bin/`, and on Windows they sit directly in it. Make sure that path is on your `PATH`. (`npm bin -g` was removed in npm 9.)

If you used the [AI-assisted install](installation.md#install-with-your-ai-assistant), this is the expected hand-off point: that prompt tells your assistant to show you the `PATH` change rather than edit your shell startup files itself.

### "Requires Node.js 20.19.0 or higher"

OpenSpec runs on Node 20.19.0+. Check your version and upgrade if needed:

```bash
node --version
```

If you use bun to install OpenSpec, note that OpenSpec still *runs* on Node, so you need Node 20.19.0+ available on your `PATH` regardless. See [Installation](installation.md).

### `openspec init` didn't configure my AI tool

Init asks which tools to set up. If you skipped your tool or want to add another, just run it again, or use the non-interactive form:

```bash
openspec init --tools claude,cursor
```

The full list of tool IDs is in [Supported Tools](supported-tools.md). Use `--tools all` for everything, `--tools none` to skip tool setup.

## Commands don't show up

If `/opsx:propose` (or your tool's equivalent) doesn't appear or doesn't do anything, work down this list. They're ordered fastest-to-check first.

1. **You may be in the wrong place.** Slash commands go in your AI assistant's chat, not your terminal. If you typed `/opsx:propose` into your shell, that's the issue. See [How Commands Work](how-commands-work.md).

2. **Regenerate the files.** From your project root:

   ```bash
   openspec update
   ```

   This rewrites the skill and command files for every tool you've configured.

   Instruction files come from the *installed* CLI, so an outdated CLI reports everything up to date without ever writing the newer workflows. `openspec update` now checks for that and offers to upgrade — take the offer if you see it.

3. **Restart your assistant.** Most tools scan for skills and commands at startup. A fresh window often does it.

4. **Confirm the files exist.** For Claude Code, check that `.claude/skills/` contains `openspec-*` folders. Other tools use their own directories, all listed in [Supported Tools](supported-tools.md).

5. **Check you initialized this project.** Skills are written per project. If you cloned a repo or switched folders, run `openspec init` (or `openspec update`) there.

6. **Confirm your tool supports command files.** Codex, CodeArts, DeepSeek Harness, ForgeCode, Hermes, Kimi Code, Mistral Vibe, Zed Agent, and the shared `.agents` target don't get generated `opsx-*` command files; they use skill-based invocations instead, so `/opsx` will never autocomplete for them. Type `$openspec-propose` in Codex, `/skill:openspec-propose` in Kimi Code, and `/openspec-propose` in the rest. The shared `.agents` target is vendor-neutral, so `/openspec-propose` is the common form rather than a guaranteed one — if your assistant does not answer to it, check its own docs for how it invokes a skill. Amazon Q does get command files, but loads them into its prompt library rather than its slash menu — type `@opsx-propose` there, not `/opsx`. Every tool's form is listed in [How To Invoke](supported-tools.md#how-to-invoke).

## Working with changes

### "Change not found"

The command couldn't tell which change you meant. Name it explicitly, or check what exists:

```bash
openspec list                    # see active changes
/opsx:apply add-dark-mode        # name the change in chat
```

Also confirm you're in the right project directory.

### "No artifacts ready"

Every artifact is either already created or blocked waiting on a dependency. See what's blocking:

```bash
openspec status --change <name>
```

Then create the missing dependency first. Remember the order: proposal enables specs and design; specs and design together enable tasks.

### `openspec validate` reports warnings or errors

Validation checks your specs and changes for structural problems. Read the message: it names the file and the issue.

```bash
openspec validate <name>           # validate one item
openspec validate --all            # validate everything
openspec validate --all --strict   # stricter checks, good for CI
openspec validate --archived       # fail if archived changes have unchecked tasks
```

Common causes are a missing required section (like a spec with no scenarios) or a malformed delta header. Fix the file and re-run. The [CLI reference](cli.md#openspec-validate) documents the output format.

One message deserves its own note:

```text
MODIFIED "<requirement>" omits scenario(s) the current spec still has: "<scenario>"
```

A `MODIFIED` requirement replaces the whole requirement block, so it has to carry every scenario that survives the change, not only the ones you edited. Copy the named scenarios from `openspec/specs/<capability-path>/spec.md` back into the delta, preserving any domain directories in the path. This often appears on an older change after someone else's change added a scenario to the same requirement — archive refuses that change either way, and validation now says so before you implement it.

### The AI created incomplete or wrong artifacts

The AI didn't have enough context. A few levers help:

- Add project context in `openspec/config.yaml` so your stack and conventions are injected into every request. See [Customization](customization.md#project-configuration).
- Add per-artifact `rules:` for guidance that only applies to, say, specs.
- Give a more detailed description when you propose.
- Use the expanded `/opsx:continue` to create one artifact at a time and review each, instead of `/opsx:ff` doing them all at once.

### Archive won't finish, or warns about incomplete tasks

Archive won't *block* on incomplete tasks, but it warns you, because archiving usually means the work is done. If tasks remain on purpose (you're filing a partial change), proceed. Otherwise finish the tasks first. Archive will also offer to sync your delta specs into the main specs if you haven't synced yet; say yes unless you have a reason not to.

### "User force closed the prompt with 0 null"

Something ran `openspec archive` where nothing can answer a question — an AI agent calling it from a tool, a CI job, or any shell with stdin closed. Archive asks up to three confirmations, and an unanswerable one used to fail with that raw message.

Pass `--yes` to answer them up front:

```bash
openspec archive <change-name> --yes
```

Keep any flags you were already passing — `--skip-specs` and `--no-validate` change what archive does, so a bare `--yes` rerun is not the same command. Current versions name the flag for you and print a `Fix:` line you can paste. If you meant to pick from a list, pass the change name explicitly: the picker needs an answer too.

If you instead ran archive with its output redirected to a file or captured by a tool and *did* pipe an answer (`printf 'y\n' | openspec archive …`), older versions wrote terminal escape codes into that capture while drawing the prompt — in some environments enough to bloat the file badly. Current versions read the confirmation prompts as plain text whenever stdout is not a terminal, and a no-argument `openspec archive` (which would otherwise draw an interactive change picker) asks you to pass a change name up front instead of rendering a menu into the capture. Either way, redirected and agent runs stay clean; passing `--yes` (with a change name) skips the prompts entirely.

## Configuration

### My `config.yaml` isn't being applied

Three usual suspects:

1. **Wrong filename.** It must be `openspec/config.yaml`, not `.yml`.
2. **Invalid YAML.** Run it through any YAML validator; the CLI also reports syntax errors with line numbers.
3. **You expected a restart.** You don't need one. Config changes take effect immediately.

### "Unknown artifact ID in rules: X"

A key under `rules:` doesn't match any artifact in your schema. For the default `spec-driven` schema the valid IDs are `proposal`, `specs`, `design`, `tasks`. To see the IDs for any schema:

```bash
openspec schemas --json
```

### "Context too large"

The `context:` field is capped at 50KB, on purpose, because it's injected into every request. Summarize it, or link out to longer docs instead of pasting them. Lean context also produces better, faster results.

### "Schema not found"

The schema name you referenced doesn't exist. List what's available and check spelling:

```bash
openspec schemas                    # list available schemas
openspec schema which <name>        # see where a schema resolves from
openspec schema init <name>         # create a custom one
```

See [Customization](customization.md#custom-schemas).

## Migration from the legacy workflow

### "Legacy files detected in non-interactive mode"

You're in CI or a non-interactive shell, and OpenSpec found old files to clean up but can't prompt you. Approve automatically:

```bash
openspec init --force
```

For Codex, OpenSpec may detect old managed prompt files in `$CODEX_HOME/prompts` or `~/.codex/prompts`. That cleanup is limited to OpenSpec's allowlisted legacy Codex prompt filenames, and non-interactive `openspec init` removes only the files whose replacement `.agents/skills/openspec-*` skills exist. Non-interactive `openspec update` leaves all legacy cleanup untouched unless you pass `--force`.

### Commands didn't appear after migrating

Restart your IDE. Skills are detected at startup. If they still don't appear, run `openspec update` and check the file locations in [Supported Tools](supported-tools.md).

### My old `project.md` wasn't migrated

That's intentional. OpenSpec never deletes `project.md` automatically because it may hold context you wrote. Move the useful parts into `config.yaml`'s `context:` section, then delete it yourself. The [Migration Guide](migration-guide.md#migrating-projectmd-to-configyaml) walks through this, including a prompt you can hand to your AI to do the distilling.

## Still stuck?

- **Discord:** [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues:** [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **From your terminal:** `openspec feedback "what went wrong"` opens an issue for you.

When you report a problem, include your OpenSpec version (`openspec --version`), your Node version (`node --version`), your AI tool, and the exact command and output. It makes help much faster.
