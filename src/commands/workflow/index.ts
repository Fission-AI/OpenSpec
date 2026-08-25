/**
 * Workflow CLI 命令
 *
 * 制品驱动的工作流命令：status、instructions、templates、schemas、new change。
 */

export { statusCommand } from './status.js';
export type { StatusOptions } from './status.js';

export {
  instructionsCommand,
  applyInstructionsCommand,
  archiveInstructionsCommand,
} from './instructions.js';
export type { InstructionsOptions } from './instructions.js';

export { templatesCommand } from './templates.js';
export type { TemplatesOptions } from './templates.js';

export { schemasCommand } from './schemas.js';
export type { SchemasOptions } from './schemas.js';

export { newChangeCommand } from './new-change.js';
export type { NewChangeOptions } from './new-change.js';

export { DEFAULT_SCHEMA } from './shared.js';
