## Why

OpenSpec 的中文环境使用者在增加，当前所有文档仅提供英文版本，这对中文使用者理解和上手 OpenSpec 造成了一定障碍。提供中文文档能更好地帮助中文使用者理解 OpenSpec 的概念、工作流和命令用法。

## What Changes

- 将 `README.md` 翻译为中文，放置到 `docs/i18n/zh-cn/README.md`
- 将 `docs/` 下所有文档翻译为中文，放置到 `docs/i18n/zh-cn/` 对应路径
- 每份中文文档开头添加 AI 翻译声明，注明使用的模型名称
- 保留原始 Markdown 格式、链接、代码块等结构不变

## Capabilities

### New Capabilities
- `zh-cn-translations`: 中文文档翻译，涵盖 `README.md` 和 `docs/` 下全部 11 个文档文件

### Modified Capabilities

N/A — 本次变更不修改现有功能的需求，仅为已有文档添加中文翻译。

## Impact

- 新增目录 `docs/i18n/zh-cn/` 及其下所有翻译文件
- 不影响现有英文文档和功能
- 未来文档更新时需要同步维护翻译版本
