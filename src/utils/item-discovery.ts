import { promises as fs } from 'fs';
import path from 'path';
import { discoverSpecFiles } from './spec-discovery.js';

/**
 * 返回活跃 change 的 id：openspec/changes/ 下的每个目录，
 * 除了 archive 和隐藏目录。
 *
 * change 仅通过其目录来解析 —— 与 `list`、`status`、`instructions`
 * 和 `validate` 使用的规则相同（`getAvailableChanges`）。
 * 在此处要求 proposal.md 会使 `openspec show` 和 shell completion
 * 错过这些命令解析的 change：`openspec new change <name>` 仅搭建
 * `.openspec.yaml`，而自定义 schema 可能根本不需要定义 proposal artifact
 * (#1161)。
 */
export async function getActiveChangeIds(root: string = process.cwd()): Promise<string[]> {
  const changesPath = path.join(root, 'openspec', 'changes');
  try {
    const entries = await fs.readdir(changesPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export async function getSpecIds(root: string = process.cwd()): Promise<string[]> {
  const specsPath = path.join(root, 'openspec', 'specs');
  const discovered = await discoverSpecFiles(specsPath);
  return discovered.map((spec) => spec.id);
}

/**
 * 返回已归档 change 的 id：openspec/changes/archive/ 下的每个目录，
 * 除了隐藏目录。
 *
 * 通过目录解析的原因与 `getActiveChangeIds` 相同：
 * 从没有 proposal artifact 的 schema 归档的 change 没有 proposal.md，
 * 以其为条件会将这些条目从 shell completion 中隐藏。
 */
export async function getArchivedChangeIds(root: string = process.cwd()): Promise<string[]> {
  const archivePath = path.join(root, 'openspec', 'changes', 'archive');
  try {
    const entries = await fs.readdir(archivePath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

