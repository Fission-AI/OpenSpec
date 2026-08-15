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
- [ ] 5.4 Confirm the cross-platform CI matrix passes, since the check counts
      lines in files that may carry either line ending
- [x] 5.5 Add a `.changeset/` entry describing the new warning, its severity, the
      detection boundary, and that archive is unaffected
