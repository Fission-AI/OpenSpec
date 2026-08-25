# OpenSpec 智能体契约 (Agent Contract)

`openspec` CLI 的机器可读接口（machine-readable surfaces），已对照 `src/` 校验（capstone 审计，2026-06-11）。下面每个结构（shape）都依据产生它的代码记录。

## 1. 通用约定 (General conventions)

- **每次调用一个 JSON 文档。** 在 `--json` 模式下，stdout 恰好携带一个 JSON 文档（2 空格缩进美化输出）。人工可读文本、spinner 和 store 横幅都输出到 stderr。
- **Store 横幅。** 在人工模式下，选中了 store 的 root 会向 stderr 打印 `Using OpenSpec root: <id> (<path>)`。JSON 模式下从不打印。
- **键名大小写取决于接口（surface）**（见 Known inconsistencies）：store/doctor/context 的 payload 使用 `snake_case`；工作流 payload（`status`、`instructions`、`new change`、`validate`、`list`）使用 `camelCase`，但内嵌的 `root` 对象始终使用 `store_id`。
- **可选键是省略而非置为 null**，在大多数 payload 中如此（例如 `root.store_id`、`member.path`）。使用显式 `null` 的例外会在各结构处特别说明（store doctor 的 `git.*`、失败 payload）。

## 2. 诊断信封 (The diagnostic envelope)

每个机器可读诊断（`StoreDiagnostic`）共享同一种信封（envelope）结构：

```json
{
  "severity": "error" | "warning" | "info",
  "code": "snake_case_string",
  "message": "human sentence",
  "target": "dotted.surface (optional)",
  "fix": "one actionable sentence/command (optional)"
}
```

诊断出现在两个位置：用于健康检查的**status 数组**（`status: StoreDiagnostic[]`，位于顶层或每个条目），以及命令失败时转换而成的、单元素的 **thrown errors** `status` 数组。

## 3. Root 选择与 `RootOutput`

所有解析 root 的命令（`list`、`show`、`validate`、`status`、`instructions`、`instructions apply`、`instructions archive`、`new change`、`archive`、`doctor`、`context`、`schemas`）都按同一优先级解析出一个 OpenSpec root：

1. `--store <id>` → 已注册 store 的 root（`source: "store"`）。
2. 否则，向上找到最近的包含 `openspec/` 的祖先目录：planning 形态 → `source: "nearest"`（此时 `store:` 指针会被忽略并附带一条 stderr 警告）；仅含配置、且带有有效 `store:` 指针的目录 → 该 store，`source: "declared"`。
3. 没有最近 root + 已设置全局 `defaultStore`（`openspec config set defaultStore <id>`）→ 该 store，`source: "global_default"`；若 id 已失效，则以底层 store 错误失败，并给出指向 `openspec config unset defaultStore` 的 `fix`。
4. 没有最近 root、没有默认，但存在已注册 store → 错误 `no_root_with_registered_stores`。
5. 没有 root、没有默认、没有 store：命令可将 cwd 视为 `source: "implicit"`；而 `doctor`、`context`、`list` 和批量 `validate` 则会以 `no_openspec_root` 失败。`list` 为带有 `openspec/project.md` 的旧项目保留 implicit 回退。

成功的 JSON payload 通常会内嵌 root；而成功的 `schemas --json` 刻意保持为 §4.13 中记录的兼容裸数组：

```json
"root": { "path": "/abs/path", "source": "store" | "declared" | "global_default" | "nearest" | "implicit", "store_id": "id (only when store-selected)" }
```

**Root 失败契约**：在 JSON 模式下，解析失败会在 stdout 打印 `{ ...commandNullShape, "status": [diagnostic] }` 并以退出码 1 结束。

## 4. 命令 JSON 结构 (Command JSON shapes)

### 4.1 `list --json`

`{ "changes": [ { "name", "completedTasks", "totalTasks", "lastModified", "status": "no-tasks"|"complete"|"in-progress" } ], "root": RootOutput }` — 注意这里每个 change 的 `status` 是一个字符串枚举。`--specs`: `{ "specs": [ { "id", "requirementCount" } ], "root" }`。

### 4.2 `show <item> --json`

Change（change）：`{ "id", "title", "deltaCount", "deltas": [...], "root" }`。Spec（spec）：`{ "id", "title", "overview", "requirementCount", "requirements": [...], "metadata": { "version", "format", "sourcePath"? }, "root" }`。

