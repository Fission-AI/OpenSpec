/**
 * doctor 和 context 共用的关系数据收集（4.1）：
 * 一个注册表快照、健康模式的引用索引和根目录
 * 检查。Doctor 在其上叠加仅健康检查的输入（存储事实、
 * 错误转向检测）。
 */
import * as path from 'node:path';

import { readRegistrySnapshot, type RegistrySnapshot } from '../core/store/registry.js';
import {
  readProjectConfig,
  resolveConfigFilePath,
  type ProjectConfig,
} from '../core/project-config.js';
import { assembleReferenceIndex, type ReferenceIndexEntry } from '../core/references.js';
import { inspectOpenSpecRoot, type OpenSpecRootInspection } from '../core/openspec-root.js';
import type { ResolvedOpenSpecRoot } from '../core/root-selection.js';

export interface RelationshipData {
  registrySnapshot: RegistrySnapshot;
  projectConfig: ProjectConfig | null;
  storeConfigPath: string;
  referenceEntries: ReferenceIndexEntry[];
  rootInspection: OpenSpecRootInspection;
}

export async function gatherRelationshipData(
  root: ResolvedOpenSpecRoot
): Promise<RelationshipData> {
  const registrySnapshot = await readRegistrySnapshot();

  const projectConfig = readProjectConfig(root.path);
  const storeConfigPath =
    resolveConfigFilePath(root.path) ?? path.join(root.path, 'openspec', 'config.yaml');

  const referenceEntries = await assembleReferenceIndex({
    references: projectConfig?.references ?? [],
    resolvedRoot: root,
    includeSpecs: false,
    registryEntries: registrySnapshot.entries,
  });

  const rootInspection = await inspectOpenSpecRoot(root.path);

  return {
    registrySnapshot,
    projectConfig,
    storeConfigPath,
    referenceEntries,
    rootInspection,
  };
}
