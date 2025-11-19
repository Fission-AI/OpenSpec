## Why

OpenSpec 目前只支持英文，这限制了非英语用户的使用体验。添加多语言支持可以让更多开发者使用他们熟悉的语言来使用 OpenSpec，降低使用门槛并提高采用率。通过在初始化时选择语言，后续生成的所有配置文件和模板内容都将使用所选语言，确保一致的用户体验。

## What Changes

- 在 `openspec init` 命令中添加语言选择步骤，让用户在初始化时选择语言（如：中文、英文等）
- 扩展 `OpenSpecConfig` 接口，添加 `language` 字段用于存储用户选择的语言
- 修改所有模板生成逻辑（`AGENTS.md`、`project.md`、各种 AI 工具配置文件等），根据选择的语言生成对应语言的内容
- 在 `openspec/` 目录下创建配置文件（如 `config.json`）存储语言设置，以便后续命令（如 `openspec update`）能够读取并使用相同的语言
- 更新 `openspec update` 命令，使其能够读取并应用已配置的语言设置
- 支持的语言：默认英文（en-US），可选中文（zh-CN）、法语（fr-FR）、日语（ja-JP）、阿拉伯语（ar-SA）等，后续可扩展

### Breaking Changes

- 无 - 这是新增功能，默认行为保持不变（默认使用英文）

## Impact

- Affected specs: `specs/cli-init`（需要添加语言选择相关需求）
- Affected code:
  - `src/core/config.ts`（扩展 `OpenSpecConfig` 接口）
  - `src/core/init.ts`（添加语言选择提示和配置存储逻辑）
  - `src/core/update.ts`（读取并应用语言配置）
  - `src/core/templates/`（所有模板文件需要支持多语言）
  - `src/core/configurators/`（所有配置器需要支持多语言模板）
  - `src/utils/file-system.ts`（可能需要添加配置文件读写功能）

