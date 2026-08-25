// 共享工具
export { validateChangeName, createChange } from './change-utils.js';
export type { ValidationResult, CreateChangeOptions } from './change-utils.js';

// change 元数据工具
export {
  readChangeMetadata,
  writeChangeMetadata,
  resolveSchemaForChange,
  validateSchemaName,
  ChangeMetadataError,
} from './change-metadata.js';

// 文件系统工具
export { FileSystemUtils, removeMarkerBlock } from './file-system.js';

// 命令引用工具
export {
  transformCommandInvocations,
  transformToSkillReferences,
  getSkillReferenceTransformer,
  getTransformerForTool,
} from './command-references.js';