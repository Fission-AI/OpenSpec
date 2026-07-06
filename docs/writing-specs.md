# Writing Good Specs

You rarely write a spec from a blank page. You describe a change in plain language, `/opsx:propose` drafts the requirements and scenarios, and then you make them good. This page is about that last part — what "good" looks like, and how to steer the AI toward it.

It's the companion to [Reviewing a Change](reviewing-changes.md): reviewing is catching the weak spots in a draft, writing is knowing what a strong one is made of.

## A spec is behavior, not code

A spec says what your system *does*, in terms anyone could check — not how it's built. It's made of **requirements** (statements of behavior) and **scenarios** (concrete examples that prove them).

```markdown
### Requirement: Session Timeout
The system SHALL expire a session after 30 minutes of inactivity.

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass with no activity
- THEN the session is invalidated and the user must re-authenticate
```

Keep the *how* — the queue, the library, the table schema — in `design.md` or the code. When behavior and implementation get mixed into one requirement, the requirement stops being testable and starts going stale the moment the code changes.

## What makes a good requirement

A good requirement is one behavior, stated so plainly you could hand it to someone else to test.

- **One statement, one `SHALL`/`MUST`.** If a requirement has three "and also" clauses, it's really three requirements. Split them.
- **Observable.** Someone outside the code should be able to tell whether it holds. "The system SHALL show an error banner when the upload exceeds 10 MB" is observable. "The system SHALL handle large uploads gracefully" is not.
- **The right strength.** OpenSpec uses the RFC 2119 keywords, and they mean different things:

  | Keyword | Meaning |
  |---------|---------|
  | `MUST` / `SHALL` | A hard requirement. Non-negotiable. |
  | `SHOULD` | A strong recommendation, with room for a justified exception. |
  | `MAY` | Genuinely optional. |

  Reach for `MUST`/`SHALL` by default. Use `SHOULD` only when you truly mean "unless there's a good reason not to."

The test for a requirement: *could a tester who's never seen the code tell whether it passed?* If not, it needs sharpening.

## What makes a good scenario

Scenarios are where a requirement earns its keep. Each one is a concrete GIVEN / WHEN / THEN that could become an automated test.

- **It exercises its requirement.** A scenario that just restates the requirement in other words tests nothing. Make it a specific situation with a specific outcome.
- **Cover the cases that matter, not just the happy path.** The valid login is easy. The empty input, the expired token, the second click, the thing that goes wrong — those are where bugs live, and where a scenario is worth the most.
- **Name the case in the title.** "Scenario: Rejects an expired token" tells a reviewer what's covered at a glance; "Scenario: Test 2" doesn't.

A useful habit: before approving, ask *what's the one case I'd be upset to see broken?* — and make sure a scenario names it.

## Pick the right kind of delta

A change describes its edits to the specs with three section types. Using the right one keeps your archived specs honest:

- **`## ADDED Requirements`** — brand-new behavior that didn't exist before.
- **`## MODIFIED Requirements`** — behavior that already existed and is changing. Include the full new version; a short note on what changed helps a reviewer.
- **`## REMOVED Requirements`** — behavior going away, with a line on why.

On archive, ADDED gets appended to the main spec, MODIFIED replaces the old version, and REMOVED is deleted. If you mark a real change as ADDED, you end up with two competing requirements; if you describe new behavior as MODIFIED, there's nothing to replace. When in doubt, open the current spec and see whether the requirement is already there.

## Right-size the change

The single most common authoring mistake isn't a badly worded requirement — it's a change that's trying to be three changes.

**A good change has one intent you can say in a sentence.** "Add a dark-mode toggle." "Rate-limit the login endpoint." "Migrate sessions off cookies." If describing the change needs a lot of "and also," that's the signal to split it.

Signs a change is too big:

- The proposal's scope reads like a list of unrelated features.
- Reviewing it would take an afternoon, so nobody will.
- Two people couldn't work on it without colliding.
- Half the tasks could ship on their own.

Smaller changes are easier to review, easier to build in one focused session, and easier to reason about six months later when the archive is all that's left. You can always run several changes in parallel — see [Editing & iterating](editing-changes.md) and [Workflows](workflows.md).

The opposite also happens: a one-line typo fix doesn't need three requirements and a design doc. Match the ceremony to the stakes.

## How to steer the AI toward a good draft

Because `/opsx:propose` does the first draft, the quality of what you get back tracks the quality of what you give it. You don't have to write requirements by hand — you have to aim the AI well:

- **State the intent and the boundary.** *"Add a dark-mode toggle that follows the OS setting on first load — don't touch the existing theme API."* The out-of-scope half matters as much as the in-scope half.
- **Name the cases you care about.** *"Make sure there's a scenario for a user who already picked a theme manually."* The AI covers what you point at.
- **Then edit.** It's plain Markdown. Tighten a vague `SHALL`, delete a scenario that tests nothing, add the case it missed — or ask the AI to: *"the timeout requirement is vague, pin it to 30 minutes."*

Draft, sharpen, repeat. A few rounds of that produces a spec you'd trust, which is the whole point.

## A quick checklist

- [ ] Each requirement is one observable behavior with a `SHALL`/`MUST`.
- [ ] No implementation details are baked into the requirements.
- [ ] Every requirement has at least one scenario that actually exercises it.
- [ ] The important edge and error cases have scenarios, not just the happy path.
- [ ] Deltas use ADDED / MODIFIED / REMOVED correctly against the current spec.
- [ ] The whole change has one intent you can state in a sentence.

## Where to go next

- [Reviewing a Change](reviewing-changes.md) — the two-minute pass that catches what slipped through.
- [Concepts](concepts.md) — the deeper model behind specs, changes, and deltas.
- [Examples & Recipes](examples.md) — real changes from start to finish.
