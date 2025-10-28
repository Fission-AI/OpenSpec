# OpenSpec 支持 Qwen Code 集成方案

## 1. OpenSpec AI工具支持机制分析

### 1.1 当前支持的AI工具类型

OpenSpec通过两种主要方式支持AI工具：

**A. 原生斜杠命令支持**
- 为特定AI工具提供定制的命令文件
- 每个工具都有特定的文件结构和配置
- 支持的工具包括 Claude Code、Cursor、GitHub Copilot、Cline、Crush、Kilo Code、Windsurf、Codex、Amazon Q Developer、Auggie 等

**B. AGENTS.md 兼容标准**
- 通用工作流程说明，支持 Amp、VS Code、GitHub Copilot、Jules、Gemini CLI 等工具
- 所有工具都可以从 `openspec/AGENTS.md` 读取工作流程说明

### 1.2 技术架构

**配置器系统 (Configurators)**
- 每个AI工具都有对应的配置器类
- 处理工具特定的文件生成和设置
- 位于 `src/core/configurators/` 目录

**注册表系统 (Registry)**
- 集中式管理所有支持的工具
- 包含主注册表和斜杠命令注册表
- 统一管理工具的配置和生成

**模板系统 (Templates)**
- 使用统一的模板生成AI助手指令
- 确保不同工具的指令内容一致性

### 1.3 文件结构约定

**斜杠命令文件**
- Cursor: `.cursor/rules/` - `cursor-*.md` 文件
- Cline: `.clinerules/` 目录 - `openspec-*.md` 文件  
- GitHub Copilot: `.github/prompts/` 目录
- Claude: `CLAUDE.md` 或 `.claude/` 目录
- **Qwen Code**: 应该使用 `.qwen/commands/` 目录

**命名模式**
- 斜杠命令通常遵循 `{prefix}-{command}` 模式
- 例如：`/openspec-proposal`, `/openspec-apply`, `/openspec-archive`

## 2. spec-kit 的 Qwen Code 支持方式

基于对spec-kit架构的分析，spec-kit通常通过以下方式支持Qwen Code：

### 2.1 文件结构
```markdown
.qwen/
├── commands/
│   ├── openspec-proposal.md
│   ├── openspec-apply.md
│   └── openspec-archive.md
```

### 2.2 命令格式
Qwen Code的命令文件通常包含：
- YAML frontmatter (元数据配置)
- Markdown格式的指令内容
- 特定的命令标识符

### 2.3 工作流程
- Qwen Code从 `.qwen/commands/` 目录自动加载命令
- 命令触发OpenSpec的提案、应用、归档工作流程
- 遵循标准的OpenSpec规范格式

## 3. OpenSpec 集成 Qwen Code 实施方案

### 3.1 文件结构实现

我们需要在OpenSpec中添加以下文件：

**斜杠命令配置器**
```
src/core/configurators/slash/qwen.ts
```

**Qwen基础配置器**  
```
src/core/configurators/qwen.ts
```

**更新注册表**
- `src/core/configurators/slash/registry.ts`
- `src/core/configurators/registry.ts`
- `src/core/config.ts`

### 3.2 技术实现

基于OpenSpec的架构模式，Qwen Code支持需要实现：

**1. Qwen斜杠命令配置器**

```typescript
// src/core/configurators/slash/qwen.ts
import { SlashCommandConfigurator } from '../base';
import { TemplateManager } from '../../templates';

export class QwenSlashCommandConfigurator extends SlashCommandConfigurator {
  name = 'Qwen Code';
  configFileName = 'qwen';
  commandDir = '.qwen/commands';
  
  protected getTemplateType(): string {
    return 'qwen-slash-command';
  }
  
  async generate(): Promise<void> {
    const commands = ['proposal', 'apply', 'archive'];
    const commandDir = this.getPath(this.commandDir);
    
    await this.ensureDir(commandDir);
    
    for (const command of commands) {
      const content = TemplateManager.getQwenSlashCommandTemplate(command);
      await this.writeConfigFile(
        `${this.commandDir}/openspec-${command}.md`,
        content
      );
    }
  }
}
```

**2. Qwen基础配置器**