### 4.3 `validate --json`

`{ "items": [ { "id", "type": "change"|"spec", "valid", "issues": [ { "level", "path", "message", "line"?, "column"? } ], "durationMs" } ], "summary": { "totals": {items,passed,failed}, "byType": {...} }, "version": "1.0", "root" }`。任一 item 失败时退出码为 1。

### 4.4 `status --json`

`{ "changeName", "schemaName", "planningHome"?: { "kind", "root", "changesDir", "defaultSchema" }, "changeRoot", "artifactPaths": { "<id>": {outputPath, resolvedOutputPath, existingOutputPaths} }, "nextSteps": ["..."], "actionContext": { "mode": "repo-local", "sourceOfTruth": "repo", "planningArtifacts", "linkedContext", "allowedEditRoots", "requiresAffectedAreaSelection", "constraints" }, "isPlanningComplete", "isComplete", "applyRequires", "artifacts": [ {id, outputPath, status: "done"|"skipped"|"ready"|"blocked", requires, missingDeps?} ], "root" }`。`isPlanningComplete` 表示每个未被跳过的规划 artifact 都已存在；被跳过的 artifact 算作已满足，但不会被创建。它并不意味着实现 task 已完成。`isComplete` 作为兼容别名保留，值相同。每个 artifact 的 `requires` 是它的直接依赖 id（在所有状态下都存在，因此即便 artifact 为 `done`，也可计算出传递所需的集合）；`missingDeps` 仅在 `blocked` 时出现。`artifacts` 数组按依赖顺序排列，当多个 artifact 同时就绪时，以 schema 的 `artifacts:` 声明顺序打破平局（绝不按字母序），因此第一个 `ready` 条目就是下一个要写的 artifact；`missingDeps` 也使用同一顺序。`"skipped"` 标记一个 artifact，其 `generates` 路径位于某个在 `.openspec.yaml` 中声明了 `skip_specs: true` 的 change 的 `specs/` 之下；它满足依赖，但绝不能被创建。没有活跃 change 时：`{ "changes": [], "message", "root" }`，退出码 0。

### 4.5 `instructions <artifact> --json`

`{ "changeName", "artifactId", "schemaName", "changeDir", "planningHome"?, "outputPath", "resolvedOutputPath", "existingOutputPaths", "description", "instruction"?, "context"?, "rules"?, "references"?: ReferenceIndexEntry[], "skipped"?, "warning"?, "template", "dependencies": [{id,done,path,description,skipped?}], "unlocks", "root" }`。`unlocks` 列出本 artifact 使之就绪的那些 artifact，按 schema 的声明顺序（与 `status` 推荐的相同顺序）。当 change 声明了 `skip_specs: true` 且本 artifact 被跳过时，会出现 `"skipped": true`（附带 `"warning"`）——不要创建它的文件。一个带有 `skipped: true` 的依赖条目无需文件即视为满足——不要试图读取它的路径。

`ReferenceIndexEntry`：`{ "store_id", "root"?, "specs"?: [{id,summary}], "fetch"?, "status": [] }` —— 已解析的条目携带 root/specs/fetch；未解析的携带 store_id + warning 状态。索引上限为 50KB（`reference_index_truncated`）。

### 4.6 `instructions apply --json`

`{ "changeName", "changeDir", "schemaName", "contextFiles": { "<artifactId>": ["/abs", ...] }, "progress": {total,complete,remaining}, "tasks": [{id,description,done}], "state": "blocked"|"all_done"|"ready", "missingArtifacts"?, "instruction", "references"?, "context"?, "operationGuidance"?, "root" }`。这两个可选字段每次调用时都从所选 root 读取。`context` 是 prompt 级别的必需输入，其相关的项目事实、规范与约束都必须被应用；`operationGuidance` 是建议性输入，其条目仅在适用且与内置工作流兼容时才被遵循。两者都与 state、tasks、progress、context 文件以及内置指令相互独立。

### 4.7 `instructions archive --json`

`{ "changeName", "context"?, "operationGuidance"?, "root" }`。要求在解析出的 repo/store root 中存在有效的 `--change`，并使用与 apply 相同的"必需 context / 建议 guidance"语义。这是一个只读的运行时输入接口：它不返回静态 archive 工作流，不检查或合并 delta spec，不写入主 spec，也不移动 change。

