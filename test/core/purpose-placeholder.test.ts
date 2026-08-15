import { describe, expect, it } from 'vitest';
import { findPurposePlaceholderIssue } from '../../src/core/validation/purpose-placeholder.js';
import {
  PURPOSE_PLACEHOLDER_PREFIX,
  PURPOSE_PLACEHOLDER_SUFFIX,
} from '../../src/core/validation/constants.js';

/** Built the way archive builds it, so the test cannot drift from the writer. */
const placeholderFor = (changeName: string) =>
  `${PURPOSE_PLACEHOLDER_PREFIX}${changeName}${PURPOSE_PLACEHOLDER_SUFFIX}`;

const ARCHIVE_TEXT = placeholderFor('add-retry-budget');

const specWith = (purpose: string) =>
  [
    '# widgets Specification',
    '',
    '## Purpose',
    purpose,
    '',
    '## Requirements',
    '### Requirement: Retries are bounded',
    'The system SHALL stop retrying a delivery after the configured budget.',
    '',
    '#### Scenario: Budget exhausted',
    '- **WHEN** the budget is exhausted',
    '- **THEN** the delivery is abandoned',
    '',
  ].join('\n');

describe('findPurposePlaceholderIssue', () => {
  describe('reports a placeholder', () => {
    it('reports the sentence archive writes, and points at it', () => {
      expect(findPurposePlaceholderIssue(ARCHIVE_TEXT, specWith(ARCHIVE_TEXT))).toEqual({
        line: 4,
      });
    });

    it('reports it for any change name, since the name is what varies', () => {
      const purpose = placeholderFor('2026-01-15-my-change');
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 4 });
    });

    it('reports a bare TBD an agent wrote instead of the archive wording', () => {
      expect(findPurposePlaceholderIssue('TBD', specWith('TBD'))).toEqual({ line: 4 });
    });

    it('reports a TBD opening a longer placeholder sentence', () => {
      const purpose = 'TBD: fill this in once the capability settles down.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 4 });
    });

    it('ignores case in the leading marker', () => {
      const purpose = 'tbd - write this later';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).not.toBeNull();
    });

    it('reports the archive sentence even when it does not open the Purpose', () => {
      // Someone typed a line above the placeholder and left it in place. The
      // sentence is archive's own output wherever it sits, so it still counts.
      const purpose = `Handles widget retries.\n\n${ARCHIVE_TEXT}`;
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).not.toBeNull();
    });

    it('reports a placeholder the author padded with whitespace', () => {
      expect(findPurposePlaceholderIssue('   TBD   ', specWith('   TBD   '))).not.toBeNull();
    });
  });

  describe('leaves authored prose alone', () => {
    it('does not report a Purpose that raises an open question mid-sentence', () => {
      const purpose =
        'Bounds how often a failed delivery is retried. The exact retry budget is TBD pending the load tests.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report a word that merely starts with the marker', () => {
      const purpose = 'TBDs raised during design review are tracked in the linked issue.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report half of the generated sentence', () => {
      // The prefix alone is not the placeholder - the suffix must follow it, or
      // any Purpose mentioning archiving a change would be reported.
      const purpose = 'Explains what happens when archiving change my-change runs twice.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report an empty Purpose, which SPEC_PURPOSE_EMPTY already covers', () => {
      expect(findPurposePlaceholderIssue('', specWith(''))).toBeNull();
      expect(findPurposePlaceholderIssue('   \n  ', specWith(''))).toBeNull();
    });

    it('does not report an ordinary short Purpose, which PURPOSE_TOO_BRIEF covers', () => {
      expect(findPurposePlaceholderIssue('Does stuff.', specWith('Does stuff.'))).toBeNull();
    });
  });

  describe('locating the placeholder', () => {
    it('skips blank lines between the header and the text', () => {
      const content = ['# widgets Specification', '', '## Purpose', '', '', 'TBD', ''].join('\n');
      expect(findPurposePlaceholderIssue('TBD', content)).toEqual({ line: 6 });
    });

    it('counts lines the same way with CRLF endings', () => {
      const content = specWith(ARCHIVE_TEXT).replace(/\n/g, '\r\n');
      expect(findPurposePlaceholderIssue(ARCHIVE_TEXT, content)).toEqual({ line: 4 });
    });

    it('reports without a line rather than guessing when the section is empty', () => {
      // The parsed overview and the file disagree; report the finding, not a
      // line number pointing at the wrong text.
      const content = ['# widgets Specification', '', '## Purpose', '', '## Requirements', ''].join(
        '\n'
      );
      expect(findPurposePlaceholderIssue('TBD', content)).toEqual({ line: undefined });
    });

    it('reports without a line when no content is supplied', () => {
      expect(findPurposePlaceholderIssue('TBD')).toEqual({ line: undefined });
    });
  });
});
