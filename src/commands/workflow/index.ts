/**
 * Workflow CLI Commands
 *
 * Commands for the artifact-driven workflow: status, instructions, templates, schemas, new change.
 */

export { statusCommand } from './status.js';
export type { StatusOptions } from './status.js';

export { instructionsCommand, applyInstructionsCommand } from './instructions.js';
export type { InstructionsOptions } from './instructions.js';

export { templatesCommand } from './templates.js';
export type { TemplatesOptions } from './templates.js';

export { schemasCommand } from './schemas.js';
export type { SchemasOptions } from './schemas.js';

export { newChangeCommand } from './new-change.js';
export type { NewChangeOptions } from './new-change.js';

export { resolveChangeCommand } from './resolve-change.js';
export type { ResolveChangeOptions } from './resolve-change.js';

export { nextArtifactCommand } from './next-artifact.js';
export type { NextArtifactOptions } from './next-artifact.js';

export { markTaskDoneCommand } from './mark-task-done.js';
export type { MarkTaskDoneOptions } from './mark-task-done.js';

export { DEFAULT_SCHEMA } from './shared.js';
