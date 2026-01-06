// Types
export {
  ArtifactSchema,
  SchemaYamlSchema,
  type Artifact,
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
  TemplateLoadError,
  type ChangeContext,
  type ArtifactInstructions,
  type DependencyInfo,
  type ArtifactStatus,
  type ChangeStatus,
} from './instruction-loader.js';
