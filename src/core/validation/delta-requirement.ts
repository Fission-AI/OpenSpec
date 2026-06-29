import { resolveSchemaForChange } from '../../utils/change-metadata.js';
import { resolveSchema, schemaProducesDeltaSpecs } from '../artifact-graph/index.js';

/**
 * Build a resolver that answers "does this change's schema require delta specs?"
 * — i.e. does the resolved schema produce delta specs (#997). The same predicate
 * gates the delta-spec requirement in both `openspec validate` and
 * `openspec archive`, so the two commands agree by construction.
 *
 * Results are memoized by schema name for the lifetime of the resolver, so a
 * bulk run does not re-read schema files per change.
 *
 * Fail-safe: if schema resolution throws (e.g. a malformed project schema),
 * default to requiring deltas — preserving today's strict behavior rather than
 * silently relaxing it. (Absent change metadata is NOT indeterminate; it
 * resolves to the default schema.)
 */
export function makeDeltaRequirementResolver(
  projectRoot: string
): (changeDir: string) => boolean {
  const cache = new Map<string, boolean>();
  return (changeDir: string): boolean => {
    const name = resolveSchemaForChange(changeDir, undefined, projectRoot);
    const cached = cache.get(name);
    if (cached !== undefined) return cached;
    let result: boolean;
    try {
      const schema = resolveSchema(name, projectRoot);
      result = schemaProducesDeltaSpecs(schema);
    } catch {
      result = true;
    }
    cache.set(name, result);
    return result;
  };
}
