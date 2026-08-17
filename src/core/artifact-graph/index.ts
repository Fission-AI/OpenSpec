// Types
export {
  ArtifactSchema,
  SchemaOverrideYamlSchema,
  SchemaYamlSchema,
  type Artifact,
  type SchemaOverrideYaml,
  type SchemaYaml,
  type StringCollectionOverride,
  type TextOverrideOperation,
  type CompletedSet,
  type BlockedArtifacts,
} from './types.js';

// Schema loading and validation
export {
  applySchemaOverride,
  loadSchema,
  parseSchema,
  parseSchemaOverride,
  validateSchemaValue,
  SchemaOverrideValidationError,
  SchemaValidationError,
} from './schema.js';

// Graph operations
export { ArtifactGraph } from './graph.js';

// State detection
export { detectCompleted } from './state.js';
export {
  artifactOutputExists,
  isGlobPattern,
  resolveArtifactOutputPath,
  resolveArtifactOutputs,
} from './outputs.js';

// Schema resolution
export {
  resolveSchema,
  listSchemas,
  listSchemasWithInfo,
  getSchemaDir,
  getPackageSchemasDir,
  getUserSchemasDir,
  getProjectSchemasDir,
  resolveSchemaSources,
  resolveSchemaTemplate,
  SCHEMA_FILE_NAME,
  SCHEMA_OVERRIDE_FILE_NAME,
  SchemaLoadError,
  type ResolvedSchemaSources,
  type ResolvedTemplate,
  type SchemaOverlayLocation,
  type SchemaResolutionMode,
  type SchemaSource,
  type SchemaSourceLocation,
  type SchemaTemplateRoot,
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
  type LoadChangeContextOptions,
  type ArtifactInstructions,
  type DependencyInfo,
  type ArtifactStatus,
  type ChangeStatus,
  type ArtifactPathSummary,
} from './instruction-loader.js';
export type {
  PlanningHomeSummary,
  ActionContext,
} from '../change-status-policy.js';
