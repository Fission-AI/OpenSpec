## 1. 核心基礎設施

- [x] 1.1 為全域設定建立zod schema `src/core/config-schema.ts`
- [x] 1.2 新增用於點符號鍵存取的實用函數（取得/設定巢狀值）
- [x] 1.3 新增類型強制邏輯（自動偵測布林/數字/字串）

## 2.Config命令實現

- [x] 2.1 建立 `src/commands/config.ts` 帶有 Commander.js 子命令
- [x] 2.2 實施 `config path` 子命令
- [x] 2.3 實施 `config list` 子命令與 `--json` 旗幟
- [x] 2.4 實施 `config get <key>` 子命令（原始輸出）
- [x] 2.5 實施 `config set <key> <value>` 和 `--string` 旗幟
- [x] 2.6 實施 `config unset <key>` 子命令
- [x] 2.7 實施 `config reset --all` 和 `-y` 確認標誌
- [x] 2.8 實施 `config edit` 子命令（產生 $EDITOR）

## 3. 整合

- [x] 3.1 在CLI入口點註冊config指令
- [x] 3.2 更新 shell 完成註冊表以包含 config 子命令

## 4. 測試

- [x] 4.1 手動測試所有子命令
- [x] 4.2 驗證zod驗證拒絕無效的鍵/值
- [x] 4.3 使用點表示法測試嵌套鍵訪問
- [x] 4.4 測試類型強制邊緣情況（真/假、數字、字串）
