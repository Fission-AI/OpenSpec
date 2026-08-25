/**
 * `openspec doctor`（切片 3.6）：root 级别的关系健康
 * 报告。只读——它回答"此工作涉及的根目录是否
 * 在本机可用？"，从不克隆、同步或修复。
 */
import { Command, Option } from 'commander';

import {
  resolveRootForCommand,
  type ResolvedOpenSpecRoot,
} from '../core/root-selection.js';
import { readOptionalStoreMetadataState } from '../core/store/foundation.js';
import { gitOriginUrl, gitTrackingDrift, isGitRepositoryAtRoot } from '../core/store/git.js';
import {
  classifyOpenSpecDir,
  readProjectConfig,
  resolveConfigFilePath,
} from '../core/project-config.js';
import { findRepoPlanningRootSync } from '../core/planning-home.js';
import { gatherRelationshipData } from './shared-gather.js';
import {
  inspectRelationships,
  type InspectRelationshipsInput,
  type RelationshipHealth,
} from '../core/relationship-health.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';
import { emitFailure, printJson } from './shared-output.js';
import * as path from 'node:path';

const FAILURE_PAYLOAD = { root: null, store: null, references: [] };

async function gatherHealth(
  root: ResolvedOpenSpecRoot
): Promise<{ health: RelationshipHealth; declaredReferenceCount: number }> {
  const data = await gatherRelationshipData(root);
  const {
    registrySnapshot,
    projectConfig,
    referenceEntries,
    rootInspection,
  } = data;
  const registryUnreadable = registrySnapshot.unreadable;

  const input: InspectRelationshipsInput = {
    root,
    rootHealthy: rootInspection.healthy,
    rootStatus: rootInspection.diagnostics,
    referenceEntries,
    registryUnreadable,
  };

  // 对存储支持的根目录的存储事实（显式 --store、已声明的
  // 指针或全局默认）。
  // 缺失/无效的元数据永远不会到达这里：存储解析
  // 首先验证身份，然后使用现有分类法失败
  // （记录的修正——损坏的 store.yaml 是退出码 1 的解析
  // 失败，不是健康检查发现）。
  if (root.storeId) {
    const metadata = await readOptionalStoreMetadataState(root.path).catch(() => null);
    // git -C 向上遍历树：探测嵌套在另一个仓库中的非仓库存储
    // 会记录外层仓库的 origin（和漂移）。
    const isRepo = await isGitRepositoryAtRoot(root.path);
    const [originUrl, drift] = isRepo
      ? await Promise.all([gitOriginUrl(root.path), gitTrackingDrift(root.path)])
      : [null, null];
    input.storeFacts = {
      id: root.storeId,
      metadataPresent: metadata !== null,
      metadataValid: metadata !== null,
      ...(metadata?.remote ? { canonicalRemote: metadata.remote } : {}),
      ...(originUrl ? { originUrl } : {}),
      ...(drift ? { drift } : {}),
    };
  }

  // 3.2 双形态错误转向，结构化——包括格式错误的
  // 指针值，解析器在规划形态的根目录上保持静默。
  if (root.source === 'nearest') {
    const { hasPlanningShape, pointer } = classifyOpenSpecDir(root.path);
    if (hasPlanningShape && pointer.filePath) {
      if (pointer.value !== undefined) {
        input.bothShapesPointer = { value: pointer.value, filePath: pointer.filePath };
      } else if (pointer.malformed) {
        input.malformedPointer = { filePath: pointer.filePath, reason: pointer.malformed };
      }
    }
  }

  // 3.4 记录的惰性指针错误转向：已解析的根目录是
  // STORE；重新遍历到指针目录并读取其配置。
  if (root.source === 'declared') {
    const pointerRoot = findRepoPlanningRootSync(process.cwd());
    if (pointerRoot) {
      const pointerConfig = readProjectConfig(pointerRoot);
      const fields: string[] = [];
      if (pointerConfig?.references?.length) fields.push('references');
      if (fields.length > 0) {
        const filePath =
          resolveConfigFilePath(pointerRoot) ??
          path.join(pointerRoot, 'openspec', 'config.yaml');
        input.inertPointerDeclarations = { filePath, fields };
      }
    }
  }

  return {
    health: inspectRelationships(input),
    declaredReferenceCount: projectConfig?.references?.length ?? 0,
  };
}

