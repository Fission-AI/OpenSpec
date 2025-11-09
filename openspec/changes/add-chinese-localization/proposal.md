## Why
当前OpenSpec项目使用英文文档和交互，这对中国开发者团队造成了使用障碍。为了提高本地化体验和团队协作效率，需要将规范模板翻译为中文，并明确要求使用中文进行交互。同时，改进工作流以确保提案的串行处理和明确的实施授权。

## What Changes
- 将OpenSpec的规范文件模板翻译为中文，确保符合当前项目的设计目标
- 在AI交互约定中明确要求使用中文进行交互和问答
- 改进工作流：强制串行处理提案，一个提案完成后才能开始下一个
- 明确提案流程：创建提案 → 反复讨论 → 接收明确指令 → 开始实现 → 归档提案
- 禁止在未收到明确指令前实施提案
- 将提案讨论期间的所有交互自动视为对当前提案的更新
- 在生成任务清单前，先生成技术方案并讨论可行性

## Impact
- Affected specs: `specs/openspec-conventions`, `specs/docs-agent-instructions`
- Affected code: `src/core/templates/`, `openspec/AGENTS.md`, `openspec/project.md`
- Affected tools: 所有支持的AI编码助手