### 4.8 `new change <name> --json`

成功：`{ "change": { "id", "path", "metadataPath", "schema" }, "root" }`。失败：`{ "change": null, "status": [d] }`，退出码 1。

### 4.9 `archive <name> --json`

成功：`{ "archive": { "change", "archivedAs": "YYYY-MM-DD-name", "path", "specsUpdated", "totals"?, "warnings"? }, "root" }`。失败：`{ "archive": null, "root"?, "status": [d] }`，退出码 1。`specsUpdated` 仅当至少写入或退役了一个 spec 文件时才为 true（某个 capability 的最后一条 requirement 被 change 移除时，其 spec 会被删除，这需要在 change 的 `.openspec.yaml` 中声明 `retire_capabilities: true`；每次退役都会在 `warnings` 中列名，且只有当 spec 位于调用方的 checkout 中时才附带一条可粘贴的 Git 恢复命令）；一个已同步的 change 归档时，totals 全为零，跳过的项列在 `warnings` 中。JSON 模式是严格非交互的：每个提示点都会变成一个 `archive_*` 代码。

### 4.10 `doctor --json`

`{ "root": { "path", "source", "store_id"?, "healthy", "status": [] }, "store": { "id", "metadata": {present,valid,remote?}, "origin_url"?, "drift"?: {ahead,behind}, "status": [] } | null, "references": [...], "status": [] }`。`drift`（仅当 git 支持的 store checkout 拥有上游跟踪引用时存在）是相对于最近一次 fetch 的上游的领先/落后计数，而非实时远程。任何严重程度的健康发现都以退出码 0 结束。失败 payload：`{ "root": null, "store": null, "references": [], "status": [d] }`，退出码 1。

### 4.11 `context --json`

`{ "root": { "path", "source", "store_id"?, "role": "openspec_root" }, "members": [ { "role": "referenced_store", "id", "path"?, "remote"?, "fetch"?, "status": [] } ], "status": [] }`。AVAILABLE = 路径存在 且 status 为空。`--code-workspace <path>` 写入 `{folders:[{name,path}]}`（仅限可用的被引用 store，`ref:` 前缀）；在 JSON 模式下，写入在打印之前执行，因此即便写入失败，stdout 也恰好持有一个文档。失败：`{ "root": null, "members": [], "status": [d] }`，退出码 1。

### 4.12 `store ... --json`

setup/register：`{ "store": {id, root, metadata_path?}, "registry": {path, registered, already_registered}, "git": {is_repository, initialized, committed}, "created_files": [], "status": [] }`。unregister/remove：`{ "store", "registry": {path, removed}, "files": {deleted, deleted_path, left_on_disk}, "status": [] }`。list：`{ "stores": [{id, root}], "status": [] }`。doctor：`{ "stores": [ { id, root, metadata_path?, openspec_root: {...healthy, status}, metadata: {present, valid, id?, remote}, git: {is_repository, has_commits, has_uncommitted_changes, has_remote, origin_url}, status } ], "status": [] }`（`null` = 未知/未探测）。健康发现以退出码 0 结束；失败以匹配 null-shape 的退出码 1 结束。提示取消以退出码 130 结束。

### 4.13 `schemas --json` / `templates --json`

`schemas`：成功时仍为一个裸数组 `[ {name, description, artifacts, source} ]`；它会解析规范的 root 选择优先级，并接受 `--store <id>`。root 选择失败：`{ "schemas": [], "root": null, "status": [d] }`，退出码 1。`templates`：键控对象 `{ "<artifactId>": {path, source} }`，仍基于 cwd，没有 root/status 键。

## 5. 退出码契约 (Exit-code contract)

| 情形 | 退出码 | Stdout |
|---|---|---|
| 成功，包含健康发现（doctor/context/store doctor） | 0 | 对应 payload |
| `--json` 模式下的命令失败 | 1 | 一个带有 `status: [d]` 及该命令 null-shape 的 JSON 文档 |
| `validate` 存在失败项 | 1 | 完整报告 |
| 提示取消（`store` 组，人工模式） | 130 | 仅 stderr |

## 6. 诊断代码目录 (Diagnostic code catalog)

### Resolution

`no_openspec_root`, `no_root_with_registered_stores`, `no_registered_stores`, `unknown_store`, `store_identity_mismatch`, `unhealthy_store_root`, `store_path_not_supported`, `invalid_store_pointer`, `initiative_option_removed`, `areas_option_removed`; pass-through: `invalid_store_id`, `invalid_store_registry`, `invalid_store_metadata`。

