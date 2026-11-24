# Doing a step without its skill

Use this when the skill for a step is not installed. Each section is the CLI path for one skill. Run the commands from the project root and read their `--json` output. The user can install the skill instead with `openspec config profile`, then `openspec update`.

## openspec-explore

Exploring is a conversation, not a command. Read `openspec list --json`, the specs that matter, and the code, then think the problem through with the user. Write no code and no change files until they decide what to build.

## openspec-propose, openspec-new-change, openspec-continue-change, openspec-ff-change

1. Start the change: `openspec new change "<name>"`, using a short kebab-case name.
2. Run `openspec status --change "<name>" --json` to see which artifacts are ready.
3. For each artifact you write, run `openspec instructions <artifact-id> --change "<name>" --json` and follow its `instruction` and `template`. Write the file at its `outputPath`.
4. Repeat steps 2 and 3. Stop after one artifact for a step-by-step change; keep going until planning is complete when the user wants the whole plan.

## openspec-update-change

Read the change's files, revise the ones the user asked about, then run `openspec validate "<name>"` and fix what it reports. Change planning files only, never code.

## openspec-apply-change

Run `openspec instructions apply --change "<name>" --json`, read the files it lists under `contextFiles`, then do the unchecked tasks in order. Tick each task in `tasks.md` (`- [ ]` to `- [x]`) as soon as it is done.

## openspec-verify-change

Read the change's tasks and specs, then check the code against each: every task done, every requirement and scenario implemented. Report what is missing. Change no files.

## openspec-sync-specs

No command updates the main specs and keeps the change open. Either merge each file under `openspec/changes/<name>/specs/` into the matching `openspec/specs/<capability>/spec.md` by hand and run `openspec validate --specs`, or archive the change, which merges them for you.

## openspec-archive-change, openspec-bulk-archive-change

First check the change is finished: `openspec status --change "<name>" --json` shows its artifacts, and `openspec list --json` shows `completedTasks` of `totalTasks`. If anything is unfinished, tell the user and ask before you go on. Then run `openspec archive "<name>" --yes`, which merges the change's spec updates into the main specs and moves the change to the archive. For several changes, do one at a time.

## openspec-onboard

Walk the user through one small change in their own project: explore it, propose it, apply it, archive it, using the sections above.
