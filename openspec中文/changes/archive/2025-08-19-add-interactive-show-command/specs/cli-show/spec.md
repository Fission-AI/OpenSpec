# CLI 显示命令规范

## 新增要求

### 要求：顶层显示命令

CLI 应提供带有智能选择功能的顶层 `show` 命令，用于显示变更和规范。

#### 场景：交互式显示选择

- **当** 不带参数执行 `openspec show`
- **则** 提示用户选择类型（变更或规范）
- **并且** 显示所选类型的可用项目列表
- **并且** 显示所选项目的内容

#### 场景：非交互环境不提示

- **给定** stdin 不是 TTY 或提供了 `--no-interactive` 或环境变量 `OPEN_SPEC_INTERACTIVE=0`
- **当** 不带参数执行 `openspec show`
- **则** 不提示
- **并且** 打印有用的提示，包含 `openspec show <item>` 或 `openspec change/spec show` 的示例
- **并且** 以代码 1 退出

#### 场景：直接项目显示

- **当** 执行 `openspec show <item-name>`
- **则** 自动检测项目是变更还是规范
- **并且** 显示项目内容
- **并且** 根据项目类型使用适当的格式

#### 场景：类型检测和歧义处理

- **当** 执行 `openspec show <item-name>`
- **则** 如果 `<item-name>` 唯一匹配变更或规范，则显示该项目
- **并且** 如果同时匹配两者，则打印歧义错误并建议 `--type change|spec` 或使用 `openspec change show`/`openspec spec show`
- **并且** 如果两者都不匹配，则打印未找到并提供最近匹配建议

#### 场景：显式类型覆盖

- **当** 执行 `openspec show --type change <item>`
- **则** 将 `<item>` 视为变更 ID 并显示（跳过自动检测）

- **当** 执行 `openspec show --type spec <item>`
- **则** 将 `<item>` 视为规范 ID 并显示（跳过自动检测）

### 要求：输出格式选项

显示命令应支持与现有命令一致的各种输出格式。

#### 场景：JSON 输出

- **当** 执行 `openspec show <item> --json`
- **则** 以 JSON 格式输出项目
- **并且** 包含解析的元数据和结构
- **并且** 保持与现有变更/规范显示命令的格式一致性

#### 场景：标志作用域和委托

- **当** 通过顶层命令显示变更或规范时
- **则** 接受通用标志如 `--json`
- **并且** 将特定于类型的标志传递给相应的实现
  - 仅变更标志：`--deltas-only`（别名 `--requirements-only` 已弃用）
  - 仅规范标志：`--requirements`、`--no-scenarios`、`-r/--requirement`
- **并且** 用警告忽略与检测类型无关的标志

### 要求：交互性控制

- CLI 应尊重 `--no-interactive` 以禁用提示。
- CLI 应尊重 `OPEN_SPEC_INTERACTIVE=0` 以全局禁用提示。
- 交互式提示应仅在 stdin 是 TTY 且未禁用交互性时显示。

#### 场景：变更特定选项

- **当** 使用 `openspec show <change-name> --deltas-only` 显示变更时
- **则** 仅以 JSON 格式显示差异
- **并且** 保持与现有变更显示选项的兼容性

#### 场景：规范特定选项

- **当** 使用 `openspec show <spec-id> --requirements` 显示规范时
- **则** 仅以 JSON 格式显示要求
- **并且** 支持其他规范选项 (--no-scenarios, -r)
- **并且** 保持与现有规范显示选项的兼容性