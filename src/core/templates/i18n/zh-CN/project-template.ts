import { ProjectContext } from '../../project-template.js';

export const projectTemplate = (context: ProjectContext = {}) => `# ${context.projectName || '项目'} 上下文

## 目的
${context.description || '[描述您项目的目标和目的]'}

## 技术栈
${context.techStack?.length ? context.techStack.map(tech => `- ${tech}`).join('\n') : '- [列出您的主要技术]\n- [例如：TypeScript, React, Node.js]'}

## 项目约定

### 代码风格
[描述您的代码风格偏好、格式化规则和命名约定]

### 架构模式
[记录您的架构决策和模式]

### 测试策略
[说明您的测试方法和要求]

### Git 工作流
[描述您的分支策略和提交约定]

## 领域上下文
[添加 AI 助手需要理解的领域特定知识]

## 重要约束
[列出任何技术、业务或监管约束]

## 外部依赖
[记录关键的外部服务、API 或系统]
`;

