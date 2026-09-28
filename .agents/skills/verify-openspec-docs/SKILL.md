---
name: verify-openspec-docs
description: Fact-checks OpenSpec user documentation with a fresh-context subagent that re-runs commands and checks claims against source. Manually triggered; not part of the drafting loop. Use when the user asks to verify, fact-check, or accuracy-check a docs page, section, or set of changed claims.
argument-hint: page or section
---

# Verify OpenSpec docs

Check finished docs prose against reality. The point of a fresh context is that the reviewer hasn't watched the prose get written, so it can't be talked into the author's assumptions.

This skill runs only when the user asks for it. Drafting is owned by `write-openspec-docs`; don't invoke this from inside a drafting session unless the user requests a verification pass.

## Scope the run

1. Confirm the target: a page, one `##` section, or a list of changed claims. If invoked without a target, ask.
2. Read the README at the root of the docs tree the target lives in; its invariants and page map are part of what gets checked.
3. One subagent per unit (one `##` section, or the stated claim list). A full page is several subagents, run in parallel.

## Spawn the reviewer

General-purpose subagent. Subagents don't inherit skills, so the prompt hands the reviewer everything by path. Fill every placeholder, make every path absolute, and send:

```
You are reviewing one unit of OpenSpec's user documentation before it reaches the docs owner. Be the two hardest readers it will meet: a skeptical developer reading it cold, and a fact-checker with the repo open.

Repo root: <ABSOLUTE REPO ROOT>. Use absolute paths with every tool.

Read first:
1. <DOCS TREE ROOT>/README.md: the page map and standing invariants.
2. <ABSOLUTE REPO ROOT>/.agents/skills/write-openspec-docs/writing.md: the house writing rules.
3. <PAGE PATH>: review only <the section "<HEADING>" | these changed claims: <LIST>>; read the rest of the page for context.

Then check, in this order:

1. Facts. Every command, flag, path, config key, output block, default, and behavior claim. Re-run the terminal commands shown: read-only commands anywhere, anything that mutates state in a scratch directory or not at all. Commands for the AI chat surface (like /opsx:propose) can't run in a shell; verify their names and behavior against the skill sources this repo ships. Check names against src/ and the CLI's own --help. An output block must match what the command actually prints.
2. Examples. Any example spec or change must pass `openspec validate`. Run it when the example exists on disk.
3. Structure. Flag anything that re-explains a topic whose canonical home is another page, or breaks a rule the docs tree's README states.
4. Job fit. Does the unit serve the page's stated job (the one-line statement under the title, if present)? Does the arriving reader get what they came for quickly?
5. Trust and slop. Flag: hype or comfort adjectives (easy, simple, powerful, seamless), claims with no shown evidence, vague generalization where a specific fact belongs, binary contrasts ("not X, it's Y"), colon reveals, importance puffery, summary endings, em dashes, bullet lists that should be prose, and three parallel punchy sentences in a row.

Report findings only, most severe first. For each: quote the line, say what is wrong, and give the fix in one line. For every fact you verified, say how (the command you ran, or the file and line you checked). List any claim you could not verify and why. Do not rewrite the unit. If the unit is clean, say so and list exactly what you verified.
```

## Handle the report

- Default is report, not rewrite: show the user the findings ranked most severe first, each with the quoted line and one-line fix, plus what was verified and how, and any claim the reviewer couldn't verify.
- Apply fixes only when the user asked for a verify-and-fix run or approves the findings. A verifier can also be wrong: rejections go in the report with your reason, so the user can overrule you.
- If an applied fix changed a factual claim, verify again, scoped to the changed claims. Typo and wording fixes don't need a second pass.
- Two passes without converging means stop and take it to the user. Don't polish in a loop.
