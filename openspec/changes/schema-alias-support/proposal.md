## 為什麼

我們想重命名 `spec-driven` 到 `openspec-default` 以更好地反映這是標準/預設工作流程。然而，直接重命名會破壞現有的項目 `schema: spec-driven` 在他們的 `openspec/config.yaml`。新增別名支援允許兩個名稱互換使用，從而實現平穩過渡，而無需進行重大更改。

## 有什麼變化

- 在架構解析器中加入架構別名解析
- `openspec-default` 和 `spec-driven` 都將解析為相同的模式
- 物理目錄仍然存在 `schemas/spec-driven/` （或者可以重新命名為 `schemas/openspec-default/` 和 `spec-driven` 作為別名）
- 所有 CLI 命令和設定檔接受任一名稱
- 無需更改現有使用者設定

## 能力

### 新功能

- `schema-aliases`：支援架構名稱別名，以便多個名稱可以解析到同一架構目錄

### 修改後的功能

<!-- No existing spec-level behavior is changing - this is purely additive -->

## 影響

- `src/core/artifact-graph/resolver.ts` - 新增別名解析邏輯
- `schemas/` 目錄 - 可能重新命名 `spec-driven` 到 `openspec-default`
- 文件 - 更新為首選 `openspec-default` 同時注意到 `spec-driven` 仍然有效
- 預設架構常數 - 更新 `DEFAULT_SCHEMA` 到 `openspec-default`
