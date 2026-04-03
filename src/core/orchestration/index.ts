/**
 * Orchestration Module Public API
 *
 * Exports the core functions for building task groups, parsing domain tags,
 * and resolving orchestration hints.
 */

// Group builder
export { buildTaskGroups } from './group-builder.js';

// Domain parser
export { parseDomainTags, enrichGroupsWithDomains } from './domain-parser.js';

// Resolver
export { resolveOrchestration } from './resolver.js';

// Types
export type {
  TaskGroup,
  GateOrchestration,
  HookOrchestration,
  ParallelGroup,
  OrchestrationHints,
  OrchestrationSource,
  ResolvedOrchestration,
} from './types.js';
