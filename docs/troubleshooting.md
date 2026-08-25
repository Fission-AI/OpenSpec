# 排障 (Troubleshooting)

针对具体问题给出具体修复。每条都先点出症状，用一句话解释可能的原因，再给出修复办法。如果你在这里没看到自己的问题，[FAQ](faq.md) 也许能帮上忙，[Discord](https://discord.gg/YctCnvvshC) 则一定能。

## 安装与设置

### `openspec: command not found`

CLI 没安装，或者你的 shell 找不到它。先全局安装并检查：

```bash
npm install -g @fission-ai/openspec@latest
openspec --version
```

如果装好了却仍找不到，那多半是你的全局 npm bin 目录不在 `PATH` 上。运行 `npm prefix -g` 看看全局包装在哪里：在 macOS 和 Linux 上，二进制文件在该目录的 `bin/` 子目录里，在 Windows 上则直接位于该目录中。请确保该路径已在你的 `PATH` 上。（`npm bin -g` 已在 npm 9 中被移除。）

如果你用的是 [AI 辅助安装](installation.md#install-with-your-ai-assistant)，这正是预期的交接点：该提示词会让你的助手把 `PATH` 改动展示给你，而不是自己编辑你的 shell 启动文件。

### "Requires Node.js 20.19.0 or higher"

OpenSpec 运行在 Node 20.19.0+ 上。检查你的版本，必要时升级：

```bash
node --version
```

如果你用 bun 安装 OpenSpec，请注意 OpenSpec 仍然*运行*在 Node 上，因此无论怎样你都需要在 `PATH` 上提供 Node 20.19.0+。参见[安装](installation.md)。

### `openspec init` didn't configure my AI tool

init 会询问要配置哪些工具。如果你跳过了自己的工具，或想再添加一个，直接重新运行即可，也可以使用非交互式形式：

```bash
openspec init --tools claude,cursor
```

完整的工具 ID 列表见[支持工具](supported-tools.md)。使用 `--tools all` 配置全部，用 `--tools none` 跳过工具配置。

## 命令没有出现

如果 `/opsx:propose`（或你工具对应的等价命令）没有出现或毫无反应，请按下面这个清单逐条排查。排序按"最该先查"在前。

1. **你可能用错了地方。** 斜杠命令要输入到 AI 助手的聊天框里，而不是终端。如果你把 `/opsx:propose` 打进了 shell，那就是问题所在。参见[命令工作原理](how-commands-work.md)。

2. **重新生成文件。** 在你的项目根目录：

   ```bash
   openspec update
   ```

   这会为你配置的每个工具重写 skill 和命令文件。

   指令文件来自*已安装*的 CLI，因此一个过时的 CLI 会报告一切都是最新的，却从不写入更新的工作流。`openspec update` 现在会检查这一点并提示你升级——如果看到提示，就接受它。

3. **重启你的助手。** 大多数工具在启动时会扫描 skill 和命令。开个新窗口通常就解决了。

4. **确认文件确实存在。** 对 Claude Code 来说，检查 `.claude/skills/` 里是否包含 `openspec-*` 文件夹。其他工具有各自的目录，全部列在[支持工具](supported-tools.md)。

5. **确认你已初始化过这个项目。** skill 是按项目写入的。如果你克隆了仓库或切换了文件夹，请在那个位置运行 `openspec init`（或 `openspec update`）。

6. **确认你的工具支持命令文件。** Codex、CodeArts、ForgeCode、Hermes、Kimi Code、Mistral Vibe、Zed Agent，以及共享的 `.agents` 目标，都不会生成 `opsx-*` 命令文件；它们改用基于 skill 的调用方式，因此 `/opsx` 永远不会为它们自动补全。在 Codex 中输入 `$openspec-propose`，在 Kimi Code 中输入 `/skill:openspec-propose`，其余的输入 `/openspec-propose`。共享的 `.agents` 目标是厂商中立的，所以 `/openspec-propose` 是常见形式而非保证形式——如果你的助手不响应它，请查阅它自己的文档了解如何调用一个 skill。Amazon Q 确实会生成命令文件，但会把它们载入自己的 prompt 库而不是斜杠菜单——在那里要输入 `@opsx-propose`，而不是 `/opsx`。每种工具的形式都列在[如何调用](supported-tools.md#how-to-invoke)。

## 处理 change

### "Change not found"

命令无法确定你说的是哪个 change。请显式指明名称，或检查一下现有的内容：

```bash
openspec list                    # see active changes
/opsx:apply add-dark-mode        # name the change in chat
```

同时确认你位于正确的项目目录中。

### "No artifacts ready"

每个 artifact 要么已经创建，要么正被依赖卡住等待。看看是什么在阻塞：

```bash
openspec status --change <name>
```

然后先创建缺失的依赖。记住顺序：proposal 解锁 specs 和 design；specs 和 design 一起解锁 tasks。

### `openspec validate` reports warnings or errors

校验会检查你的 specs 和 changes 是否存在结构性问题。读懂那条信息：它会指出文件名和问题所在。

```bash
openspec validate <name>           # validate one item
openspec validate --all            # validate everything
openspec validate --all --strict   # stricter checks, good for CI
openspec validate --archived       # fail if archived changes have unchecked tasks
```

常见原因包括缺失必需的小节（例如一个没有 scenario 的 spec）或格式错误的 delta 头部。修复文件后重新运行。[CLI 参考](cli.md#openspec-validate) 记载了输出格式。

有一条信息值得单独说明：

```text
MODIFIED "<requirement>" omits scenario(s) the current spec still has: "<scenario>"
```

一条 `MODIFIED` requirement 会替换整个 requirement 块，因此它必须带上所有在变更后仍保留下来的 scenario，而不只是你编辑过的那些。把被点名的那些 scenario 从 `openspec/specs/<capability-path>/spec.md` 复制回 delta 中，路径中的 domain 目录要一并保留。这种情况常出现在一个较旧的 change 上——在别人对同一个 requirement 添加了一个 scenario 之后——无论怎样 archive 都会拒绝那个 change，而现在校验会在你实现它之前就指出来。

### The AI created incomplete or wrong artifacts

AI 缺少足够的上下文。有几个可用的手段：

- 在 `openspec/config.yaml` 中加入项目上下文，让你的技术栈和规范被注入到每个请求中。参见[自定义配置](customization.md#project-configuration)。
- 添加 per-artifact 的 `rules:`，用于只针对（例如）specs 的指引。
- 在 propose 时给出更详细的描述。
- 用扩展的 `/opsx:continue` 一次创建一个 artifact 并逐个审查，而不是让 `/opsx:ff` 一次性全做完。

### Archive won't finish, or warns about incomplete tasks

archive 不会在不完整的 task 上*阻塞*，但它会警告你，因为归档通常意味着工作已完成。如果 task 是故意留着的（你在归档一个未完成的部分 change），那就继续。否则请先完成 task。如果你还没同步过，archive 还会主动提出把你的 delta spec 合并进主 specs；除非你有不这样做的理由，否则就同意。

### "User force closed the prompt with 0 null"

有东西在某个无法回答问题的情况下运行了 `openspec archive`——比如某个 AI agent 从一个工具里调用它、一个 CI 任务，或者任何关闭了 stdin 的 shell。archive 最多会询问三次确认，而一个无法回答的确认过去就会以那条原始信息失败。

传入 `--yes` 来提前回答它们：

```bash
openspec archive <change-name> --yes
```

保留你原本就在传的任何标志——`--skip-specs` 和 `--no-validate` 会改变 archive 的行为，所以一个赤裸的 `--yes` 重跑并不是同一个命令。当前版本会为你指明标志名，并打印一行可以粘贴的 `Fix:`。如果你本想从列表里选，就显式传入 change 名称：选择器同样需要一个答案。

如果你换一种方式，把 archive 的输出重定向到文件、或被某个工具捕获，并且*确实*通过管道传入了答案（`printf 'y\n' | openspec archive …`），旧版本在绘制提示时会把终端转义码写进那个捕获内容——在某些环境里足以让文件严重膨胀。当前版本在 stdout 不是终端时，会把确认提示作为纯文本读取；而一个不带参数的 `openspec archive`（本来会绘制一个交互式 change 选择器）会改为要求你提前传入 change 名称，而不是把一个菜单渲染进捕获内容。无论哪种情况，重定向运行和 agent 运行都会保持干净；传入 `--yes`（带上 change 名称）会完全跳过提示。

## 配置

### My `config.yaml` isn't being applied

三个常见疑点：

1. **文件名错误。** 它必须是 `openspec/config.yaml`，而不是 `.yml`。
2. **YAML 无效。** 用任意 YAML 校验器校验一遍；CLI 也会带行号地报告语法错误。
3. **你以为需要重启。** 其实不需要。配置改动会立即生效。

### "Unknown artifact ID in rules: X"

`rules:` 下的某个键与你的 schema 中任何 artifact 都对不上。对于默认的 `spec-driven` schema，有效的 ID 是 `proposal`、`specs`、`design`、`tasks`。要查看任意 schema 的 ID：

```bash
openspec schemas --json
```

### "Context too large"

`context:` 字段被刻意限制在 50KB，因为它会被注入到每个请求中。请对它做摘要，或者链接到更长的文档，而不是把内容整段粘贴进来。精简的上下文还能带来更好、更快的结果。

### "Schema not found"

你引用的 schema 名称不存在。列出可用的 schema 并检查拼写：

```bash
openspec schemas                    # list available schemas
openspec schema which <name>        # see where a schema resolves from
openspec schema init <name>         # create a custom one
```

参见[自定义配置](customization.md#custom-schemas)。

## 从遗留工作流迁移

### "Legacy files detected in non-interactive mode"

你正处于 CI 或非交互式 shell 中，OpenSpec 发现了需要清理的旧文件，却无法向你确认。请自动批准：

```bash
openspec init --force
```

对 Codex 来说，OpenSpec 可能会在 `$CODEX_HOME/prompts` 或 `~/.codex/prompts` 中检测到旧的受管理 prompt 文件。该清理仅限于 OpenSpec 许可名单中的遗留 Codex prompt 文件名，而且非交互式的 `openspec init` 只删除那些"其替代的 `.agents/skills/openspec-*` skills 已存在"的文件。非交互式的 `openspec update` 则完全不动任何遗留清理，除非你传入 `--force`。

### Commands didn't appear after migrating

重启你的 IDE。skill 在启动时被检测。如果它们仍然没有出现，运行 `openspec update` 并检查[支持工具](supported-tools.md) 中的文件位置。

### My old `project.md` wasn't migrated

这是有意为之。OpenSpec 永远不会自动删除 `project.md`，因为它可能保存着你写下的上下文。请把有用的部分移入 `config.yaml` 的 `context:` 小节，然后自己删除它。[迁移指南](migration-guide.md#migrating-projectmd-to-configyaml) 详细说明了这个过程，并包含一段你可以交给 AI 来做提炼的提示词。

## 还是卡住了？

- **Discord：** [discord.gg/YctCnvvshC](https://discord.gg/YctCnvvshC)
- **GitHub Issues：** [github.com/Fission-AI/OpenSpec/issues](https://github.com/Fission-AI/OpenSpec/issues)
- **从你的终端：** `openspec feedback "what went wrong"` 会为你开一个 issue。

报告问题时，请附上你的 OpenSpec 版本（`openspec --version`）、Node 版本（`node --version`）、你用的 AI 工具，以及确切的命令和输出。这能让求助快得多。
