import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeProperties,
  setRegistryChecks,
  bucketCount,
  bucketToolCount,
  bucketDuration,
  bucketExitCode,
  bucketTimeToReach,
  bucketNodeMajor,
  bucketPlatform,
  isEventName,
  PROPERTY_KEYS,
  ERROR_CLASSES,
} from '../../src/telemetry/properties.js';

const RUN_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

beforeEach(() => {
  setRegistryChecks({
    isCommand: (value) => ['archive', 'change:validate', 'init'].includes(value),
    isTool: (value) => ['claude', 'cursor'].includes(value),
  });
});

describe('sanitizeProperties', () => {
  it('keeps allowlisted properties', () => {
    expect(
      sanitizeProperties({
        command: 'archive',
        outcome: 'success',
        error_class: 'none',
        exit_code: '0',
        duration: '2_100-500ms',
        stdout_tty: true,
        run_id: RUN_ID,
        $ip: null,
      })
    ).toEqual({
      command: 'archive',
      outcome: 'success',
      error_class: 'none',
      exit_code: '0',
      duration: '2_100-500ms',
      stdout_tty: true,
      run_id: RUN_ID,
      $ip: null,
    });
  });

  it('drops a key built from a user-authored name', () => {
    // The hole a value-only contract would leave: the value is a boolean, and
    // the user's schema name still ships in the key.
    const clean = sanitizeProperties({
      outcome: 'success',
      'schema:acme-internal': true,
      'change:billing-rewrite': 1,
    });
    expect(clean).toEqual({ outcome: 'success' });
    expect(JSON.stringify(clean)).not.toContain('acme-internal');
    expect(JSON.stringify(clean)).not.toContain('billing-rewrite');
  });

  it('drops an allowlisted key holding an out-of-set value', () => {
    expect(
      sanitizeProperties({
        outcome: 'exploded',
        error_class: 'store_unreachable_at_/Users/jane/work',
        platform: 'sunos',
        command: 'archive',
      })
    ).toEqual({ command: 'archive' });
  });

  it('never lets a raw exit code or duration through', () => {
    expect(sanitizeProperties({ exit_code: 137, duration: 41822 })).toEqual({});
  });

  it('keeps the event sendable when a property is dropped', () => {
    const clean = sanitizeProperties({ outcome: 'success', bogus: 'x' });
    expect(clean.outcome).toBe('success');
  });

  it('drops undefined values rather than sending null', () => {
    expect(sanitizeProperties({ outcome: 'success', changes: undefined })).toEqual({
      outcome: 'success',
    });
  });

  it('checks command and tool ids for registry membership', () => {
    expect(sanitizeProperties({ command: 'archive' })).toEqual({ command: 'archive' });
    expect(sanitizeProperties({ command: 'unknown' })).toEqual({ command: 'unknown' });
    expect(sanitizeProperties({ command: 'rm -rf /' })).toEqual({});
    expect(sanitizeProperties({ tool: 'cursor' })).toEqual({ tool: 'cursor' });
    expect(sanitizeProperties({ tool: 'acme-internal-agent' })).toEqual({});
  });

  it('rejects a run id that is not a uuid', () => {
    expect(sanitizeProperties({ run_id: '/Users/jane/project' })).toEqual({});
  });

  it('accepts only null for $ip', () => {
    expect(sanitizeProperties({ $ip: '203.0.113.4' })).toEqual({});
  });
});

describe('event names', () => {
  it('rejects a name built from a runtime value', () => {
    expect(isEventName('milestone_reached')).toBe(true);
    expect(isEventName('milestone_reached:acme-billing')).toBe(false);
  });
});

describe('buckets', () => {
  it('buckets counts', () => {
    expect(bucketCount(0)).toBe('00');
    expect(bucketCount(3)).toBe('01-03');
    expect(bucketCount(11)).toBe('11-30');
    expect(bucketCount(3500)).toBe('31+');
  });

  it('buckets tool counts', () => {
    expect(bucketToolCount(0)).toBe('0');
    expect(bucketToolCount(1)).toBe('1');
    expect(bucketToolCount(3)).toBe('2-3');
    expect(bucketToolCount(9)).toBe('4+');
  });

  it('buckets durations', () => {
    expect(bucketDuration(0)).toBe('1_under_100ms');
    expect(bucketDuration(499)).toBe('2_100-500ms');
    expect(bucketDuration(1999)).toBe('3_500ms-2s');
    expect(bucketDuration(60_000)).toBe('5_over_10s');
  });

  it('buckets exit codes, including passed-through child codes', () => {
    expect(bucketExitCode(undefined)).toBe('0');
    expect(bucketExitCode(0)).toBe('0');
    expect(bucketExitCode(1)).toBe('1');
    expect(bucketExitCode(130)).toBe('130');
    // workset open returns the editor's status; feedback returns gh's.
    expect(bucketExitCode(137)).toBe('other');
    expect(bucketExitCode(2)).toBe('other');
  });

  it('buckets time to reach a milestone', () => {
    const h = 3_600_000;
    expect(bucketTimeToReach(0)).toBe('1_under_1h');
    expect(bucketTimeToReach(2 * h)).toBe('2_1-24h');
    expect(bucketTimeToReach(72 * h)).toBe('3_1-7d');
    expect(bucketTimeToReach(24 * h * 20)).toBe('4_8-30d');
    expect(bucketTimeToReach(24 * h * 400)).toBe('5_over_30d');
  });

  it('buckets node majors and platforms', () => {
    expect(bucketNodeMajor('v22.11.0')).toBe('22');
    expect(bucketNodeMajor('v23.0.0-nightly')).toBe('other');
    expect(bucketPlatform('darwin')).toBe('darwin');
    expect(bucketPlatform('sunos')).toBe('other');
  });
});

describe('allowlist shape', () => {
  it('declares no property key that looks user-authored', () => {
    for (const key of PROPERTY_KEYS) {
      expect(key).toMatch(/^[$a-z_]+$/);
    }
  });

  it('classifies an unmapped failure as other', () => {
    expect(ERROR_CLASSES).toContain('other');
    expect(ERROR_CLASSES).toContain('none');
  });
});
