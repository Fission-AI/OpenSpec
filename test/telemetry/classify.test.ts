import { describe, it, expect } from 'vitest';
import { classifyError } from '../../src/telemetry/classify.js';
import { ERROR_CLASSES, sanitizeProperties, setRegistryChecks } from '../../src/telemetry/properties.js';

setRegistryChecks({ isCommand: () => true, isTool: () => true });

function withDiagnostic(code: string, message = 'boom') {
  const error = new Error(message) as Error & { diagnostic: { code: string; message: string } };
  error.diagnostic = { code, message };
  return error;
}

describe('classifyError', () => {
  it('maps known diagnostic codes onto the allowlist', () => {
    expect(classifyError(withDiagnostic('unknown_item')).errorClass).toBe('item_not_found');
    expect(classifyError(withDiagnostic('no_openspec_root')).errorClass).toBe('no_root');
    expect(classifyError(withDiagnostic('archive_tasks_incomplete')).errorClass).toBe('archive_blocked');
    expect(classifyError(withDiagnostic('store_git_commit_failed')).errorClass).toBe('git_error');
    expect(classifyError(withDiagnostic('store_id_conflict')).errorClass).toBe('already_exists');
    expect(classifyError(withDiagnostic('store_registry_changed')).errorClass).toBe('concurrent_modification');
    expect(classifyError(withDiagnostic('workset_launch_failed')).errorClass).toBe('external_tool_failed');
    expect(classifyError(withDiagnostic('unknown_store_subcommand')).errorClass).toBe('unknown_subcommand');
  });

  it('treats a blocked precondition as user error, not our bug', () => {
    const result = classifyError(withDiagnostic('archive_validation_failed'));
    expect(result.outcome).toBe('user_error');
    expect(result.errorClass).toBe('validation_failed');
  });

  it('treats a store cancellation as cancelled', () => {
    expect(classifyError(withDiagnostic('store_setup_cancelled'))).toEqual({
      outcome: 'cancelled',
      errorClass: 'cancelled',
    });
  });

  it('never passes an unrecognized diagnostic code through', () => {
    // A code carrying user text still maps to a constant, so nothing leaks
    // even when a future code is shaped in a way this map did not anticipate.
    const familiar = classifyError(withDiagnostic('store_unreachable_at_/Users/jane/acme'));
    expect(familiar.errorClass).toBe('store_error');
    expect(JSON.stringify(sanitizeProperties({ error_class: familiar.errorClass }))).not.toContain('jane');

    // A code matching no map entry and no family prefix means a stale
    // classifier, not a crash — kept out of internal_error so that metric
    // still means "our bug".
    const foreign = classifyError(withDiagnostic('quux_failed_for_/Users/jane/acme'));
    expect(foreign.errorClass).toBe('unclassified');
    expect(foreign.outcome).toBe('user_error');
    expect(JSON.stringify(sanitizeProperties({ error_class: foreign.errorClass }))).not.toContain('jane');
  });

  it('classifies prompt cancellation', () => {
    const error = new Error('User force closed the prompt with SIGINT');
    error.name = 'ExitPromptError';
    expect(classifyError(error)).toEqual({ outcome: 'cancelled', errorClass: 'cancelled' });
  });

  it('classifies filesystem and network errnos', () => {
    const eacces = Object.assign(new Error('denied'), { code: 'EACCES' });
    expect(classifyError(eacces).errorClass).toBe('fs_error');
    const dns = Object.assign(new Error('dns'), { code: 'ENOTFOUND' });
    expect(classifyError(dns).errorClass).toBe('network_error');
    const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' });
    expect(classifyError(enoent).errorClass).toBe('item_not_found');
  });

  it('defaults an unclassifiable error to our problem', () => {
    expect(classifyError(new Error('Change "acme-billing" not found'))).toEqual({
      outcome: 'internal_error',
      errorClass: 'other',
    });
    expect(classifyError('a string')).toEqual({ outcome: 'internal_error', errorClass: 'other' });
    expect(classifyError(undefined)).toEqual({ outcome: 'internal_error', errorClass: 'other' });
  });

  it('never carries the error message', () => {
    const result = classifyError(new Error('Change "acme-billing-rewrite" not found at /Users/jane'));
    expect(JSON.stringify(result)).not.toContain('acme-billing-rewrite');
    expect(JSON.stringify(result)).not.toContain('jane');
  });

  it('only ever returns an allowlisted class', () => {
    const samples: unknown[] = [
      new Error('x'),
      withDiagnostic('store_path_missing'),
      withDiagnostic('totally_made_up'),
      Object.assign(new Error('y'), { code: 'EPERM' }),
      null,
      42,
    ];
    for (const sample of samples) {
      expect(ERROR_CLASSES).toContain(classifyError(sample).errorClass);
    }
  });
});
