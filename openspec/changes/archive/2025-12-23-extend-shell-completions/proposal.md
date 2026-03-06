# 變更提案：延長 Shell 完成時間

## 為什麼

Zsh 完成率提供了出色的開發人員體驗，但許多開發人員使用 bash、fish 或 PowerShell。將完成支援擴展到這些 shell 可以消除大多數不使用 Zsh 的開發人員的摩擦。

## 有什麼變化

此變更添加了 bash、fish 和 PowerShell 完成支援，遵循為 Zsh 完成建立的相同架構模式、文件方法和測試嚴格性。

## 三角洲

- **規格：** `cli-completion`
  - **操作：**修改
  - **描述：** 擴充完成產生、安裝和測試要求以支援 bash、fish 和 PowerShell，同時保持現有的 Zsh 實作和架構模式