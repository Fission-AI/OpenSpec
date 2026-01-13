import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { TemplateManager, ProjectContext } from './templates/index.js';
import { ToolRegistry } from './configurators/registry.js';
import { SlashCommandRegistry } from './configurators/slash/registry.js';
import {
  OpenSpecConfig,
  AI_TOOLS,
  DEFAULT_OPENSPEC_DIR_NAME,
  LEGACY_OPENSPEC_DIR_NAME,
  OPENSPEC_MARKERS,
} from './config.js';

export type RootStubStatus = 'created' | 'updated' | 'skipped';

export interface InitResult {
  projectPath: string;
  openspecPath: string;
  openspecDir: string;
  extendMode: boolean;
  selectedTools: string[];
  createdTools: string[];
  refreshedTools: string[];
  skippedExistingTools: string[];
  skippedTools: string[];
  rootStubStatus: RootStubStatus;
  migrated: boolean;
}

export async function runInit(targetPath: string, options: { tools?: string[], shouldMigrate?: boolean } = {}): Promise<InitResult> {
  const projectPath = path.resolve(targetPath);
  
  // Check for legacy directory
  const legacyPath = path.join(projectPath, LEGACY_OPENSPEC_DIR_NAME);
  const defaultPath = path.join(projectPath, DEFAULT_OPENSPEC_DIR_NAME);
  
  let openspecPath = defaultPath;
  let openspecDir = DEFAULT_OPENSPEC_DIR_NAME;
  let migrated = false;

  const hasLegacy = await FileSystemUtils.directoryExists(legacyPath);
  const hasDefault = await FileSystemUtils.directoryExists(defaultPath);

  if (hasLegacy && !hasDefault) {
      if (options.shouldMigrate) {
          await FileSystemUtils.rename(legacyPath, defaultPath);
          migrated = true;
      } else {
          openspecPath = legacyPath;
          openspecDir = LEGACY_OPENSPEC_DIR_NAME;
      }
  } else if (hasLegacy) {
      openspecPath = legacyPath;
      openspecDir = LEGACY_OPENSPEC_DIR_NAME;
  }

  const extendMode = await FileSystemUtils.directoryExists(openspecPath);

  if (!(await FileSystemUtils.ensureWritePermissions(projectPath))) {
    throw new Error(`Insufficient permissions to write to ${projectPath}`);
  }

  const existingToolStates = await getExistingToolStates(projectPath, extendMode);
  
  const selectedToolIds = options.tools || [];
  const availableTools = AI_TOOLS.filter((tool) => tool.available);
  
  const createdTools: string[] = [];
  const refreshedTools: string[] = [];
  const skippedExistingTools: string[] = [];
  const skippedTools: string[] = [];

  for (const tool of availableTools) {
      if (selectedToolIds.includes(tool.value)) {
          if (existingToolStates[tool.value]) {
              refreshedTools.push(tool.value);
          } else {
              createdTools.push(tool.value);
          }
      } else {
          if (existingToolStates[tool.value]) {
              skippedExistingTools.push(tool.value);
          } else {
              skippedTools.push(tool.value);
          }
      }
  }

  // Step 1: Create directory structure
  if (!extendMode) {
    await createDirectoryStructure(openspecPath);
    await writeTemplateFiles(openspecPath, { aiTools: selectedToolIds }, false);
  } else {
    await createDirectoryStructure(openspecPath);
    await writeTemplateFiles(openspecPath, { aiTools: selectedToolIds }, true);
  }

  // Step 2: Configure AI tools
  const rootStubStatus = await configureAITools(
    projectPath,
    openspecDir,
    selectedToolIds
  );

  return {
    projectPath,
    openspecPath,
    openspecDir,
    extendMode,
    selectedTools: selectedToolIds,
    createdTools,
    refreshedTools,
    skippedExistingTools,
    skippedTools,
    rootStubStatus,
    migrated
  };
}

