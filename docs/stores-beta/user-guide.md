# Stores：在独立仓库中规划

> **Beta（测试版）。** Stores、references、working context 和 worksets 都是新功能。命令名、标志、文件格式和 JSON 输出在不同版本之间仍可能变化。下面的每个演练都基于当前构建运行，但升级后请重新阅读本指南。

## 它解决的问题

OpenSpec 通常存在于一个代码仓库内部：一个 `openspec/` 文件夹与你的代码并列，保存该仓库的 specs 和 changes。

一旦你的规划比单个仓库更大，这就不再适用了：

- 你的工作横跨多个仓库——一个功能同时触及 API 服务器、Web 应用和一个共享库。这个计划该放在谁的 `openspec/` 文件夹里？
- 你的团队在代码存在之前就开始规划，或者规划一些永远不会变成*这个*仓库里代码的东西。
- 需求由一个团队拥有，却被其他团队消费。Wiki 上的版本会漂移，而你的编码 agent 反正也读不了它。

**store** 就是答案：一个独立的仓库，它的全部职责就是规划。它有着你已经熟悉的形状——specs 和 changes——外加一个小小的身份文件。你按名称在机器上注册它一次，之后所有普通的 OpenSpec 命令都能从任意位置在它上面工作。

## 形态

```
            team-plans  (a store: planning in its own repo)
            ├── .openspec-store/store.yaml     identity: "I am team-plans"
            └── openspec/
                ├── specs/      what is true
                └── changes/    what is in motion
                      ▲
                      │ registered on each machine by name;
                      │ shared by pushing/cloning like any repo
        ┌─────────────┼─────────────┐
        │             │             │
    web-app       api-server     mobile-app
   (code repo)   (code repo)    (code repo)
```

两条规则让这一切保持简单：

1. **store 只是一个 git 仓库。** 你自己提交、推送、拉取和审查它。OpenSpec 永远不会自行克隆、同步或推送任何东西。
2. **声明，而非机制。** 仓库可以*声明*它们与 stores 的关系（如下所示）。声明改变的是 OpenSpec 能告诉你什么——永远不改变你的命令在哪里执行。

## 五分钟创建你的第一个 Store

两条命令就能让你从零到一个可工作的、store 范围的 change：

```bash
openspec store setup team-plans --path ~/openspec/team-plans
```

```
Store ready: team-plans
Location: /Users/you/openspec/team-plans
OpenSpec root: ready
Registry: registered

Next: run normal OpenSpec commands against this store, for example:
  openspec new change <change-id> --store team-plans
Share this store by committing and pushing it like any Git repo.
```

```bash
openspec new change add-login --store team-plans
```

```
Using OpenSpec root: team-plans (/Users/you/openspec/team-plans)
Created change 'add-login' at /Users/you/openspec/team-plans/openspec/changes/add-login/
Schema: spec-driven
Next: openspec status --change add-login --store team-plans
```

这就是完整的模型。从此以后的生命周期与你已知的完全一样——`status`、`instructions`、`validate`、`archive`——每条命令都带上 `--store team-plans`，而且每条打印出的提示都会为你带上该标志。`Using OpenSpec root:` 这一行总会告诉你一条命令正在哪里执行。

## 故事：一个团队，一个规划仓库

一个团队把它的 specs 和 changes 放在 `team-plans` 中，而不是散落到各个代码仓库。

**第一天（由搭建的人来做）：**

```bash
openspec store setup team-plans --path ~/openspec/team-plans \
  --remote git@github.com:acme/team-plans.git
git -C ~/openspec/team-plans push -u origin main
```

传入 `--remote` 会把克隆 URL 记录在该 store 自己的身份文件（`.openspec-store/store.yaml`）中，写在初始提交里。未来的每一次克隆从诞生起就知道它来自哪里，于是健康检查与错误消息能为还没有它的队友打印出一条完整、可粘贴的修复命令。

**每位成员（每台机器一次）：**

```bash
git clone git@github.com:acme/team-plans.git ~/openspec/team-plans
openspec store register ~/openspec/team-plans
```

从那以后，每个人都通过名称在同一个规划仓库中工作：

```bash
openspec status --store team-plans --change add-login
openspec show add-login --store team-plans
```

**共享工作就是 git，这是有意为之。** 你创建的 change 只存在于你的 checkout 中，直到你提交并推送它——和代码一样。计划天然获得分支、拉取请求和审查，因为 store 就是一个普通仓库。

