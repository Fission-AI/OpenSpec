# 初始化命令的技术设计

## 架构概述

初始化命令遵循模块化架构，关注点清晰分离：

```
CLI 层 (src/cli/index.ts)
    ↓
核心逻辑 (src/core/init.ts)
    ↓
模板 (src/core/templates/)
    ↓
文件系统工具 (src/utils/file-system.ts)
```

## 关键设计决策

### 1. 模板管理

**决策**：将模板存储为 TypeScript 模块而不是独立文件
**理由**：
- 确保模板与编译后的代码捆绑
- 允许动态内容插入
- 类型安全的模板处理
- 无需复杂的文件路径解析

### 2. 交互模式 vs 非交互模式

**决策**：支持交互模式（默认）和非交互模式
**理由**：
- 交互模式提升开发者体验
- 非交互模式用于 CI/CD 和自动化
- 标志：`--yes` 接受默认值，`--no-input` 完全自动化

### 3. 目录结构创建

**决策**：预先创建所有目录，然后填充文件
**理由**：
- 权限问题时快速失败
- 清晰的事务边界
- 失败时更容易清理

### 4. 错误处理策略

**决策**：失败时实现回滚
**理由**：
- 防止部分安装
- 清晰的错误状态
- 更好的用户体验

## 实现细节

### 文件系统操作

```typescript
// 带回滚的原子目录创建
interface InitTransaction {
  createdPaths: string[];
  rollback(): Promise<void>;
  commit(): Promise<void>;
}
```

### 模板系统

```typescript
interface Template {
  path: string;
  content: string | ((context: ProjectContext) => string);
}

interface ProjectContext {
  projectName: string;
  description: string;
  techStack: string[];
  conventions: string;
}
```

### CLI 命令结构

```bash
openspec init [path]           # 在指定路径初始化（默认：当前目录）
  --yes                       # 接受所有默认值
  --no-input                  # 跳过所有提示
  --force                     # 覆盖现有的 OpenSpec 目录
  --dry-run                   # 显示将要创建的内容
```

## 安全考虑

1. **路径遍历**：清理所有用户提供的路径
2. **文件权限**：开始前检查写入权限
3. **现有文件**：除非明确使用 --force 标志，否则从不覆盖
4. **模板注入**：清理模板中的用户输入

## 未来可扩展性

该设计支持未来的增强功能：
- 自定义模板源
- 项目类型预设（API、Web 应用、库）
- 从其他文档系统迁移
- 与版本控制系统的集成