### OpenSpec-root health (error, no fix)

`openspec_store_root_missing`, `openspec_store_root_not_directory`, `openspec_root_missing`, `openspec_root_not_directory`, `openspec_config_missing`, `openspec_config_not_file`, `openspec_specs_not_directory`, `openspec_changes_not_directory`, `openspec_archive_not_directory`。During the stores beta, `openspec/specs/`, `openspec/changes/`, and `openspec/changes/archive/` may be absent in a healthy root; they are only health errors when present but not directories.

### Store registry/identity/state

`invalid_store_id`, `invalid_store_registry`, `invalid_store_metadata`, `store_registry_busy`, `store_not_found`, `no_store_registry`, `store_registry_changed`, `store_metadata_missing`, `store_metadata_id_mismatch`, `store_metadata_invalid`, `store_id_conflict`, `store_path_conflict`, `store_already_registered` (info)。

### Store setup/register/remove

`store_setup_id_required`, `store_setup_path_required`, `store_setup_path_not_directory`, `store_setup_inside_git_repo`, `store_setup_non_empty_directory`, `store_setup_cancelled`, `store_path_required`, `store_path_missing`, `store_path_not_directory`, `store_root_pointer_declared`, `store_register_root_unhealthy`, `store_register_identity_confirmation_required`, `store_register_cancelled`, `store_remote_empty`, `store_remote_requires_hand_edit`, `store_remove_confirmation_required`, `store_remove_cancelled`, `store_remove_path_not_directory`, `store_remove_metadata_missing`, `store_root_missing` (warning in remove, error in doctor), `store_root_not_directory`。

### Store git

`store_git_init_failed`, `store_git_identity_missing`, `store_git_commit_failed`, `store_git_no_commits` (warning), `store_clone_fragile_directories` (warning), `store_remote_divergence` (info, doctor), `store_checkout_drift` (info, doctor)。

### References (warning)

`reference_invalid_id`, `reference_registry_unreadable`, `reference_unresolved`, `reference_root_unhealthy`, `reference_index_truncated`。

### Relationships (warning; doctor; context keeps only the registry one)

`relationship_registry_unreadable`, `root_pointer_ignored`, `root_pointer_invalid`, `pointer_declarations_inert`。

### Archive (JSON mode)

`archive_change_name_required`, `archive_change_not_found`, `archive_change_symlink`, `archive_validation_failed`, `archive_confirmation_required`, `archive_tasks_incomplete`, `archive_spec_update_failed`, `archive_spec_validation_failed`, `archive_target_exists`, `archive_error`。

### Context writes

`context_file_exists`, `context_output_dir_missing`。

### Fallbacks

`doctor_failed`, `context_failed`, `store_error`, `change_error`, `archive_error`。

## 已知的不一致 (Known inconsistencies)

由 capstone 审计记录；已发布的键名重命名是推迟到本版本之后的产品决策：

1. ~~在 `--json` 模式下，若干失败路径只打印 stderr 而不输出 JSON 文档。~~ 在 capstone gauntlet 轮次中已修复：`show`/`validate` 的未知与歧义项会发出 `{status:[{code: unknown_item | ambiguous_item, ...}]}`；`status`/`instructions`/`list`/`show`/`validate` 中的抛出错误会经由 JSON 感知的失败辅助函数（该命令的 null-shape + `status`）；`store <unknown subcommand> --json` 发出 `{status:[{code: unknown_store_subcommand}]}`；`list` 在解析失败时携带其 `{changes|specs: [], root: null}` null-shape。
2. `store_root_missing` 会以两种严重程度发出（remove 中为 warning，store doctor 中为 error）——取决于上下文，见上文。
3. snake_case（store 系列）与 camelCase（工作流系列）的键名大小写差异；`root.store_id` 在各处都是 snake_case。
4. src 中存在四个并行的 envelope 类型声明；archive 诊断从不携带 `target`。
5. `list --json` 把 `status` 键复用为每个 change 的字符串枚举。
6. 只有 `validate` 的输出带有 `version` 字段。
7. `templates` 忽略 root 选择（基于 cwd，无 `--store`）。
8. 已弃用的名词形式（`change`/`spec` 子命令）发出的 payload 不带信封，也没有 `root`/`status`。
