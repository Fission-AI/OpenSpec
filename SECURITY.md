# 安全策略

## 报告漏洞

请通过 [GitHub Security Advisories](https://github.com/Fission-AI/OpenSpec/security/advisories/new) 私下报告。请不要就疑似漏洞公开提交 issue。

尽可能包含：受影响的版本、复现步骤，以及你认为的影响。我们力争在 3 个工作日内确认，并在 30 天内发布修复或决定。有效的报告会在公告中署名，除非你更希望保持匿名。

## 受支持的版本

修复随 npm 上发布的最新版本提供。旧版本不会打补丁——请升级以获取修复。

## 威胁模型

OpenSpec 是一个本地命令行工具。它没有服务器、没有网络监听，也没有特权守护进程。它使用你提供的路径，在你运行它的目录下读取和写入 markdown，并以你自己的用户权限执行。它可以在 `openspec update` 期间提议自我升级，且只有在你同意时才进行。它会发送匿名的用量遥测（telemetry），你可以用 `OPENSPEC_TELEMETRY=0` 禁用。

这决定了此处哪些是漏洞、哪些不是：

| 在范围内 | 超出范围 |
| --- | --- |
| 解析 spec、config 或模板文件触发的代码执行 | 读取或写入你自己传给 CLI 的文件路径 |
| 通过不可信输入逃逸 OpenSpec 所指向的目录 | 在没有不可信输入情况下、针对文件路径拼接的静态分析发现 |
| 通过遥测或日志泄露凭据或文件内容 | 未随发布包一同发布的 devDependencies 中的漏洞 |
| 从 config 或 spec 文件可达的原型污染或注入 | 使用你自己的输入对你自己的机器发起的拒绝服务 |

如果你认为某件事处于边界上，请报告，我们会一起厘清。

## 已发布包的内容

该 `openspec` npm 包发布 `dist/`、`bin/` 和 `schemas/`。构建与测试工具（vite、rollup、vitest、eslint 及其传递依赖）不会发布。未区分依赖范围的扫描器读取 `pnpm-lock.yaml` 时，会针对那些从未进入 OpenSpec 安装副本的包发出告警。

你不必盲目相信——安装该包并亲自查看：

```sh
npm install @fission-ai/openspec
ls node_modules | grep -E '^(vite|rollup|vitest|eslint|js-yaml|minimatch)$'   # no matches
```

`pnpm audit --prod` 在本仓库中报告相同范围，CI 会在每个拉取请求上运行它。

## CLI 在你的机器上做了什么

| 层面 | 行为 |
| --- | --- |
| 安装脚本 | 该包不含 `preinstall`、`install` 或 `postinstall` 脚本，因此从 npm registry 安装时不会运行 OpenSpec 的任何代码。（仍声明了 `prepare`；npm 仅在 git 和本地目录安装时运行它，此时会从源码构建。）Shell 补全通过 `openspec completion install` 选择性启用；CLI 在首次运行时打印一行相关提示。 |
| 运行其他程序 | 每个经过 shell 的调用都使用固定字面量（`which gh`、`gh auth status`）。任何携带你输入的内容——issue 文本、编辑器路径、workset 命令、传给 `openspec update` 的路径——都使用参数数组，绝不会对 shell 做字符串插值。在 Windows 上，`.cmd` shim 通过 `cross-spawn` 启动，它会转义参数而非拼接它们。 |
| 安装软件 | `openspec update` 可以运行 `npm install -g @fission-ai/openspec@latest`，然后用升级后的 CLI 重新运行 `openspec update`。它仅在你对提示回答"是"后才会这样做，且只针对 OpenSpec 包本身、仅在 npm 负责该安装时，并绝不会在 CI 或非交互式 shell 中执行。全局安装位于你的项目之外，因此它会以你的权限在那里运行，并执行发布包随附的任何生命周期脚本。随后它会回读已安装二进制的版本，而不是假定升级已完成。若拒绝，它会打印出供你自行运行的命令。 |
| 遥测 | 命令名称、OpenSpec 版本，以及一个本地生成的随机 UUID。不含文件路径、文件内容、环境、主机名，且 IP 捕获被明确禁用。通过 `OPENSPEC_TELEMETRY=0` 或 `DO_NOT_TRACK=1` 选择退出；在 CI 中自动关闭。 |
| 网络 | 启用遥测时，以及在 `openspec update` 期间发起一次 npm registry 请求，以检查是否发布了更新的 CLI。该请求除任何 HTTP 请求都会暴露的信息外，不发送关于你的任何数据；每次 `openspec update` 仅运行一次，不缓存任何内容；当 `CI` 被设为非明确关闭值以外的值、处于 `NODE_ENV=test` 下，或设置了 `OPENSPEC_NO_UPDATE_CHECK`、`DO_NOT_TRACK=1` 或 `OPENSPEC_TELEMETRY=0` 时会被跳过。读取、写入和校验 specs 完全是本地的。 |

## 自动化检查

| 工具 | 覆盖范围 |
| --- | --- |
| [CodeQL](https://github.com/Fission-AI/OpenSpec/security/code-scanning) | 对每次推送到 `main` 及每个拉取请求的静态分析 |
| [Dependabot](https://github.com/Fission-AI/OpenSpec/security/dependabot) | 依赖告警，外加针对 CLI、文档站点和 CI 动作的每周更新拉取请求 |
| 依赖审查 | 拦截引入高危依赖的拉取请求 |
| 密钥扫描 | 在仓库中启用，包含推送保护 |
| `pnpm audit` | 发布的依赖会在每个拉取请求、推送到 `main` 时以及每周接受审计。在拉取请求上为"建议"级别，以免无关改动被阻塞；在其他地方为"失败"级别，因此即使没有依赖变更，新告警也会浮现。构建工具始终为建议级别。 |
| 固定动作 | 每个 GitHub Action 都从提交 SHA 运行，因此被移动的标签无法改变 CI 执行的内容 |

告警会依据上述威胁模型进行分诊，因此仅出现在构建工具中的发现会按常规更新节奏修复，而不会被视为事件。
