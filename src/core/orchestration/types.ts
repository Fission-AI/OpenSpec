/**
 * Orchestration Hints Types
 *
 * CLI-native orchestration hints that declare WHAT can be parallel.
 * The AI harness decides HOW to parallelize.
 */

/** A group of tasks that can run in parallel (intra-group). */
export interface TaskGroup {
  /** Group number (from ## N. section header). */
  id: number;
  /** Task IDs belonging to this group. */
  tasks: string[];
  /** Whether tasks within this group can run in parallel. */
  parallel: boolean;
  /** Domain-to-task-IDs mapping for --teams mode. */
  domains?: Record<string, string[]>;
  /** Group IDs this group depends on. Default: [id - 1]. */
  depends_on: number[];
}

/** Orchestration info for gates at a specific phase. */
export interface GateOrchestration {
  /** Phase: pre or post gates. */
  phase: 'pre' | 'post';
  /** Parallel gate groups. */
  groups: ParallelGroup[];
}

/** Orchestration info for hooks at a specific hook point. */
export interface HookOrchestration {
  /** Hook point (e.g., "apply.post"). */
  hook_point: string;
  /** Parallel hook groups. */
  groups: ParallelGroup[];
}

/** A group of gates or hooks that can run in parallel. */
export interface ParallelGroup {
  /** IDs of gates or hooks in this group. */
  ids: string[];
  /** Whether this group runs in parallel. */
  parallel: boolean;
  /** Suggested orchestration mode. */
  mode?: 'default' | 'subagents' | 'teams';
  /** Synthesis strategy for combining results. */
  synthesis?: 'require-both-pass' | 'any-pass' | 'majority';
  /** Where this decision came from. */
  resolved_from?: 'plugin' | 'schema' | 'schema+plugin_merge';
}

/** Source tracking for how orchestration was resolved. */
export interface OrchestrationSource {
  /** Where the mode came from. */
  mode_from: 'user_flag' | 'schema' | 'plugin' | 'default';
  /** Where the groups came from. */
  groups_from: 'schema' | 'plugin' | 'schema+plugin_merge' | 'default';
}

/** Complete orchestration hints included in instructions JSON output. */
export interface OrchestrationHints {
  /** User-selected mode, or null if not specified. */
  mode: 'default' | 'subagents' | 'teams' | null;
  /** Source tracking. */
  source: OrchestrationSource;
  /** Task parallel groups with domain mapping. */
  task_groups: TaskGroup[];
  /** Gate parallel groups by phase. */
  gate_groups: GateOrchestration[];
  /** Hook parallel groups by hook point. */
  hook_groups: HookOrchestration[];
  /** Warnings from resolution (e.g., unidirectional parallel_with). */
  warnings: string[];
}

/** Result of the two-layer resolution algorithm. */
export interface ResolvedOrchestration {
  /** Resolved parallel groups. */
  groups: ParallelGroup[];
  /** Warnings emitted during resolution. */
  warnings: string[];
}
