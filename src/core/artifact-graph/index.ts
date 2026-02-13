// Types
export {
  ArtifactSchema,
  HookSchema,
  HooksSchema,
  SchemaYamlSchema,
  VALID_LIFECYCLE_POINTS,
  type Artifact,
  type Hook,
  type Hooks,
  type LifecyclePoint,
  type SchemaYaml,
  type CompletedSet,
  type BlockedArtifacts,
} from './types.js';

// Schema loading and validation
export { loadSchema, parseSchema, SchemaValidationError } from './schema.js';

// Graph operations
export { ArtifactGraph } from './graph.js';

// State detection
export { detectCompleted } from './state.js';

// Schema resolution
export {
  resolveSchema,
  listSchemas,
  listSchemasWithInfo,
  getSchemaDir,
  getPackageSchemasDir,
  getUserSchemasDir,
  SchemaLoadError,
  type SchemaInfo,
} from './resolver.js';

// Instruction loading
export {
  loadTemplate,
  loadChangeContext,
  generateInstructions,
  formatChangeStatus,
  resolveHooks,
  TemplateLoadError,
  type ChangeContext,
  type ArtifactInstructions,
  type DependencyInfo,
  type ArtifactStatus,
  type ChangeStatus,
  type ResolvedHook,
} from './instruction-loader.js';