async function getExistingToolStates(
  projectPath: string,
  extendMode: boolean
): Promise<Record<string, boolean>> {
  if (!extendMode) {
    return Object.fromEntries(AI_TOOLS.map(t => [t.value, false]));
  }

  const entries = await Promise.all(
    AI_TOOLS.map(async (t) => [t.value, await isToolConfigured(projectPath, t.value)] as const)
  );
  return Object.fromEntries(entries);
}

async function isToolConfigured(
  projectPath: string,
  toolId: string
): Promise<boolean> {
  const fileHasMarkers = async (absolutePath: string): Promise<boolean> => {
    try {
      const content = await FileSystemUtils.readFile(absolutePath);
      return content.includes(OPENSPEC_MARKERS.start) && content.includes(OPENSPEC_MARKERS.end);
    } catch {
      return false;
    }
  };

  let hasConfigFile = false;
  let hasSlashCommands = false;

  const configFile = ToolRegistry.get(toolId)?.configFileName;
  if (configFile) {
    const configPath = path.join(projectPath, configFile);
    hasConfigFile = (await FileSystemUtils.fileExists(configPath)) && (await fileHasMarkers(configPath));
  }

  const slashConfigurator = SlashCommandRegistry.get(toolId);
  if (slashConfigurator) {
    for (const target of slashConfigurator.getTargets()) {
      const absolute = slashConfigurator.resolveAbsolutePath(projectPath, target.id);
      if ((await FileSystemUtils.fileExists(absolute)) && (await fileHasMarkers(absolute))) {
        hasSlashCommands = true;
        break;
      }
    }
  }

  const hasConfigFileRequirement = configFile !== undefined;
  const hasSlashCommandRequirement = slashConfigurator !== undefined;

  if (hasConfigFileRequirement && hasSlashCommandRequirement) {
    return hasConfigFile && hasSlashCommands;
  } else if (hasConfigFileRequirement) {
    return hasConfigFile;
  } else if (hasSlashCommandRequirement) {
    return hasSlashCommands;
  }

  return false;
}

async function createDirectoryStructure(openspecPath: string): Promise<void> {
  const directories = [
    openspecPath,
    path.join(openspecPath, 'specs'),
    path.join(openspecPath, 'changes'),
    path.join(openspecPath, 'changes', 'archive'),
  ];

  for (const dir of directories) {
    await FileSystemUtils.createDirectory(dir);
  }
}

async function writeTemplateFiles(
  openspecPath: string,
  config: OpenSpecConfig,
  skipExisting: boolean
): Promise<void> {
  const context: ProjectContext = {};
  const templates = TemplateManager.getTemplates(context);

  for (const template of templates) {
    const filePath = path.join(openspecPath, template.path);
    if (skipExisting && (await FileSystemUtils.fileExists(filePath))) {
      continue;
    }
    const content = typeof template.content === 'function'
        ? template.content(context)
        : template.content;
    await FileSystemUtils.writeFile(filePath, content);
  }
}

async function configureAITools(
  projectPath: string,
  openspecDir: string,
  toolIds: string[]
): Promise<RootStubStatus> {
  const rootStubStatus = await configureRootAgentsStub(projectPath, openspecDir);

  for (const toolId of toolIds) {
    const configurator = ToolRegistry.get(toolId);
    if (configurator && configurator.isAvailable) {
      await configurator.configure(projectPath, openspecDir);
    }

    const slashConfigurator = SlashCommandRegistry.get(toolId);
    if (slashConfigurator && slashConfigurator.isAvailable) {
      await slashConfigurator.generateAll(projectPath, openspecDir);
    }
  }

  return rootStubStatus;
}

async function configureRootAgentsStub(
  projectPath: string,
  openspecDir: string
): Promise<RootStubStatus> {
  const configurator = ToolRegistry.get('agents');
  if (!configurator || !configurator.isAvailable) {
    return 'skipped';
  }

  const stubPath = path.join(projectPath, configurator.configFileName);
  const existed = await FileSystemUtils.fileExists(stubPath);
  await configurator.configure(projectPath, openspecDir);
  return existed ? 'updated' : 'created';
}
