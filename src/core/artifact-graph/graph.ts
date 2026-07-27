import type { Artifact, SchemaYaml, CompletedSet, BlockedArtifacts } from './types.js';
import { loadSchema, parseSchema } from './schema.js';

/**
 * Represents an artifact dependency graph.
 * Provides methods for querying build order, ready artifacts, and completion status.
 */
export class ArtifactGraph {
  private artifacts: Map<string, Artifact>;
  private schema: SchemaYaml;
  /** Artifact id -> its position in the schema's `artifacts:` list. */
  private declarationOrder: Map<string, number>;

  private constructor(schema: SchemaYaml) {
    this.schema = schema;
    this.artifacts = new Map(schema.artifacts.map(a => [a.id, a]));
    this.declarationOrder = new Map(schema.artifacts.map((a, index) => [a.id, index]));
  }

  /**
   * Orders artifact ids by where the schema declares them.
   *
   * The dependency graph leaves siblings tied - spec-driven's `specs` and
   * `design` both require only `proposal`, so both become ready at the same
   * time. Ties used to be broken alphabetically, which put `design` ahead of
   * `specs` and made the CLI recommend the artifacts in an order that
   * contradicted the schema's own documented sequence
   * (proposal -> specs -> design -> tasks). Breaking ties by declaration order
   * follows the sequence the schema author wrote, for built-in and custom
   * schemas alike, and stays just as deterministic. Ids not in the schema sort
   * last so the comparator stays total.
   */
  private compareByDeclarationOrder = (a: string, b: string): number =>
    (this.declarationOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
    (this.declarationOrder.get(b) ?? Number.MAX_SAFE_INTEGER);

  /**
   * Creates an ArtifactGraph from a YAML file path.
   */
  static fromYaml(filePath: string): ArtifactGraph {
    const schema = loadSchema(filePath);
    return new ArtifactGraph(schema);
  }

  /**
   * Creates an ArtifactGraph from YAML content string.
   */
  static fromYamlContent(yamlContent: string): ArtifactGraph {
    const schema = parseSchema(yamlContent);
    return new ArtifactGraph(schema);
  }

  /**
   * Creates an ArtifactGraph from a pre-validated schema object.
   */
  static fromSchema(schema: SchemaYaml): ArtifactGraph {
    return new ArtifactGraph(schema);
  }

  /**
   * Gets a single artifact by ID.
   */
  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  /**
   * Gets all artifacts in the graph.
   */
  getAllArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * Gets the schema name.
   */
  getName(): string {
    return this.schema.name;
  }

  /**
   * Gets the schema version.
   */
  getVersion(): number {
    return this.schema.version;
  }

  /**
   * Computes the topological build order using Kahn's algorithm.
   * Returns artifact IDs in the order they should be built.
   */
  getBuildOrder(): string[] {
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    // Initialize all artifacts
    for (const artifact of this.artifacts.values()) {
      inDegree.set(artifact.id, artifact.requires.length);
      dependents.set(artifact.id, []);
    }

    // Build reverse adjacency (who depends on whom)
    for (const artifact of this.artifacts.values()) {
      for (const req of artifact.requires) {
        dependents.get(req)!.push(artifact.id);
      }
    }

    // Start with roots (in-degree 0), in declaration order for determinism
    const queue = [...this.artifacts.keys()]
      .filter(id => inDegree.get(id) === 0)
      .sort(this.compareByDeclarationOrder);

    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Collect newly ready artifacts, then sort before adding
      const newlyReady: string[] = [];
      for (const dep of dependents.get(current)!) {
        const newDegree = inDegree.get(dep)! - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          newlyReady.push(dep);
        }
      }
      // Re-sort the whole queue, not just the new arrivals: an artifact that
      // has been waiting can be declared after one that just became ready.
      queue.push(...newlyReady);
      queue.sort(this.compareByDeclarationOrder);
    }

    return result;
  }

  /**
   * Gets artifacts that are ready to be created (all dependencies completed).
   */
  getNextArtifacts(completed: CompletedSet): string[] {
    const ready: string[] = [];

    for (const artifact of this.artifacts.values()) {
      if (completed.has(artifact.id)) {
        continue; // Already completed
      }

      const allDepsCompleted = artifact.requires.every(req => completed.has(req));
      if (allDepsCompleted) {
        ready.push(artifact.id);
      }
    }

    // Declaration order: deterministic, and the first entry is the artifact the
    // schema wants written next.
    return ready.sort(this.compareByDeclarationOrder);
  }

  /**
   * Checks if all artifacts in the graph are completed.
   */
  isComplete(completed: CompletedSet): boolean {
    for (const artifact of this.artifacts.values()) {
      if (!completed.has(artifact.id)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets blocked artifacts and their unmet dependencies.
   */
  getBlocked(completed: CompletedSet): BlockedArtifacts {
    const blocked: BlockedArtifacts = {};

    for (const artifact of this.artifacts.values()) {
      if (completed.has(artifact.id)) {
        continue; // Already completed
      }

      const unmetDeps = artifact.requires.filter(req => !completed.has(req));
      if (unmetDeps.length > 0) {
        blocked[artifact.id] = unmetDeps.sort(this.compareByDeclarationOrder);
      }
    }

    return blocked;
  }
}
