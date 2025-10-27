export interface ProjectContext {
  projectName?: string;
  description?: string;
  techStack?: string[];
  conventions?: string;
}

export const projectTemplateZh = (context: ProjectContext = {}) => `# ${context.projectName || '项目'} 上下文

## 项目目的
${context.description || '[描述您的项目目的和目标]'}

## 技术栈
${context.techStack?.length ? context.techStack.map(tech => `- ${tech}`).join('\n') : '- [列出您的主要技术]\n- [例如：TypeScript、React、Node.js]'}

## 项目约定

### 代码风格
[描述您的代码风格偏好、格式化规则和命名约定]

### 架构模式
[记录您的架构决策和模式]

### 测试策略
[解释您的测试方法和要求]

### Git 工作流
[描述您的分支策略和提交约定]

## 领域上下文
[添加 AI 助手需要理解的领域特定知识]

## 重要约束
[列出任何技术、业务或法规约束]

## 外部依赖
[记录关键的外部服务、API 或系统]
`;