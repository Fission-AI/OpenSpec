## 1. Spec Update

- [x] 1.1 Draft spec delta: add JSON output requirement & scenarios for changes/specs mode.

## 2. CLI Implementation

- [x] 2.1 Add `--json` flag option to top-level list command.
- [x] 2.2 Pass flag through to ListCommand with boolean param.
- [x] 2.3 Emit JSON arrays matching defined shape.

## 3. Behavior & UX

- [x] 3.1 Keep default table output unchanged when flag absent.
- [x] 3.2 Return empty array `[]` rather than message when `--json` and no items.
- [x] 3.3 Preserve existing empty state messages for non-JSON paths.

## 4. Tests

- [x] 4.1 Add test: changes mode JSON structure & counts.
- [x] 4.2 Add test: specs mode JSON structure & requirement counts.
- [x] 4.3 Add test: empty changes directory with `--json` returns [] (setup fixture).
- [x] 4.4 Add test: empty specs with `--json` returns [].
