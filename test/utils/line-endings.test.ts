import { describe, expect, it } from 'vitest';
import {
  applyLineEnding,
  detectLineEnding,
  matchLineEnding,
} from '../../src/utils/line-endings.js';

describe('detectLineEnding', () => {
  it('reports LF for an LF file', () => {
    expect(detectLineEnding('a\nb\nc')).toBe('\n');
  });

  it('reports CRLF for a CRLF file', () => {
    expect(detectLineEnding('a\r\nb\r\nc')).toBe('\r\n');
  });

  it('reports undefined when there is no line break', () => {
    expect(detectLineEnding('single line')).toBeUndefined();
    expect(detectLineEnding('')).toBeUndefined();
  });

  it('does not count a CRLF as an LF', () => {
    // Two CRLF and no lone LF: a naive /\n/ count would see 2 of each and tie.
    expect(detectLineEnding('a\r\nb\r\nc')).toBe('\r\n');
  });

  it('picks the dominant ending in a mixed file', () => {
    expect(detectLineEnding('a\r\nb\r\nc\r\nd\ne')).toBe('\r\n');
    expect(detectLineEnding('a\nb\nc\nd\r\ne')).toBe('\n');
  });

  it('breaks a tie toward CRLF', () => {
    expect(detectLineEnding('a\r\nb\nc')).toBe('\r\n');
  });

  it('handles a lone CR without treating it as a line ending', () => {
    // A bare CR is not a line break this project emits; it must not be
    // mistaken for CRLF.
    expect(detectLineEnding('a\rb')).toBeUndefined();
  });
});

describe('applyLineEnding', () => {
  it('converts LF to CRLF', () => {
    expect(applyLineEnding('a\nb\n', '\r\n')).toBe('a\r\nb\r\n');
  });

  it('leaves LF alone when LF is requested', () => {
    expect(applyLineEnding('a\nb\n', '\n')).toBe('a\nb\n');
  });

  it('is idempotent on already-CRLF content', () => {
    expect(applyLineEnding('a\r\nb\r\n', '\r\n')).toBe('a\r\nb\r\n');
  });

  it('collapses mixed content to the requested ending', () => {
    expect(applyLineEnding('a\r\nb\nc', '\r\n')).toBe('a\r\nb\r\nc');
    expect(applyLineEnding('a\r\nb\nc', '\n')).toBe('a\nb\nc');
  });
});

describe('matchLineEnding', () => {
  it('restores CRLF from a CRLF original', () => {
    expect(matchLineEnding('x\ny\n', 'a\r\nb\r\n')).toBe('x\r\ny\r\n');
  });

  it('keeps LF from an LF original', () => {
    expect(matchLineEnding('x\ny\n', 'a\nb\n')).toBe('x\ny\n');
  });

  it('defaults to LF when the original has no line break', () => {
    expect(matchLineEnding('x\ny\n', 'single line')).toBe('x\ny\n');
    expect(matchLineEnding('x\ny\n', '')).toBe('x\ny\n');
  });
});
