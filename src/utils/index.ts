// Shared utilities
export { validateChangeName, createChange } from './change-utils.js';
export type { ValidationResult, CreateChangeOptions } from './change-utils.js';

// Change metadata utilities
export {
  readChangeMetadata,
  writeChangeMetadata,
  resolveSchemaForChange,
  validateSchemaName,
  ChangeMetadataError,
} from './change-metadata.js';

// File system utilities
export { FileSystemUtils, removeMarkerBlock } from './file-system.js';

// Command reference utilities
export { transformToHyphenCommands } from './command-references.js';