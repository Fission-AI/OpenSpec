# Try OpenSpec with your team next week

**A one-week experiment in your existing repository, with your existing coding agents and pull requests.** You do not need an OpenSpec expert. The goal isn't to use OpenSpec everywhere or prove an ROI number in five days. It is to see whether a shared, reviewable description of a change helps your team catch misunderstandings sooner and hand work between people more easily.

**The path:** pick one real change → agree what good looks like → draft and review the change → build or hand it off → decide what to keep. Allow **20 minutes for kickoff**, **15 minutes for the first plan review**, and **20 minutes for the Friday review**. The actual coding happens as part of normal work.

## 1. Pick the work (before Monday)

Pick **one change the team would otherwise do this week**. Good candidates have a user-visible behavior or interface to agree on, some ambiguity, and a likely reviewer who isn't the author. It should be small enough to review meaningfully; it **doesn't have to ship this week**. Don't begin with a sweeping rewrite, trivial typo, emergency fix, or a speculative project nobody has approved.

**Example, used throughout:** a SaaS app currently accepts duplicate customer CSV uploads, confusing customers and support. The team wants to reject a repeated upload with an actionable message. The current API and tests already exist; the team needs to decide what counts as a duplicate and how the UI responds.

**Agree on one improvement to observe:** “Can a second engineer understand the intended behavior and identify a missing case *before* implementing?” Other valid signals are fewer clarifying messages during handoff, a meaningful disagreement surfaced earlier, or less backtracking. Record **specific events**, not imagined time saved.

## 2. Kickoff: make the agreement (20 minutes)

Copy this short agreement into your existing issue or PR description, or a small `TEAM-TRIAL.md` in the repo. Fill it in together. Change your existing process only where named below.

| Decision | Filled example | Your team |
| --- | --- | --- |
| Work and boundary | Reject duplicate CSV uploads; no redesign of import pipeline | ___ |
| Owner and second reader | Alex drafts; Sam reviews and can continue | ___ |
| Improvement to watch | Sam spots an unclear behavior before code; can resume from files | ___ |
| When to use OpenSpec | This one change; no requirement for other PRs | ___ |
| Agreement point | Review OpenSpec artifacts in a draft PR before substantial implementation | ___ |
| Completion rule | Existing CI, code review and release rules remain authoritative | ___ |
| End-of-week decision | Friday: continue / adjust / stop, with reasons | ___ |

**Working rules for this trial:**

1. The person proposing the change owns the intent, **not** the agent. Review the generated proposal, scenarios, design, and tasks before implementation. A human resolves open questions.
2. The change lives in Git with the code. The reviewer comments on the **behavior and decisions**, not just formatting. Existing issue tracker, PR approvals, tests and CI still apply.
3. If behavior or scope changes, update the OpenSpec artifacts and re-review the changed decision **before** implementing that new direction. No “the agent said it's done” approvals.

## 3. Shared setup (one teammate; commit via a normal PR)

**Prerequisites:** Node.js and npm, an existing Git repository, and at least one [supported coding agent](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md). Ask each participant to use the agent they already use. These are **terminal** commands:

```bash
npm install -g @fission-ai/openspec@latest
cd path/to/your-existing-repo
openspec init
```

In the interactive picker, select the coding tools used by the two participants. `init` adds `openspec/` and tool-specific skills/commands. Review the generated files before committing. If the second person uses a different tool, re-run `openspec init` and select that tool too, then commit its files. The tool integrations are **shared repo files**; do not ask every person to independently initialize and commit conflicting configurations.

Edit **`openspec/config.yaml`** into a minimal, real project-specific context. This sample uses valid project-config keys; replace the example facts with *your* repository's facts. Keep it concise:

```yaml
schema: spec-driven
context: |
  This repository contains a TypeScript/Node API and a React frontend.
  CSV import behavior is implemented in the existing import endpoints and UI.
  Reuse existing error-response conventions and test patterns.
  Do not assume a new service or database table is needed.
rules:
  proposal:
    - State the user problem and what is explicitly out of scope.
  specs:
    - Include the unsuccessful or ambiguous user path, not only the happy path.
```

This context and these rules are **instructions to the agent**, not enforced policy. Avoid copying arbitrary conventions from the example. Commit `openspec/config.yaml`, the `openspec/` directories and relevant agent integration files to Git via your existing review process. **Don't design a custom schema** for this trial.

**Shared:** `openspec/config.yaml`, active change artifacts, eventually the main `openspec/specs/` and archive, and generated tool integrations for the team's chosen agents. **Personal:** each person's CLI installation, agent subscription/credentials, model, chat history, and global OpenSpec preferences. The repo config is *not* the same as global `openspec config` settings.

After pulling the setup commit, each person installs the CLI locally if needed and **restarts their coding agent** so it picks up the repo workflows. There is no server, account signup, or team workspace to create.

## 4. First change: one person proposes, another reviews

**Monday / Alex:** In the **AI agent's chat**, not the terminal, invoke the installed **propose** workflow. The example below uses the Claude Code spelling; other tools use different invocation names (e.g. Codex `$openspec-propose`). Use the spelling printed by `openspec init` or [this table](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md#how-to-invoke).

```text
/opsx:propose reject-duplicate-csv-upload

A customer who reuploads the same CSV should receive a clear, actionable result.
Inspect the current import flow and tests first. Keep the existing import pipeline.
Before implementation, make explicit what counts as "same" and what happens
if a file has the same name but different contents.
```

