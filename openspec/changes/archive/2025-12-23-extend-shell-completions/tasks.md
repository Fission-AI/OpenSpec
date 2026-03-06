# 實施任務

## 第一階段：基礎和 Bash 支援

- [x] 更新 `SupportedShell` 輸入 `src/utils/shell-detection.ts` 包括 `'bash' | 'fish' | 'powershell'`
- [x] Extend shell detection logic to recognize bash, fish, and PowerShell from environment variables
- [x] 創造 `src/core/completions/generators/bash-generator.ts` 實施 `CompletionGenerator` 介面
- [x] 創造 `src/core/completions/installers/bash-installer.ts` 實施 `CompletionInstaller` 介面
- [x] 更新 `CompletionFactory.createGenerator()` 支援bash
- [x] 更新 `CompletionFactory.createInstaller()` 支援bash
- [x] 建立測試文件 `test/core/completions/generators/bash-generator.test.ts` 鏡像 zsh 測試結構
- [x] 建立測試文件 `test/core/completions/installers/bash-installer.test.ts` 鏡像 zsh 測試結構
- [x] 手動驗證 bash 完成是否有效： `openspec completion install bash && exec bash`

## 第二階段：Fish 支援

- [x] 創造 `src/core/completions/generators/fish-generator.ts` 實施 `CompletionGenerator` 介面
- [x] 創造 `src/core/completions/installers/fish-installer.ts` 實施 `CompletionInstaller` 介面
- [x] 更新 `CompletionFactory.createGenerator()` 支援魚
- [x] 更新 `CompletionFactory.createInstaller()` 支援魚
- [x] 建立測試文件 `test/core/completions/generators/fish-generator.test.ts`
- [x] 建立測試文件 `test/core/completions/installers/fish-installer.test.ts`
- [x] 手動驗證魚的完成情況： `openspec completion install fish`

## 第三階段：PowerShell 支援

- [x] 創造 `src/core/completions/generators/powershell-generator.ts` 實施 `CompletionGenerator` 介面
- [x] 創造 `src/core/completions/installers/powershell-installer.ts` 實施 `CompletionInstaller` 介面
- [x] 更新 `CompletionFactory.createGenerator()` 支援powershell
- [x] 更新 `CompletionFactory.createInstaller()` 支援powershell
- [x] 建立測試文件 `test/core/completions/generators/powershell-generator.test.ts`
- [x] 建立測試文件 `test/core/completions/installers/powershell-installer.test.ts`
- [x] 驗證 PowerShell 在 Windows 或 macOS PowerShell 上手動完成

## Phase 4: Documentation and Testing

- [x] 更新 `CLAUDE.md` or relevant documentation to mention all four supported shells
- [x] Add cross-shell consistency test verifying all shells support same commands
- [x] 執行 `pnpm test` 確保所有測試都通過
- [x] 執行 `pnpm run build` 驗證TypeScript編譯
- [x] 測試不同平台上的所有 shell（bash/fish/zsh 為 Linux，PowerShell 為 Windows/macOS）

## 第 5 階段：驗證與清理

- [x] 執行 `openspec validate extend-shell-completions --strict` 並解決所有問題
- [x] 更新錯誤訊息以列出所有四種受支援的 shell
- [x] 核實 `openspec completion --help` 文件是最新的
- [x] 測試自動偵測適用於所有 shell
- [x] 確保所有 shell 都能順利卸載