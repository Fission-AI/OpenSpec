## Why

<!--
Explain the motivation for this change. What problem does this solve? Why now?

硬限制：50 ≤ 字元數 ≤ 1000（OpenSpec zod schema 會 validate）
- 太短：會收到 `Why section must be at least 50 characters` error
- 太長：會收到 `Why section should not exceed 1000 characters` error

建議結構：現況痛點 → 為什麼現在處理 → 預期收益（各 1-2 句）
-->

## What Changes

<!--
Describe what will change. Be specific about new capabilities, modifications, or removals.

對於有明確前後對比的行為變更，使用 From/To 格式（markdown 無 inline diff）：

**<Section or Behavior Name>**
- From: <current state / requirement>
- To: <future state / requirement>
- Reason: <why this change is needed>
- Impact: <breaking / non-breaking, who's affected>

多個變更可重複此 block；純新增或純刪除可用簡單列表描述。
-->

## Capabilities

### New Capabilities
<!--
Capabilities being introduced. Replace <name> with kebab-case identifier.
命名規則見 openspec/specs/README.md：使用複合名詞（至少 2 個 word），
例如 `user-auth`、`data-export`、`api-rate-limiting`，不用純單詞。
Each creates specs/<name>/spec.md
-->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities
<!--
Existing capabilities whose REQUIREMENTS are changing (not just implementation).
Only list here if spec-level behavior changes. Each needs a delta spec file.
Use existing spec names from openspec/specs/. Leave empty if no requirement changes.
-->
- `<existing-name>`: <what requirement is changing>

## Impact

<!-- Affected code, APIs, dependencies, systems -->
