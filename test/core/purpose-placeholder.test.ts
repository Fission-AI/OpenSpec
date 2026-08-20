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

    it('reports a bare TODO, the other word for the same non-answer', () => {
      expect(findPurposePlaceholderIssue('TODO', specWith('TODO'))).toEqual({ line: 4 });
    });

    it('reports a TODO opening a longer placeholder sentence', () => {
      const purpose = 'TODO: describe what this capability is for.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 4 });
    });

    it('ignores case in a leading TODO too', () => {
      const purpose = 'todo - write this later';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).not.toBeNull();
    });

    it('reports the archive sentence even when it does not open the Purpose', () => {
      // Someone typed a line above the placeholder and left it in place. The
      // sentence is archive's own output wherever it sits, so it still counts.
      const purpose = `Handles widget retries.\n\n${ARCHIVE_TEXT}`;
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).not.toBeNull();
    });

    it('names the placeholder line, not the prose above it', () => {
      // The warning says "this Purpose is still the placeholder". Pointing at a
      // line the reader can see is fine reads as the check being wrong.
      const purpose = `Handles widget retries.\n\n${ARCHIVE_TEXT}`;
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 6 });
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

    it('does not report a word that merely starts with TODO', () => {
      const purpose = 'TODOs raised during design review are tracked in the linked issue.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report a TODO raised mid-sentence', () => {
      const purpose =
        'Bounds how often a failed delivery is retried. Tuning the budget is a TODO for the load tests.';
      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report the generated sentence when only its opening half is present', () => {
      // Quoting the placeholder's opening is not carrying the placeholder. The
      // suffix has to follow the prefix, or a Purpose that documents the message
      // archive writes would be reported as being that message.
      const purpose = `Explains the ${PURPOSE_PLACEHOLDER_PREFIX}<name> message archive writes, and how to replace it.`;
      expect(purpose).toContain(PURPOSE_PLACEHOLDER_PREFIX);
      expect(purpose).not.toContain(PURPOSE_PLACEHOLDER_SUFFIX);

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

  describe('reads fenced code as quoted material, not as the Purpose', () => {
    const fenced = (body: string) => ['```', body, '```'].join('\n');

    it('does not report a Purpose that quotes the generated sentence in a fence', () => {
      // A spec documenting the placeholder carries the sentence without being
      // it. Reporting that is the check failing the one document that explains
      // what it is for.
      const purpose = [
        'Documents the Purpose `openspec archive` writes for a new capability:',
        '',
        fenced(ARCHIVE_TEXT),
      ].join('\n');

      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report a fenced marker that opens the fence but not the Purpose', () => {
      const purpose = ['Shows the marker an unfinished spec carries:', '', fenced('TBD')].join('\n');

      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('does not report a tilde fence either, since both spellings are fences', () => {
      const purpose = ['Documents the placeholder:', '', '~~~', ARCHIVE_TEXT, '~~~'].join('\n');

      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toBeNull();
    });

    it('still reports a placeholder that sits outside the fence', () => {
      // The exemption is for what a fence contains, not for a Purpose that
      // happens to contain a fence.
      const purpose = [fenced('an unrelated example'), '', ARCHIVE_TEXT].join('\n');

      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 8 });
    });

    it('names the unfenced line, skipping a fenced copy above it', () => {
      const purpose = [fenced(ARCHIVE_TEXT), '', ARCHIVE_TEXT].join('\n');

      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 8 });
    });

    it('finds the real Purpose header, not one quoted in a fence above it', () => {
      // A spec whose preamble shows what a spec looks like has a `## Purpose`
      // in it that is not this spec's. Starting the scan there walks straight
      // into the real header and reports no line at all.
      const content = [
        '# widgets Specification',
        '',
        'Every capability spec opens like this:',
        '',
        '```',
        '## Purpose',
        'TBD',
        '```',
        '',
        '## Purpose',
        ARCHIVE_TEXT,
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

      expect(findPurposePlaceholderIssue(ARCHIVE_TEXT, content)).toEqual({ line: 11 });
    });

    it('does not let a fenced heading end the Purpose section early', () => {
      // `## Requirements` inside a fence is an example of a spec, not the start
      // of this one's requirements - so the locator must read past it.
      const purpose = [fenced('## Requirements'), '', ARCHIVE_TEXT].join('\n');

      expect(findPurposePlaceholderIssue(purpose, specWith(purpose))).toEqual({ line: 8 });
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

  // Every position a placeholder can occupy in a Purpose, and the line the
  // warning should name for it. `specWith` puts the Purpose body at line 4, so
  // the expected line is 4 plus however many lines precede the placeholder
  // inside the body.
  describe('the reported line follows the placeholder, wherever it sits', () => {
    const cases: Array<{ name: string; purpose: string; line: number }> = [
      {
        name: 'generated sentence alone — the shape archive writes',
        purpose: ARCHIVE_TEXT,
        line: 4,
      },
      {
        name: 'generated sentence one blank line below a sentence of prose',
        purpose: `Handles widget retries.\n\n${ARCHIVE_TEXT}`,
        line: 6,
      },
      {
        name: 'generated sentence below two lines of prose',
        purpose: `Handles widget retries.\nAcross every transport.\n\n${ARCHIVE_TEXT}`,
        line: 7,
      },
      {
        name: 'bare TBD an agent left behind',
        purpose: 'TBD',
        line: 4,
      },
      {
        name: 'both markers — the earliest is what a reader meets first',
        purpose: `TBD, pending a rewrite.\n\n${ARCHIVE_TEXT}`,
        line: 4,
      },
      {
        name: 'generated sentence rewrapped across two lines by a formatter',
        purpose: 'TBD - created by archiving\nchange c1. Update Purpose after archive.',
        line: 4,
      },
    ];

    for (const { name, purpose, line } of cases) {
      it(name, () => {
        const content = specWith(purpose);
        // Guard the fixture itself: the expected line must really carry the
        // placeholder, or the test would pin a number rather than a behaviour.
        const onThatLine = content.split('\n')[line - 1];
        expect(onThatLine.startsWith('TBD')).toBe(true);

        expect(findPurposePlaceholderIssue(purpose, content)).toEqual({ line });
      });
    }
  });
});