function printDiagnosticLines(prefix: string, status: { message: string; fix?: string }[]): void {
  for (const entry of status) {
    console.log(`${prefix}- ${entry.message}`);
    if (entry.fix) {
      console.log(`${prefix}  修复：${entry.fix}`);
    }
  }
}

function printEntrySection<T extends { status: { message: string; fix?: string }[] }>(
  title: string,
  entries: T[],
  emptyLine: string,
  okLine: (entry: T) => string,
  idOf: (entry: T) => string
): void {
  console.log('');
  console.log(title);
  if (entries.length === 0) {
    console.log(`  ${emptyLine}`);
    return;
  }
  for (const entry of entries) {
    if (entry.status.length === 0) {
      console.log(`  - ${okLine(entry)}`);
      continue;
    }
    for (const diagnostic of entry.status) {
      console.log(`  - ${idOf(entry)}：${diagnostic.message}`);
      if (diagnostic.fix) {
        console.log(`    修复：${diagnostic.fix}`);
      }
    }
  }
}

function printHumanHealth(health: RelationshipHealth, declaredReferenceCount: number): void {
  console.log('Doctor 诊断');
  console.log('');
  console.log('根目录');
  console.log(`  位置：${health.root.path}`);
  console.log(`  OpenSpec 根目录：${health.root.healthy ? '正常' : '异常'}`);
  if (health.store) {
    const metadataNote = health.store.metadata.valid ? 'metadata 正常' : 'metadata 无效';
    console.log(`  存储：${health.store.id} (${metadataNote})`);
  }
  printDiagnosticLines('  ', [...health.root.status, ...(health.store?.status ?? [])]);

  // "（未声明）" 绝不能撒谎：自引用会从
  // 索引中省略，因此因省略而变空的列表有自己的行。
  const referencesEmptyLine =
    health.references.length === 0 && declaredReferenceCount > 0
      ? '（已声明的 references 都指向此根目录）'
      : '（未声明）';
  printEntrySection(
    'References',
    health.references,
    referencesEmptyLine,
    (entry) => `${entry.store_id}：正常${entry.root ? ` (${entry.root})` : ''}`,
    (entry) => entry.store_id
  );

  for (const entry of health.status) {
    console.log('');
    console.log(`注意：${entry.message}`);
    if (entry.fix) {
      console.log(`修复：${entry.fix}`);
    }
  }
}

export function registerDoctorCommand(program: Command): void {
  const description =
    COMMAND_REGISTRY.find((entry) => entry.name === 'doctor')?.description ??
    '报告已解析的 OpenSpec 根目录的关系健康状况';

  program
    .command('doctor')
    .description(description)
    .option('--store <id>', COMMON_FLAGS.store.description)
    .addOption(
      new Option('--store-path <path>', '已移除；请注册存储并使用 --store').hideHelp()
    )
    .option('--json', '以 JSON 格式输出')
    .action(async (options: { store?: string; storePath?: string; json?: boolean }) => {
      try {
        const root = await resolveRootForCommand(
          { store: options.store, storePath: options.storePath },
          { json: options.json, failurePayload: FAILURE_PAYLOAD, allowImplicitRoot: false }
        );
        if (!root) {
          return;
        }

        const { health, declaredReferenceCount } = await gatherHealth(root);

        if (options.json) {
          printJson(health);
          return;
        }
        printHumanHealth(health, declaredReferenceCount);
      } catch (error) {
        emitFailure(options.json, FAILURE_PAYLOAD, error, 'doctor_failed');
      }
    });
}