**连接团队的代码仓库。** 一个把规划完全外置化的代码仓库，只需要在 `openspec/config.yaml` 中加一行：

```yaml
# web-app/openspec/config.yaml
store: team-plans
```

现在在 `web-app` 内运行的每条 OpenSpec 命令都会作用于 `team-plans`，无需任何标志：

```bash
cd ~/src/web-app
openspec status --change add-login
```

```
Using OpenSpec root: team-plans (/Users/you/openspec/team-plans)
...
```

这个指针是一个回退，永远不是覆盖：显式的 `--store` 始终胜出；如果该仓库自己长出了真正的规划文件夹，那些胜出（并伴有一个移除过期指针的警告）。

**为你机器上的每个仓库设一个默认。** 如果你在许多代码仓库之间工作，而它们都规划进同一个 store，那就一次性全局设置，而不是给每个仓库都加 `store:` 这一行：

```bash
openspec config set defaultStore team-plans
```

现在，任何在规划根目录之外运行的命令——且没有 `--store`、也没有项目指针——都会解析到 `team-plans`。它位于优先级列表的最底层，因此 `--store`、本地根目录和项目 `store:` 指针都仍然胜出。根横幅和 JSON 的 `root` 块会报告 `source: "global_default"` 以及 store id，于是你总能区分机器级默认与仓库自己的指针。用 `openspec config unset defaultStore` 清除它。如果 id 未注册，命令会报错，并提示你去注册它或清除过期的默认。

## 示例：一个功能，两个组件仓库

假设 `add-checkout-promo` 同时改动 `checkout-api` 和 `checkout-web`。团队想要一份共享的产品契约，而每个代码仓库仍需要自己的实现任务、分支和审查。

使用两层：

1. 把共享行为放在 `team-plans` 中。
2. 把实现计划放在每个组件仓库中，并把该 store 作为只读的上游上下文来引用。

首先，在 store 中规划共享契约：

```bash
openspec new change add-checkout-promo --store team-plans
openspec status --change add-checkout-promo --store team-plans
```

proposal 和 specs 应当描述组件之间的边界行为——例如，服务返回的促销字段，以及前端如何处理不符合资格的结账。像对待任何其他分支和拉取请求一样，在 store 仓库中审查这个 change。

### 规划能看到哪些上下文？

选择一个 store 会改变 OpenSpec 根目录；它并不会发现或读取每个使用该 store 的代码仓库。store 指令看到的是 store 中的 artifact 和已配置的上下文。只有当这些文件夹对 agent 或编辑器可用、且 agent 去读取时，它们才会看到组件代码。

workset 是一种方便的方式，可以一起打开规划 store 和两个代码仓库：

```bash
openspec workset create checkout-promo \
  --member ~/openspec/team-plans \
  --member ~/src/checkout-api \
  --member ~/src/checkout-web \
  --tool code
openspec workset open checkout-promo
```

这让这些文件夹在一个 IDE 工作区中可见。它不会把源码上下文复制进 store，不会选择受影响的仓库，也不会授予 agent 编辑它们的权限。把持久的跨组件事实放进共享 specs；不要依赖规划器记得它碰巧检查过的源码。

### 各仓库中如何实现启动？

当没有显式的 `--store` 或更近的 `openspec/` 根目录适用时，一条 `store: team-plans` 指针会把命令路由到那个 store。它并不会按 `apply` 被调用的目录来拆分一个 store 的任务列表。OpenSpec 目前不会把任务路由到仓库。

当每个组件需要独立的、范围明确的 apply/review 周期时，给它一个本地的 OpenSpec 根目录，并引用中央 store，而不是指向它：

```yaml
# checkout-api/openspec/config.yaml (and likewise in checkout-web)
schema: spec-driven
references:
  - team-plans
```

在共享契约被批准并出现在 store 的主 specs 中之后，为组件的那部分创建一个小的本地 change：

```bash
cd ~/src/checkout-api
openspec new change implement-checkout-promo-api

cd ~/src/checkout-web
openspec new change implement-checkout-promo-ui
```

