<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="OpenSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>最受歡迎的規範框架。</strong></summary>

[![Stars](https://img.shields.io/github/stars/Fission-AI/OpenSpec?style=flat-square&label=Stars)](https://github.com/Fission-AI/OpenSpec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/@fission-ai/openspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@fission-ai/openspec)
[![Contributors](https://img.shields.io/github/contributors/Fission-AI/OpenSpec?style=flat-square&label=Contributors)](https://github.com/Fission-AI/OpenSpec/graphs/contributors)

</details>
<p></p>
我們的理念：

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

> [!TIP]
> **新的工作流程現已推出！ **我們已經使用新的工件引導工作流程重建了OpenSpec。
>
> 執行 `/opsx:propose "your idea"` 開始吧。 → [在這裡瞭解更多](docs/opsx.md)

<p align="center">
  追蹤 <a href="https://x.com/0xTab">X 上的 @0xTab</a> 取得更新 · 加入 <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> 尋求協助與提問。
</p>

### 團隊

在團隊中使用 OpenSpec？ [在此寄送電子郵件](mailto:teams@openspec.dev) 存取我們的 Slack 頻道。

<!-- TODO: Add GIF demo of /opsx:propose → /opsx:archive workflow -->

## 檢視實際效果

```text
You: /opsx:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /opsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /opsx:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>OpenSpec儀表板</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

</details>

## 快速入門

**需要 Node.js 20.19.0 或更高版本。 **

全域安裝OpenSpec：

```bash
npm install -g @fission-ai/openspec@latest
```

然後導航到您的專案目錄並初始化：

```bash
cd your-project
openspec init
```

現在告訴你的人工智慧： `/opsx:propose <what-you-want-to-build>`

如果您想要擴充工作流程（`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`），選擇它 `openspec config profile` 並執行 `openspec update`.

> [!NOTE]
> 不確定您的工具是否受支援？ [檢視完整列表](docs/supported-tools.md) – 我們支援 20 多種工具，而且還在增加。
>
> 也適用於pnpm、yarn、bun 和 nix。 [檢視安裝選項](docs/installation.md).

## 文件

→ **[入門](docs/getting-started.md)**：第一步<br>
→ **[工作流程](docs/workflows.md)**：組合和圖案<br>
→ **[命令](docs/commands.md)**：斜線指令與技能<br>
→ **[CLI](docs/cli.md)**：終端參考<br>
→ **[支援的工具](docs/supported-tools.md)**：工具整合和安裝路徑<br>
→ **[概念](docs/concepts.md)**：整體如何銜接<br>
→ **[Multi-Language](docs/multi-language.md)**：多語言支援<br>
→ **[客製化](docs/customization.md)**：讓它成為你的


## 為什麼 OpenSpec？

當需求僅存在於聊天歷史記錄中時，人工智能編碼輔助功能強大，但不可預測。 OpenSpec 新增了一個輕量級規範層，以便您在編寫任何程式碼之前必須建立的內容達成一致。

- **建構之前達成一致**——人類和人工智慧在編寫程式碼之前就規範進行協調
- **保持井井有條** - 每個變更都有自己的資料夾，其中包含提案、規格、設計和任務
- **工作流程靈活** - 隨時更新任何工件，沒有嚴格的階段門
- **使用你的工具** - 透過斜槓命令與 20 多個人工智慧助理一起工作

### 我們如何比較

**與。 [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — 垂直但級。剛性鄰接門，大量Markdown，Python設定。 OpenSpec可以重量更輕，讓你自由迭代。

**與。 [Kiro](https://kiro.dev)** (AWS) — 功能強大，但您被鎖定在他們的 IDE 中並僅限於 Claude 模型。 OpenSpec 可與您已使用的工具搭配使用。

**與。什麼都沒有**——沒有規範的人工智能編碼意味著模糊的提示和不可預測的結果。 OpenSpec儀式可以帶來可預測性。

## 更新 OpenSpec

**升級包**

```bash
npm install -g @fission-ai/openspec@latest
```

**重新整理代理說明**

在每個專案中執行此命令以重新產生 AI 指導並確保最新的斜線命令某個活動狀態：

```bash
openspec update
```

## 使用說明

**模型選擇**：OpenSpec最適合高推理模型。我們建議Opus 4.5 和 GPT 5.2 進行規劃和實施。

**上下文衛生**：OpenSpec 受益於乾淨的上下文視窗。在開始實施之前清除您的上下文，並在整個會話過程中保持良好的上下文衛生。

## 貢獻

**小修復** — Bug修復、拼字錯誤更正和小可以作為改進直接PR提交。

**較大變更** — 對於新功能、重大重構或架構變更，請先提交 OpenSpec 變更提案，以便我們在實施開始之前就意圖和目標保持一致。

在撰寫提案時，請牢記 OpenSpec 理念：我們為不同的編碼代理、模型和用例的廣泛用戶提供服務。改變應該對每個人都有好處。

**歡迎人工智能產生的方案代碼**——只要經過測試和驗證。包含AI產生方案代碼的PR應提及所使用的方案代碼代理和模型（例如，“使用claude-opus-4-5-20251101 Claude使用方案代碼產生”）。

### 發展

- 安裝依賴項： `pnpm install`
- 建造： `pnpm run build`
- 測試： `pnpm test`
- 本地開發CLI： `pnpm run dev` 或者 `pnpm run dev:cli`
- 常規提交（一行）： `type(scope): subject`

## 其他

<details>
<summary><strong>遙測</strong></summary>

OpenSpec收集匿名使用統計資料。

我們僅收集命令名稱和版本來瞭解使用模式。沒有參數、路徑、內容或 PII。在 CI 後自動失效。

**選擇退出：** `export OPENSPEC_TELEMETRY=0` 或者 `export DO_NOT_TRACK=1`

</details>

<details>
<summary><strong>維護者和顧問</strong></summary>

看 [MAINTAINERS.md](MAINTAINERS.md) 檢視幫助指導專案的核心維護者和顧問的清單。

</details>



## 執照

MIT
