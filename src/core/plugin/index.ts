// Plugin system public API
export {
  VALID_HOOK_POINTS,
  PluginManifestSchema,
  HandlerConfigSchema,
  HookDefinitionSchema,
  GateDefinitionSchema,
  PluginHooksSchema,
  ConfigFieldSchema,
  SkillOverlaySchema,
  SkillOverlaysSchema,
} from './types.js';

export type {
  PluginManifest,
  HandlerConfig,
  HookDefinition,
  GateDefinition,
  PluginHooks,
  ConfigField,
  LoadedPlugin,
  SkillOverlay,
  SkillOverlays,
} from './types.js';

export {
  loadPlugins,
  resolvePluginDir,
  parsePluginManifest,
  checkVersionCompatibility,
  getProjectPluginsDir,
  getUserPluginsDir,
  getPackagePluginsDir,
  PluginLoadError,
  resolveOverlayPaths,
  getPluginOverlays,
} from './loader.js';

export {
  validatePluginConfig,
  validateAllPluginConfigs,
  flattenConfigToEnvVars,
} from './config-validator.js';

export {
  dispatchHooks,
} from './hook-dispatcher.js';

export type {
  HookPoint,
  HookContext,
  HookResult,
  HookExecutedResult,
  HookPendingResult,
} from './hook-dispatcher.js';

export {
  getLoadedPlugins,
  clearPluginCache,
} from './context.js';
