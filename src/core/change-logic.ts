import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { writeChangeMetadata, validateSchemaName } from '../utils/change-metadata.js';
import { validateChangeName } from '../utils/change-utils.js';
import { resolveOpenSpecDir } from './path-resolver.js';

const DEFAULT_SCHEMA = 'spec-driven';

export interface CreateChangeResult {
  name: string;
  changeDir: string;
  schema: string;
}

export async function runCreateChange(
  projectRoot: string,
  name: string,
  options: { schema?: string } = {}
): Promise<CreateChangeResult> {
  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const schemaName = options.schema ?? DEFAULT_SCHEMA;
  validateSchemaName(schemaName);

  const openspecPath = await resolveOpenSpecDir(projectRoot);
  const changeDir = path.join(openspecPath, 'changes', name);

  if (await FileSystemUtils.directoryExists(changeDir)) {
    throw new Error(`Change '${name}' already exists at ${changeDir}`);
  }

  await FileSystemUtils.createDirectory(changeDir);

  const today = new Date().toISOString().split('T')[0];
  writeChangeMetadata(changeDir, {
    schema: schemaName,
    created: today,
  });

  return {
    name,
    changeDir,
    schema: schemaName
  };
}
