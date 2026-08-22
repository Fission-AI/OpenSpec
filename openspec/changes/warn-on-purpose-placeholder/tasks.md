## 1. Name the generated placeholder

- [x] 1.1 Extract the placeholder archive writes into a named constant, composed
      of the fixed segments around the interpolated change name, so one
      definition serves both the writer and the check
- [x] 1.2 Compose `buildSpecSkeleton`'s placeholder from that constant, and
      confirm the existing archive tests still pass unchanged — the text written
      to disk must be byte-identical to before

## 2. Detection module

- [x] 2.1 Add `src/core/validation/purpose-placeholder.ts`: a pure function that
      takes the parsed Purpose plus the spec content and returns a finding or
      nothing, following the shape of `task-numbering.ts`
- [x] 2.2 Recognise the generated sentence through the constant from 1.1,
      wherever it appears in the Purpose
- [x] 2.3 Recognise a `TBD` marker opening the Purpose, excluding a longer word
      that merely begins with those letters
- [x] 2.4 Return no finding for an empty Purpose, leaving it to the existing
      empty-Purpose error
- [x] 2.5 Locate the first non-blank line of the `## Purpose` section for the
      finding, normalising line endings first, and return the finding without a
      line when the section cannot be located

## 3. Wire it into validation

- [x] 3.1 Add the warning message to `VALIDATION_MESSAGES`, naming the main spec
      as the place to edit and why a delta cannot do it
- [x] 3.2 Call the check from `applySpecRules` so both `validateSpec` and
      `validateSpecContent` are covered
- [x] 3.3 Run the brevity check only when the placeholder check does not fire, so
      a bare `TBD` produces one finding

## 4. Tests

- [x] 4.1 Unit-test the module: the generated sentence, a bare `TBD`, a `TBD`
      opening a longer sentence, mixed case, and the sentence appearing below an
      authored line
- [x] 4.2 Unit-test what must stay silent: a `TBD` inside a sentence, a word
      beginning with the marker, an empty Purpose, and an ordinary short Purpose
- [x] 4.3 Unit-test line location: text after blank lines, a Purpose section with
      no body, and no content supplied
- [x] 4.4 Test through `Validator`: valid by default with one warning, invalid
      under `--strict`, and an authored Purpose still passing `--strict`
- [x] 4.5 Test the gap this closes — the placeholder is over the length floor, so
      assert it now fails `--strict` while a terse authored Purpose still fails
      for brevity and not as a placeholder
- [x] 4.6 Test that a bare `TBD` yields exactly one finding against the Purpose
- [x] 4.7 Test the archive guarantee: the exact non-strict `validateSpecContent`
      call archive makes still reports a placeholder spec as valid
- [x] 4.8 Test the real file path end to end, reading a spec off disk
- [x] 4.9 Test that a spec saved with CRLF endings reports the same warning and
      the same line number as the LF version

## 5. Verify

- [x] 5.1 Run the full suite and confirm no existing test changes behavior — only
      additions
- [x] 5.2 Run `openspec validate --specs --strict` on this repo and confirm it
      still passes, including the two specs that mention `TBD` inside scenarios
      rather than in a Purpose
- [x] 5.3 Run lint, typecheck, and the build
- [x] 5.4 Confirm the cross-platform CI matrix passes, since the check counts
      lines in files that may carry either line ending
      (green on linux-bash, macos-bash and windows-pwsh, plus lint & typecheck;
      run by `workflow_dispatch` on the fork, so the upstream pull-request run
      is still the gate that counts)
- [x] 5.5 Add a `.changeset/` entry describing the new warning, its severity, the
      detection boundary, and that archive is unaffected

## 6. Prove the tests hold the behaviour

Added during implementation, not planned. A passing suite says the code works on
the cases someone thought to write; it does not say a guard is load-bearing. Two
were not, and only reverting them one at a time showed it.

- [x] 6.1 Revert each guard in turn and record which tests die, so every guard is
      known to be held by a test rather than assumed to be
- [x] 6.2 Fix the prefix/suffix test, which named the suffix guard but used a
      Purpose containing neither half of the generated sentence — it passed
      whether or not the suffix was required, so the mutation killed nothing
- [x] 6.3 Remove the empty-Purpose early return, which no test could hold:
      neither rule matches empty text, so the branch changed no behaviour.
      The requirement that an empty Purpose goes unreported is unchanged and
      still asserted; it now falls out of the two rules instead of a third branch

## 7. Answer the two questions the issue left open

Issue #1670 asked whether the finding should be an error and whether `TODO`
should count. Warning stands, for the upgrade-safety reason in section 1. The rest is
what changed after review.

- [x] 7.1 Read a `TODO` opening the Purpose as the same finding as a `TBD`.
      Nothing OpenSpec writes produces one, but the marker an author leaves is
      whichever word they reach for, and a Purpose reading `TODO: fill in` is as
      unwritten as one reading `TBD`. The narrow rule is unchanged: only the
      opening position counts, so `TODOs are tracked in the issue` and a `TODO`
      raised mid-sentence are still authored prose
- [x] 7.2 Read fenced code in the Purpose as quoted material rather than as the
      Purpose speaking, through the `buildCodeFenceMask` the requirement and
      structure parsers already share. Without it a Purpose that documents the
      placeholder is reported as being one, which fails the document that
      explains the check to the person reading the check's output
- [x] 7.3 Skip fenced lines when locating the placeholder too, so a `## Purpose`
      or `## Requirements` quoted in a fence can neither be mistaken for the
      section header nor end the section early
- [x] 7.4 Widen the message to name both what archive writes and a marker left in
      its place, since one message now covers both
- [x] 7.5 Mutation-check every new guard by reverting it in turn: dropping `TODO`
      kills 3 tests, unmasking detection kills 2, unmasking the line locator
      kills 3, and unmasking the header search kills 1
- [x] 7.6 Make the marker boundary Unicode-aware, after review pointed out that
      `\b` is ASCII and so read `TODOé` and `TBD١` as markers followed by
      punctuation. A Purpose is prose, and prose is not always Latin script.
      Held in both directions: loosening it back to `\b` kills 1 test, tightening
      it to reject punctuation kills 4

