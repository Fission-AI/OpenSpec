# 實施任務

## 第一階段：基礎和架構

- [x] 創造 `src/utils/shell-detection.ts` 和 `SupportedShell` 類型和 `detectShell()` 功能
- [x] 創造 `src/core/completions/types.ts` 有接口： `CompletionGenerator`, `CommandDefinition`, `FlagDefinition`
- [x] 創造 `src/core/completions/command-registry.ts` 和 `COMMAND_REGISTRY` 定義所有 OpenSpec 指令、標誌和元資料的常數
- [x] 創造 `src/core/completions/completion-provider.ts` 和 `CompletionProvider` 用於動態更改/規範 ID 發現的類，具有 2 秒緩存
- [x] 編寫外殼檢測測試（`test/utils/shell-detection.test.ts`)
- [x] 為完成提供者撰寫測試（`test/core/completions/completion-provider.test.ts`)

## 第 2 階段：Zsh 完成（天哪 Zsh 優先）

- [x] 創造 `src/core/completions/generators/zsh-generator.ts` 實施 `CompletionGenerator` 介面
- [x] 使用以下命令實現 Zsh 腳本生成 `_arguments` 和 `_describe` 圖案
- [x] 使用完成提供者為變更/規範 ID 新增動態完成邏輯
- [x] 測試Zsh發電機輸出（`test/core/completions/generators/zsh-generator.test.ts`)
- [x] 創造 `src/core/completions/installers/zsh-installer.ts` 具有 Oh My Zsh 和標準 Zsh 支援
- [x] 實施 Oh My Zsh 檢測（`$ZSH` 環境變數或 `~/.oh-my-zsh/` 目錄）
- [x] 實施安裝 `~/.oh-my-zsh/custom/completions/_openspec` 喔我的Zsh
- [x] 實施後備安裝 `~/.zsh/completions/_openspec` 和 `fpath` 更新
- [x] 使用模擬檔案系統測試 Zsh 安裝程式邏輯 (`test/core/completions/installers/zsh-installer.test.ts`)

## 第 3 階段：CLI 命令實施

- [x] 創造 `src/commands/completion.ts` 和 `CompletionCommand` 班級
- [x] 登記 `completion` 命令輸入 `src/cli/index.ts` 帶有子命令：產生、安裝、卸載
- [x] 實施 `generateSubcommand()` 將 Zsh 腳本輸出到標準輸出
- [x] 實施 `installSubcommand(shell?: 'zsh')` 僅自動檢測 Zsh
- [x] 實施 `uninstallSubcommand(shell?: 'zsh')` 用於刪除 Zsh 完成情況
- [x] 添加 `--verbose` flag support for detailed installation output
- [x] 新增帶有明確訊息的錯誤處理："Shell '<name>' 尚不支援。目前支援：zsh”
- [x] 測試完成命令整合（`test/commands/completion.test.ts`)

## 第四階段：整合與完善

- [x] 建立工廠模式 `src/core/completions/factory.ts` 實例化 Zsh 生成器/安裝程式（可擴充用於未來的 shell）
- [x] 添加 `completion` 命令到命令註冊表以完成自引用
- [x] 在 Zsh 生成器中實現動態完成輔助函數（`_openspec_complete_changes`, `_openspec_complete_specs`, `_openspec_complete_items`)
- [x] 為完成命令參數新增“shell”位置類型
- [x] 使用動態助手產生測試完成
- [x] 測試完成安裝/解除安裝流程
- [x] 驗證所有測試均通過（97 項完成測試，總共 340 項測試）
- [x] 透過npm安裝後腳本實現自動安裝
- [x] 新增安全檢查（CI檢測、選擇退出標誌）
- [x] 處理 Oh My Zsh 與標準 Zsh 安裝路徑
- [x] 新增用於安裝後驗證的測試腳本
- [x] 記錄自動安裝行為並在 README 中選擇退出
- [ ] 在 Oh My Zsh 環境中手動測試 Zsh 完成情況（安裝、測試標籤完成情況、解除安裝）
- [ ] 在標準 Zsh 環境中手動測試 Zsh 完成情況
- [ ] 在真實的 OpenSpec 項目中測試動態變更/規範 ID 完成情況
- [ ] 驗證完成快取行為（2 秒 TTL）
- [ ] 測試 OpenSpec 項目以外的行為（應跳過動態完成）
- [x] 更新 `openspec --help` 輸出包含完成命令（透過 Commander 自動完成）

## 第 5 階段：邊緣情況與錯誤處理

- [ ] 安裝過程中測試並處理權限錯誤
- [ ] 測試並處理遺失的 shell 設定目錄（自動建立並通知）
- [ ] 測試“已安裝”檢測和重新安裝流程
- [ ] 測試卸載過程中的「未安裝」檢測
- [ ] 核實 `--no-color` 完成命令輸出中尊重標誌
- [ ] 使用有用的錯誤訊息測試 shell 偵測失敗場景
- [ ] 確保優雅處理 `$SHELL` 未設定或無效
- [ ] 測試非 Zsh shell 得到明確的「尚不支援」錯誤訊息
- [ ] 測試生成器輸出可以重定向到檔案而不會損壞

## 依賴關係

- 第 2 階段依賴第 1 階段（基礎必須先存在）
- 第 3 階段取決於第 2 階段（CLI 需要 Zsh 發電機工作）
- 第 4 階段取決於第 3 階段（整合需要 CLI + Zsh 實施）
- 第 5 階段取決於第 4 階段（核心功能工作後的邊緣狀況測試）

## 未來的工作（不在本提案）

- **Bash 完成** - 在後續提案中建立 bash-generator.ts 和 bash-installer.ts
- **Fish 完成** - 在後續提案中建立fish-generator.ts和fish-installer.ts
- **PowerShell 完成** - 在後續提案中建立 powershell-generator.ts 和 powershell-installer.ts

該架構旨在透過實作以下命令來簡單地添加這些 shell `CompletionGenerator` interface.
