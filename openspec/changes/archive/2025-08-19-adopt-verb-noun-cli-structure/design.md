# 設計：動詞-名詞 CLI 結構採用

## 概述
我們將發出動詞命令（`list`, `show`, `validate`, `diff`, `archive`）主介面並保留名詞指令（`spec`, `change`) 作為一個版本已棄用的別名。

## 決定

1. 保持路由集中 `src/cli/index.ts`.
2. 添加 `--specs`/`--changes` 到 `openspec list`， 和 `--changes` 作為預設值。
3. 顯示棄用警告 `openspec change list` 更一般地，對於任何 `openspec change ...` 和 `openspec spec ...` subcommands.
4. 不要改變 `show`/`validate` 幫助文本之外的行為；他們已經支援 `--type` 為了消除歧義。

## 向後相容性
所有基於名詞的命令都將繼續使用明確的棄用警告，引導使用者使用動詞優先的等效命令。

## 超出範圍
JSON 輸出奇偶校驗 `openspec list` 跨模式和 `show --specs/--changes` 發現是後續行動。