This drafts an `openspec/changes/reject-duplicate-csv-upload/` directory with a proposal, delta specs, design and tasks. **Review the actual files; don't assume the agent got them right.** Alex opens a draft PR containing the change files, linking the existing issue, *before* substantial implementation.

The first review is not “does the markdown look complete?” It asks whether the team can build the *right* behavior:

> **Sam's review comment:** “The draft says ‘same file’, but is that filename or content? If content is identical but the filename changed, should we reject it? What about resubmitting after a failed import?”
>
> **Alex's resolution:** “Use existing content-hash detection. Only completed successful imports count as duplicates; a failed import can be retried. Same filename with different content is allowed. Show a link to the earlier successful import.”

Alex revises the behavior in the delta spec and the corresponding design/tasks before requesting another review. For example, the relevant delta spec might read:

```markdown
## ADDED Requirements

### Requirement: Duplicate CSV upload response
The system SHALL identify an uploaded CSV as a duplicate only when its content
matches a previously successful import for the same customer.

#### Scenario: Successful duplicate
- **WHEN** a customer uploads a CSV matching an earlier successful import
- **THEN** the system rejects the duplicate import and provides a link to the earlier import

#### Scenario: Failed import retry
- **WHEN** a customer uploads a CSV matching an earlier failed import
- **THEN** the system permits a retry

#### Scenario: Same filename, different contents
- **WHEN** a customer uploads a CSV whose filename matches but contents differ
- **THEN** the system does not reject it as a duplicate on filename alone
```

This example illustrates a **review outcome**, not a universal import design. Check whether the repo actually has content-hash detection and suitable response patterns; if it doesn't, change the proposal accordingly. The reviewer approves the **intent** (or requests changes) through the team's normal PR process. Approval of the plan is **not** approval of unreviewed code.

**Tuesday / Sam:** Pull Alex's branch. Start a **new agent conversation** and ask it to read the committed change and explain the current goal, unresolved questions and next unchecked task **before touching code**. Sam should be able to understand the handoff without Alex's chat transcript. If anything is unclear, comment in the PR rather than guessing. Sam can then run the installed **apply** workflow in the agent chat:

```text
/opsx:apply reject-duplicate-csv-upload
```

Apply reads the artifacts and works through the unchecked tasks. Inspect diffs and run the repo's usual tests; task checkboxes are a progress indicator, not proof of correctness. Push the implementation to the normal PR and review it as usual. **If the change isn't ready for code, stop after the plan review: that is still a valid trial result.**

## 5. When the plan changes or something doesn't work

| Situation | Do this |
| --- | --- |
| “We don't know the behavior yet.” | Ask your agent to explore the existing code and alternatives using its **explore** workflow; decide with the reviewer before proposing/implementing. |
| “The requirements changed during coding.” | Use the agent's **update** workflow for this change (or edit the Markdown files directly). Check proposal, specs, design and tasks for consistency; have the other person review the changed decision, then continue apply. |
| “A small issue turned into a different project.” | Stop, narrow the scope, or open a separate change. Don't hide a new goal inside the old one. |
| “The command isn't recognized.” | Check terminal vs agent-chat placement and tool-specific spelling; inspect generated integration files, restart the agent, then try `openspec update`. If no integration files exist for that agent, use `openspec init` to add it. |
| “The agent claims success but the code or tests disagree.” | Follow your normal tests and PR review. Correct the code or delta spec so they agree; do not treat generated text as an enforced check. |
| “We didn't finish by Friday.” | Keep the change active. Review what was clarified, missed, handed off and reworked; don't archive unfinished work just to conclude the trial. |

**Light checkpoint (Wednesday, five minutes):** Ask “What decision became clearer because the artifact was shared? Can the second person explain and continue from the files alone?” If not, change **one convention** (for example, always write failure cases before plan review), not the whole schema.

**When finished:** after implementation, code review and tests, use the installed **archive** workflow in agent chat. It can sync delta specs to `openspec/specs/` and move the change to `openspec/changes/archive/`. Review the resulting diff before merging. You do **not** need a separate sync step for the default path.

## 6. Friday: decide, don't declare victory (20 minutes)

Discuss the one change (finished or not). Fill in this table with evidence, not estimates:

| Question | Filled example | Your result |
| --- | --- | --- |
| What became clearer earlier? | Sam identified the failed-import retry case in the plan PR | ___ |
| Did the handoff survive a fresh agent chat? | Sam could explain and resume from files, but asked once about error UI | ___ |
| Where did it feel wasteful/confusing? | Proposal and design duplicated a paragraph; command spelling differed by agent | ___ |
| What evidence would change our mind? | Try one cross-component change with a different author/reviewer pair | ___ |

**Choose one:** **Continue** for another 1–2 real changes with the same small agreement; **adjust** one rule/checkpoint and retry; or **stop** if nobody got useful review/handoff value relative to the overhead. Record why in the existing issue/PR. Do not infer developer productivity, adoption or ROI from one week.

**Success for this trial is modest:** two people used the *same versioned change* to make or challenge a decision and one could pick up the work without private chat context. It's fine if the code is still in progress.

---

**Reference if something breaks:** [Installation](https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md) · [Tool-specific invocation](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md#how-to-invoke) · [Commands](https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md) · [Customization](https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md)