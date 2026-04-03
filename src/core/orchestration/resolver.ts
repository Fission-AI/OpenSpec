/**
 * Orchestration Resolver
 *
 * Two-layer merge: reads plugin `parallel_with` declarations and schema
 * `orchestration.parallel_groups`, merges with resolution matrix.
 *
 * Resolution rules:
 * - Schema always wins over plugin declarations.
 * - Plugin `parallel_with` must be bidirectional (A declares B AND B declares A).
 * - Unidirectional declarations emit warnings.
 * - Schema can force parallel even without plugin declarations.
 */

import type { LoadedPlugin } from '../plugin/types.js';
import type { SchemaParallelGroup } from '../artifact-graph/types.js';
import type { ParallelGroup, ResolvedOrchestration } from './types.js';

/**
 * Resolve orchestration from plugin declarations and schema overrides.
 *
 * @param plugins - Loaded plugins with gate/hook orchestration declarations
 * @param schemaGroups - Optional parallel_groups from schema orchestration section
 * @param itemType - Whether we're resolving gates or hooks
 * @returns Resolved orchestration with groups and warnings
 */
export function resolveOrchestration(
  plugins: LoadedPlugin[],
  schemaGroups?: SchemaParallelGroup[],
  itemType: 'gates' | 'hooks' = 'gates'
): ResolvedOrchestration {
  const warnings: string[] = [];

  // If schema defines parallel_groups, schema wins entirely
  if (schemaGroups && schemaGroups.length > 0) {
    const groups = resolveFromSchema(schemaGroups, plugins, itemType, warnings);
    return { groups, warnings };
  }

  // Otherwise, derive from plugin declarations
  const groups = resolveFromPlugins(plugins, itemType, warnings);
  return { groups, warnings };
}

/**
 * Resolve parallel groups from schema definitions.
 * Schema always wins, but we validate that referenced items exist in plugins.
 */
function resolveFromSchema(
  schemaGroups: SchemaParallelGroup[],
  plugins: LoadedPlugin[],
  itemType: 'gates' | 'hooks',
  warnings: string[]
): ParallelGroup[] {
  const allItemIds = collectItemIds(plugins, itemType);
  const result: ParallelGroup[] = [];

  for (const sg of schemaGroups) {
    const ids = itemType === 'gates' ? (sg.gates ?? []) : (sg.hooks ?? []);
    if (ids.length === 0) continue;

    // Warn about referenced items not found in any plugin
    for (const id of ids) {
      if (!allItemIds.has(id)) {
        warnings.push(
          `Schema references ${itemType.slice(0, -1)} "${id}" but no plugin provides it`
        );
      }
    }

    // Check if plugin declarations agree with schema grouping
    const pluginGroups = resolveFromPlugins(plugins, itemType, []);
    if (pluginGroups.length > 0) {
      // Schema overrides plugin — note if they conflict
      const pluginGroupIds = new Set(pluginGroups.flatMap((g) => g.ids));
      const overlap = ids.filter((id) => pluginGroupIds.has(id));
      if (overlap.length > 0 && sg.parallel !== pluginGroups[0]?.parallel) {
        warnings.push(
          `Schema overrides plugin parallel declaration for: ${overlap.join(', ')}`
        );
      }
    }

    result.push({
      ids,
      parallel: sg.parallel,
      mode: sg.mode,
      synthesis: sg.synthesis,
      resolved_from: 'schema',
    });
  }

  return result;
}

/**
 * Resolve parallel groups from plugin declarations.
 * Requires bidirectional parallel_with for a valid parallel group.
 */
function resolveFromPlugins(
  plugins: LoadedPlugin[],
  itemType: 'gates' | 'hooks',
  warnings: string[]
): ParallelGroup[] {
  // Collect all items with their orchestration declarations
  const items = collectItemsWithOrchestration(plugins, itemType);

  if (items.length === 0) return [];

  // Build adjacency: which items declare parallel_with each other
  const parallelDecls = new Map<string, Set<string>>();
  for (const item of items) {
    if (item.orchestration?.parallel_with) {
      parallelDecls.set(item.id, new Set(item.orchestration.parallel_with));
    }
  }

  // Find bidirectional pairs
  const processed = new Set<string>();
  const groups: ParallelGroup[] = [];

  for (const [id, partners] of parallelDecls) {
    if (processed.has(id)) continue;

    const group = new Set<string>([id]);

    for (const partnerId of partners) {
      const partnerDecl = parallelDecls.get(partnerId);
      if (partnerDecl && partnerDecl.has(id)) {
        // Bidirectional — valid parallel pair
        group.add(partnerId);
      } else if (!partnerDecl || !partnerDecl.has(id)) {
        // Unidirectional — emit warning
        warnings.push(
          `Unidirectional parallel_with: "${id}" declares parallel with "${partnerId}" but "${partnerId}" does not declare parallel with "${id}"`
        );
      }
    }

    if (group.size > 1) {
      // Find preferred mode (use first non-default if available)
      const mode = findPreferredMode(items, group);

      groups.push({
        ids: Array.from(group).sort(),
        parallel: true,
        mode,
        resolved_from: 'plugin',
      });

      for (const gid of group) {
        processed.add(gid);
      }
    }
  }

  return groups;
}

/**
 * Collect all item IDs from plugins.
 */
function collectItemIds(plugins: LoadedPlugin[], itemType: 'gates' | 'hooks'): Set<string> {
  const ids = new Set<string>();
  for (const plugin of plugins) {
    if (itemType === 'gates') {
      for (const gate of plugin.manifest.gates ?? []) {
        ids.add(gate.id);
      }
    } else {
      for (const hookPoint of Object.values(plugin.manifest.hooks ?? {})) {
        if (hookPoint) {
          for (const hook of hookPoint) {
            ids.add(hook.id);
          }
        }
      }
    }
  }
  return ids;
}

interface ItemWithOrchestration {
  id: string;
  orchestration?: { parallel_with?: string[]; preferred_mode?: string };
}

/**
 * Collect items with their orchestration declarations.
 */
function collectItemsWithOrchestration(
  plugins: LoadedPlugin[],
  itemType: 'gates' | 'hooks'
): ItemWithOrchestration[] {
  const items: ItemWithOrchestration[] = [];
  for (const plugin of plugins) {
    if (itemType === 'gates') {
      for (const gate of plugin.manifest.gates ?? []) {
        items.push({ id: gate.id, orchestration: gate.orchestration });
      }
    } else {
      for (const hookPoint of Object.values(plugin.manifest.hooks ?? {})) {
        if (hookPoint) {
          for (const hook of hookPoint) {
            items.push({ id: hook.id, orchestration: hook.orchestration });
          }
        }
      }
    }
  }
  return items;
}

/**
 * Find the preferred orchestration mode from a group of items.
 */
function findPreferredMode(
  items: ItemWithOrchestration[],
  groupIds: Set<string>
): 'default' | 'subagents' | 'teams' | undefined {
  for (const item of items) {
    if (groupIds.has(item.id) && item.orchestration?.preferred_mode) {
      return item.orchestration.preferred_mode as 'default' | 'subagents' | 'teams';
    }
  }
  return undefined;
}
