/**
 * 关系健康组合（slice 3.6）。
 *
 * 对"此工作涉及的根目录在这台机器上是否可用"的一个只读回答 - 对 doctor 命令
 * 收集的输入的纯组合。锁的四个类别保持分离：根健康、
 * store 元数据健康和引用健康。这里（或下游）没有任何东西克隆、同步或修复。
 */
import { makeStoreDiagnostic, type StoreDiagnostic } from './store/errors.js';
import { sanitizeInline, type ReferenceIndexEntry } from './references.js';
import { storePointerProblem } from './project-config.js';
import { toRootOutput, type ResolvedOpenSpecRoot } from './root-selection.js';

export interface RelationshipHealth {
  root: {
    path: string;
    source: ResolvedOpenSpecRoot['source'];
    store_id?: string;
    healthy: boolean;
    status: StoreDiagnostic[];
  };
  store: {
    id: string;
    metadata: { present: boolean; valid: boolean; remote?: string };
    origin_url?: string;
    drift?: { ahead: number; behind: number };
    status: StoreDiagnostic[];
  } | null;
  references: ReferenceIndexEntry[];
  status: StoreDiagnostic[];
}

export interface InspectRelationshipsInput {
  root: ResolvedOpenSpecRoot;
  rootHealthy: boolean;
  rootStatus?: StoreDiagnostic[];
  /** 存储支持的根目录的 Store 事实（显式或声明）。 */
  storeFacts?: {
    id: string;
    metadataPresent: boolean;
    metadataValid: boolean;
    canonicalRemote?: string;
    originUrl?: string;
    drift?: { ahead: number; behind: number };
  };
  referenceEntries: ReferenceIndexEntry[];
  registryUnreadable: boolean;
  /** 一个真实根目录，其 config 还声明了 store: 指针（3.2）。 */
  bothShapesPointer?: { value: string; filePath: string };
  /** 一个真实根目录，其 store: 指针值格式错误（3.2）。 */
  malformedPointer?: { filePath: string; reason: 'unparseable' | 'non_string' };
  /** 指针目录自身 config 中的引用声明是无效的。 */
  inertPointerDeclarations?: { filePath: string; fields: string[] };
}

function warning(code: string, message: string, fix: string): StoreDiagnostic {
  return makeStoreDiagnostic('warning', code, message, { target: 'relationships', fix });
}

export function inspectRelationships(input: InspectRelationshipsInput): RelationshipHealth {
  const status: StoreDiagnostic[] = [];

  if (input.registryUnreadable) {
    status.push(
      warning(
        'relationship_registry_unreadable',
        'store 注册表不可读；无法检查引用健康状况。',
        '运行：openspec store doctor'
      )
    );
  }

  if (input.bothShapesPointer) {
    status.push(
      warning(
        'root_pointer_ignored',
        `${input.bothShapesPointer.filePath} 声明了 store '${input.bothShapesPointer.value}'，但此目录是一个真实的 OpenSpec 根目录；该声明将被忽略。`,
        `从 ${input.bothShapesPointer.filePath} 中移除 store: 行，或将规划文件移入 store。`
      )
    );
  }

  if (input.malformedPointer) {
    status.push(
      warning(
        'root_pointer_invalid',
        `${input.malformedPointer.filePath} 声明了一个无法使用的 store: 指针（${storePointerProblem(input.malformedPointer.reason)}）。`,
        `修复或移除 ${input.malformedPointer.filePath} 中的 store: 行。`
      )
    );
  }

  if (input.inertPointerDeclarations && input.inertPointerDeclarations.fields.length > 0) {
    status.push(
      warning(
        'pointer_declarations_inert',
        `${input.inertPointerDeclarations.filePath} 声明了 ${input.inertPointerDeclarations.fields.join(' 和 ')}，但命令读取的是已解析 store 的 config — 这些声明是无效的。`,
        `将 ${input.inertPointerDeclarations.fields.join('/')} 声明移入 store 的 openspec/config.yaml。`
      )
    );
  }

  // Store 部分：元数据事实 + 分歧信息说明。
  let store: RelationshipHealth['store'] = null;
  if (input.storeFacts) {
    const storeStatus: StoreDiagnostic[] = [];
    if (
      input.storeFacts.canonicalRemote &&
      input.storeFacts.originUrl &&
      input.storeFacts.canonicalRemote !== input.storeFacts.originUrl
    ) {
      storeStatus.push(
        makeStoreDiagnostic(
          'info',
          'store_remote_divergence',
          `store.yaml 远程仓库（${sanitizeInline(input.storeFacts.canonicalRemote, 200)}）与检出的源（${sanitizeInline(input.storeFacts.originUrl, 200)}）不同。`,
          { target: 'store.metadata' }
        )
      );
    }
    // 检出落后于其上游跟踪引用：一个只读的过期
    // 信号，不是版本固定 — OpenSpec 永不同步 store，因此
    // 这是与本地上游引用比较，不是与实时远程仓库比较。
    // 落后意味着在更新提交上的队友可能解析不同的 spec。
    // 仅领先是正常的（OpenSpec 永不推送 store），因此保持静默。
    const drift = input.storeFacts.drift;
    if (drift && drift.behind > 0) {
      const behindCommits = `${drift.behind} commit${drift.behind === 1 ? '' : 's'}`;
      storeStatus.push(
        makeStoreDiagnostic(
          'info',
          'store_checkout_drift',
          drift.ahead > 0
            ? `此 store 检出与其上游跟踪分支已分叉（落后 ${drift.behind}，领先 ${drift.ahead}）；在更新提交上的队友可能解析不同的 spec。`
            : `此 store 检出落后于其上游跟踪分支 ${behindCommits}；在更新提交上的队友可能解析不同的 spec。`,
          { target: 'store.git' }
        )
      );
    }
    store = {
      id: input.storeFacts.id,
      metadata: {
        present: input.storeFacts.metadataPresent,
        valid: input.storeFacts.metadataValid,
        ...(input.storeFacts.canonicalRemote
          ? { remote: input.storeFacts.canonicalRemote }
          : {}),
      },
      ...(input.storeFacts.originUrl ? { origin_url: input.storeFacts.originUrl } : {}),
      ...(drift ? { drift } : {}),
      status: storeStatus,
    };
  }

  return {
    root: {
      ...toRootOutput(input.root),
      healthy: input.rootHealthy,
      status: input.rootStatus ?? [],
    },
    store,
    references: input.referenceEntries,
    status,
  };
}