每个仓库指令中的引用索引会提供该 store spec 的摘要，以及精确的 `openspec show ... --store team-plans` 获取命令。每个本地 proposal 引用那份共享契约，而它的 tasks 只描述该组件内的工作。然后分别在每个仓库中运行 `/opsx:apply`；根目录解析会把 artifact 和实现改动的范围限定在该仓库内。服务和前端的改动现在可以独立地测试、审查、合并和归档。

如果实现必须在共享 store 的 change 仍处于活动状态时就开始，用 `openspec show add-checkout-promo --store team-plans` 显式获取它；引用索引列出的是规范的 store specs，而非活动的 store change。把 store 分支与组件分支在它们的拉取请求描述中关联起来，这样审查者就能看到每个实现遵循的是哪个版本的契约。

## 故事：跨团队的需求

一个平台团队拥有需求。产品团队在它们自己的仓库中、用它们自己的设计去构建。一个 reference 描述了这种关系，而不挪动任何人的工作。

```
   platform-reqs (store)                 api-server (code repo)
   owned by the platform team            owned by a product team
   ┌──────────────────────────┐          ┌──────────────────────────┐
   │ openspec/specs/          │ ◀────────│ openspec/config.yaml     │
   │   payments/spec.md       │ reads    │   references:            │
   │   auth/spec.md           │          │     - platform-reqs      │
   │                          │          │ openspec/specs/          │
   │ openspec/changes/        │          │   (their own designs)    │
   │   platform work          │          │ openspec/changes/        │
   │                          │          │   (their own work)       │
   │                          │          └──────────────────────────┘
   └──────────────────────────┘
```

**产品团队在它仓库的 `openspec/config.yaml` 中声明它依赖什么：**

```yaml
references:
  - platform-reqs
```

references 是只读上下文。该仓库保留它自己的 `openspec/` 根目录；工作留在那里。变化之处在于：该仓库中的 `openspec instructions` 现在包含被引用 store 的 specs 索引——每个都带有一行摘要和精确的获取命令（`openspec show <spec-id> --type spec --store platform-reqs`）。在 `api-server` 中工作的 agent 可以找到上游的支付需求、引用它们，并在该仓库自己的根目录中编写它的底层设计——而无需任何人在各处粘贴上下文。

一个 reference 可以携带它的克隆来源，于是还没有该 store 的队友会得到完整的修复方案，而不是死路一条：

```yaml
references:
  - { id: platform-reqs, remote: "git@github.com:acme/platform-reqs.git" }
```

**当你想让计划和代码一起打开时，做一个 workset。** 这是个人的、显式的：每个人选择他们在机器上实际一起工作的文件夹。这些本地 checkout 路径的任何内容都不会提交到共享规划仓库。

```bash
openspec workset create platform \
  --member ~/openspec/platform-reqs \
  --member ~/src/api-server \
  --member ~/src/web-app
```

## 两个随时可问的问题

**"我的环境健康吗？"** —— `openspec doctor` 检查当前根目录及其引用的 stores，只读，并为每条发现提供可粘贴的修复命令：

```
Doctor

Root
  Location: /Users/you/src/api-server
  OpenSpec root: ok

References
  - platform-reqs: ok (/Users/you/openspec/platform-reqs)
  - design-system: Referenced store 'design-system' is not registered on this machine.
    Fix: git clone -- git@github.com:acme/design-system.git '/Users/you/openspec/design-system' && openspec store register '/Users/you/openspec/design-system' --id design-system

```

**"我在和什么打交道？"** —— `openspec context` 从 OpenSpec 声明中组装出工作集：根目录，以及它引用的 stores。

```
Working context for api-server (/Users/you/src/api-server)

OpenSpec root
  api-server  /Users/you/src/api-server

Referenced stores
  platform-reqs  /Users/you/openspec/platform-reqs
    Fetch: openspec show <spec-id> --type spec --store platform-reqs
```

两者都支持 `--json`，供 agent 使用。`openspec context --code-workspace <path>` 还会额外写入一个 VS Code 工作区文件，包含整个集合——这是该命令执行的唯一写操作。

## Worksets：重新打开你一起工作的文件夹

与上面所有内容都独立：大多数人每个会话都会一起打开同样的几个文件夹——规划仓库加上两三个代码仓库。一个 **workset** 正是这个的、个人的、具名的视图，用你工具中的一条命令重新打开。

```
  workset "platform"                 openspec workset open platform
  ├── team-plans   ~/openspec/team-plans         │
  ├── api-server   ~/src/api-server              ▼
  └── web-app      ~/src/web-app       all three open in your tool
```

