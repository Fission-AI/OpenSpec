/**
 * Map a failure onto the bounded `error_class` allowlist.
 *
 * Diagnostic codes are mapped, never passed through. A code is developer-
 * authored today, but nothing in the type system guarantees a future one is
 * free of user text, and a passthrough would be exactly the hole the property
 * contract exists to close.
 *
 * An unrecognized failure is `other` with outcome `internal_error`, not
 * `user_error`. A failure we did not anticipate is our problem until shown
 * otherwise; biasing the other way would make the `internal_error` rate
 * under-report the thing it exists to surface.
 */
import type { ErrorClass, Outcome } from './properties.js';

/**
 * Exact diagnostic codes that do not follow their family's prefix rule, or
 * whose family maps to more than one class.
 */
const CODE_MAP: Readonly<Record<string, ErrorClass>> = {
  no_openspec_root: 'no_root',
  no_registered_stores: 'no_root',
  no_root_with_registered_stores: 'no_root',
  unhealthy_root: 'no_root',
  unhealthy_store_root: 'no_root',
  store_identity_mismatch: 'no_root',
  store_path_not_supported: 'no_root',
  invalid_store_pointer: 'no_root',

  unknown_item: 'item_not_found',
  ambiguous_item: 'ambiguous_item',
  store_not_found: 'item_not_found',
  unknown_store: 'item_not_found',
  workset_not_found: 'item_not_found',
  archive_change_not_found: 'item_not_found',

  unknown_subcommand: 'unknown_subcommand',
  unknown_store_subcommand: 'unknown_subcommand',
  unknown_workset_subcommand: 'unknown_subcommand',

  schema_not_found: 'schema_not_found',
  schema_invalid: 'schema_invalid',

  archive_validation_failed: 'validation_failed',
  archive_spec_validation_failed: 'validation_failed',
  invalid_validation_report_request: 'bad_usage',

  archive_change_name_required: 'not_interactive',
  archive_confirmation_required: 'not_interactive',
  store_register_identity_confirmation_required: 'not_interactive',
  store_remove_confirmation_required: 'not_interactive',
  workset_open_json_unsupported: 'not_interactive',

  store_setup_cancelled: 'cancelled',
  store_register_cancelled: 'cancelled',
  store_remove_cancelled: 'cancelled',
  workset_remove_cancelled: 'cancelled',

  store_id_conflict: 'already_exists',
  store_already_registered: 'already_exists',
  store_path_conflict: 'already_exists',
  archive_target_exists: 'already_exists',
  workset_exists: 'already_exists',

  store_registry_changed: 'concurrent_modification',
  store_registry_busy: 'concurrent_modification',
  workset_file_busy: 'concurrent_modification',
  store_checkout_drift: 'concurrent_modification',

  store_path_missing: 'fs_error',
  store_path_not_directory: 'fs_error',
  store_root_missing: 'fs_error',
  store_root_not_directory: 'fs_error',
  archive_path_outside_root: 'fs_error',
  archive_change_symlink: 'fs_error',

  store_metadata_missing: 'metadata_invalid',
  store_metadata_invalid: 'metadata_invalid',
  store_metadata_id_mismatch: 'metadata_invalid',
  invalid_store_metadata: 'metadata_invalid',
  invalid_store_registry: 'metadata_invalid',
  invalid_workset_file: 'metadata_invalid',
  invalid_opener_config: 'metadata_invalid',

  workset_launch_failed: 'external_tool_failed',
  workset_tool_unavailable: 'external_tool_failed',
  workset_tool_unknown: 'external_tool_failed',
  workset_cli_opener_disabled: 'external_tool_failed',
};

/** Prefix rules for the families that map uniformly. Order matters. */
const PREFIX_RULES: ReadonlyArray<readonly [string, ErrorClass]> = [
  ['store_git_', 'git_error'],
  ['store_remote_', 'git_error'],
  ['store_clone_', 'git_error'],
  ['archive_tasks_', 'archive_blocked'],
  ['archive_spec_update_', 'archive_blocked'],
  ['archive_', 'archive_blocked'],
  ['invalid_store_', 'store_error'],
  ['invalid_workset_', 'bad_usage'],
  ['store_setup_', 'store_error'],
  ['store_', 'store_error'],
  ['workset_', 'bad_usage'],
];

/** Node's own filesystem error codes. */
const FS_ERRNO = new Set(['EACCES', 'EPERM', 'EISDIR', 'ENOTDIR', 'EROFS', 'EMFILE', 'ENOSPC']);
const NETWORK_ERRNO = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENETUNREACH',
]);

function classifyCode(code: string): ErrorClass | undefined {
  const mapped = CODE_MAP[code];
  if (mapped) {
    return mapped;
  }
  for (const [prefix, errorClass] of PREFIX_RULES) {
    if (code.startsWith(prefix)) {
      return errorClass;
    }
  }
  return undefined;
}

function readDiagnosticCode(error: unknown): string | undefined {
  const code = (error as { diagnostic?: { code?: unknown } })?.diagnostic?.code;
  return typeof code === 'string' ? code : undefined;
}

function readErrno(error: unknown): string | undefined {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
}

export interface Classification {
  outcome: Outcome;
  errorClass: ErrorClass;
}

export function classifyError(error: unknown): Classification {
  // Ctrl-C at a prompt is the user's choice, not a failure. Matched the same
  // way `isPromptCancellationError` does, without importing it: this module
  // stays free of the command layer's import graph.
  const name = (error as { name?: unknown })?.name;
  const message = error instanceof Error ? error.message : '';
  if (name === 'ExitPromptError' || name === 'AbortPromptError' || message.includes('force closed the prompt')) {
    return { outcome: 'cancelled', errorClass: 'cancelled' };
  }

  const diagnosticCode = readDiagnosticCode(error);
  if (diagnosticCode) {
    const mapped = classifyCode(diagnosticCode);
    if (mapped) {
      return {
        outcome: mapped === 'cancelled' ? 'cancelled' : 'user_error',
        errorClass: mapped,
      };
    }
    // A code we do not recognize tells us nothing safe, and the raw code never
    // leaves this function.
    return { outcome: 'internal_error', errorClass: 'other' };
  }

  const errno = readErrno(error);
  if (errno) {
    if (FS_ERRNO.has(errno)) return { outcome: 'user_error', errorClass: 'fs_error' };
    if (NETWORK_ERRNO.has(errno)) return { outcome: 'user_error', errorClass: 'network_error' };
    if (errno === 'ENOENT') return { outcome: 'user_error', errorClass: 'item_not_found' };
  }

  const constructorName = (error as { constructor?: { name?: string } })?.constructor?.name;
  switch (constructorName) {
    case 'SchemaValidationError':
      return { outcome: 'user_error', errorClass: 'schema_invalid' };
    case 'SchemaLoadError':
    case 'TemplateLoadError':
      return { outcome: 'user_error', errorClass: 'schema_not_found' };
    case 'ChangeMetadataError':
      return { outcome: 'user_error', errorClass: 'metadata_invalid' };
    default:
      break;
  }

  return { outcome: 'internal_error', errorClass: 'other' };
}

/** A command that failed a check it ran correctly — never an internal error. */
export function classifyCheckFailure(errorClass: ErrorClass): Classification {
  return { outcome: 'user_error', errorClass };
}