```typescript
// src/core/configurators/qwen.ts
import { Configurator } from '../base';
import { TemplateManager } from '../../templates';

export class QwenConfigurator extends Configurator {
  name = 'Qwen Code';
  configFileName = 'qwen';
  available = true;
  successLabel = 'Qwen Code';
  
  async generate(): Promise<void> {
    // Qwen Code使用斜杠命令，不需要额外的配置文件
    // 只需确保斜杠命令文件存在
  }
  
  async update(): Promise<void> {
    await this.generate();
  }
}
```

**3. 更新注册表**

在 `src/core/configurators/slash/registry.ts` 中添加：
```typescript
import { QwenSlashCommandConfigurator } from './qwen';

export const slashConfigurators = [
  // ... 其他配置器
  new QwenSlashCommandConfigurator(),
];
```

在 `src/core/configurators/registry.ts` 中添加：
```typescript
import { QwenConfigurator } from './qwen';

export const configurators = [
  // ... 其他配置器
  new QwenConfigurator(),
];
```

**4. 更新工具列表**

在 `src/core/config.ts` 的 `getAITools()` 方法中添加Qwen选项：

```typescript
{
  name: 'Qwen Code',
  value: 'qwen',
  available: true,
  successLabel: 'Qwen Code'
}
```

### 3.3 命令文件模板

Qwen命令文件应包含：

**.qwen/commands/openspec-proposal.md**
```markdown
---
name: "/openspec-proposal"
id: "openspec_proposal"
category: "OpenSpec"
description: "Create an OpenSpec change proposal"
---

# OpenSpec Proposal Command

Create an OpenSpec change proposal for the requested feature or change.

## Instructions
- Create a new change directory under `openspec/changes/[change-id]/`
- Generate `proposal.md`, `tasks.md`, and spec deltas
- Follow OpenSpec delta format with ADDED/MODIFIED/REMOVED sections
- Include at least one scenario per requirement
```

### 3.4 README更新

在README的"Supported AI Tools"部分添加Qwen:

```markdown
| **Qwen Code** | `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` (`.qwen/commands/`) |
```

## 4. 集成验证

### 4.1 集成功能测试
- 运行 `openspec init` 并选择 Qwen Code 工具
- 验证 `.qwen/commands/` 目录和相关文件是否正确生成
- 测试斜杠命令是否在Qwen Code中可用

### 4.2 工作流程测试
- 验证 `/openspec-proposal` 命令能正确创建提案
- 验证 `/openspec-apply` 命令能正确应用变更  
- 验证 `/openspec-archive` 命令能正确归档变更

## 5. 使用说明

### 5.1 安装配置
用户在运行 `openspec init` 时选择 Qwen Code 工具，系统会自动创建：
- `.qwen/commands/openspec-proposal.md`
- `.qwen/commands/openspec-apply.md` 
- `.qwen/commands/openspec-archive.md`

### 5.2 命令使用
- `/openspec-proposal [description]` - 创建变更提案
- `/openspec-apply [change-id]` - 应用变更
- `/openspec-archive [change-id]` - 归档变更

### 5.3 工作流程集成
Qwen Code现在可以完全参与OpenSpec的工作流程：
1. 使用 `/openspec-proposal` 创建规范提案
2. 迭代和完善规范和任务
3. 使用 `/openspec-apply` 实现变更
4. 使用 `/openspec-archive` 完成变更归档

## 6. 技术规范

### 6.1 文件路径
- 配置器位置: `src/core/configurators/qwen.ts`
- 斜杠命令配置器: `src/core/configurators/slash/qwen.ts`
- 生成文件路径: `.qwen/commands/`

### 6.2 命令约定
- 命令前缀: `openspec-`
- 支持命令: `proposal`, `apply`, `archive`
- 文件格式: `.qwen/commands/openspec-{command}.md`

### 6.3 兼容性
- 与现有OpenSpec工作流程完全兼容
- 与AGENTS.md标准兼容
- 遵循OpenSpec的模板和格式约定

## 7. 维护和扩展

### 7.1 持续维护
- 在 `openspec update` 时同步更新Qwen命令文件
- 保持与其他AI工具功能同步
- 遵循OpenSpec的版本更新

### 7.2 可能的扩展
- 支持Qwen Code的更多自定义命令
- 集成Qwen Code的特定功能特性
- 提供Qwen Code专用的优化指令

这个集成方案确保了Qwen Code用户能够获得与其它AI工具相同的功能和体验，同时保持OpenSpec生态系统的一致性和完整性。