```bash
openspec workset create platform \
  --member ~/openspec/team-plans --member ~/src/api-server \
  --tool code
openspec workset list
```

```
platform  (opens in VS Code)
  team-plans  /Users/you/openspec/team-plans
  api-server  /Users/you/src/api-server
```

`openspec workset open platform` 随后会启动保存的工具：编辑器（VS Code、Cursor）用一个窗口打开每个成员并返回。第一个成员是主成员。随时可用 `--tool <id>` 覆盖工具。

worksets 刻意*不是*共享状态。它们存在于你的机器上，永远不会被提交，也不对工作做任何声明——它们只记录你喜欢一起打开什么。移除一个永远不会触碰成员文件夹。新工具是配置，而非代码：任何通过工作区文件或按文件夹附加标志启动的东西，都可以添加到全局配置（`openspec config edit`）的 `openers` 键下。

## 命令如何决定在哪里执行

每条普通命令都以相同的方式、按此顺序解析它的根目录：

```
1. --store <id>          you said so explicitly        → that store
2. nearest openspec/     a real planning root here     → this repo
   (walking up from cwd)
3. store: pointer        config.yaml declares a store  → that store
4. defaultStore          global config sets a machine  → that store
                         default
5. none of the above     stores registered on this     → error with a
                         machine?                        selection hint
                         no stores registered?         → the current
                                                          directory
                                                          (classic behavior)
```

`Using OpenSpec root:` 这一行（以及 `--json` 输出中的 `root` 块）会告诉你处于哪种情况。

## 已知限制

- **Beta 形态。** 本页上的所有内容都可能在不同版本之间变化——名称、标志、文件格式、JSON 键。
- **每台机器每个 store id 一个 checkout。** 以相同 id 注册第二个 checkout 会失败，并提示先 `store unregister`。
- **永不同步——这是设计使然。** OpenSpec 永不克隆、拉取或推送。一个过期的 checkout 会一直显示过期的 specs，直到*你*去拉取；references 是从磁盘上任何现存内容实时索引的。
- **空的规划文件夹可能不存在。** 一个新的 store 在 Git 中可能还没有 `openspec/changes/`、`openspec/specs/`，或 `openspec/changes/archive/`。在 beta 期间这是被接受的；一旦普通命令为它们创建了文件，这些文件夹就会出现。
- **指针仓库保持指针身份。** 一个仅含配置的仓库，其 `openspec/config.yaml` 声明了 `store: <id>`，会被当作外置化的规划，而不是要注册的 store checkout。如果你有意要把那个仓库变成本地 store 根目录，先移除 `store:` 这一行。
- **有些命令留在原地。** `templates` 和被废弃的名词形式（`openspec change show`，……）只作用于当前目录——没有 `--store`。`schemas` 遵循规范的根目录选择优先级，并接受 `--store <id>`，同时保留它成功的 JSON 数组形态不变。
- **每机状态是每机的。** store 注册表和 worksets 都是本地设置。你机器布局的任何内容都永远不会提交到共享规划中。
- **worksets 有两种启动方式。** 一个无法用工作区文件或按文件夹附加标志启动的工具，不能被添加为 opener。
- **Agent JSON 有一个已知的命名大小写差异**（store 族键是 snake_case，workflow 族是 camelCase）。记录于 [agent contract](../agent-contract.md)；统一工作被推迟到一个有版本号的发布。

## 各归其位

| 内容 | 位置 | 是否共享 |
|---|---|---|
| store 的规划 | `<store>/openspec/`（specs、changes） | 是——提交并推送它 |
| store 的身份 | `<store>/.openspec-store/store.yaml` | 是——随 store 一起提交 |
| store 注册表 | `<data dir>/openspec/stores/registry.yaml` | 否——仅本机 |
| Worksets | `<data dir>/openspec/worksets/` | 否——仅本机 |

`<data dir>` 在 macOS 和 Linux 上是 `~/.local/share/openspec`（若设置了则是 `$XDG_DATA_HOME/openspec`），在 Windows 上是 `%LOCALAPPDATA%\openspec`。

## 参考

本页每个命令的确切标志与 JSON 形态：[CLI reference](../cli.md)（Stores、Doctor、Working context、Personal worksets）以及 [agent contract](../agent-contract.md)。
