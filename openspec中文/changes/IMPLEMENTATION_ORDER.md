# 实施顺序和依赖关系

## 必需的实现顺序

由于依赖关系，以下变更必须按照此特定顺序实现：

### 阶段 1：基础
**1. add-zod-validation**（无依赖）
- 创建所有核心模式（RequirementSchema、ScenarioSchema、SpecSchema、ChangeSchema、DeltaSchema）
- 实现Markdown解析器工具
- 实现验证基础设施和规则
- 建立所有命令使用的验证模式
- 必须首先完成

### 阶段 2：变更命令
**2. add-change-commands**（依赖：add-zod-validation）
- 从zod验证中导入ChangeSchema和DeltaSchema
- 重用Markdown解析工具
- 实现具有内置验证的变更命令
- 使用验证基础设施进行变更验证子命令
- 在模式和验证存在之前无法开始

### 阶段 3：规范命令
**3. add-spec-commands**（依赖：add-zod-validation、add-change-commands）
- 从zod验证中导入RequirementSchema、ScenarioSchema、SpecSchema
- 重用Markdown解析工具
- 实现具有内置验证的规范命令
- 使用验证基础设施进行规范验证子命令
- 建立在变更命令建立的模式之上

## 依赖图
```
add-zod-validation
    ↓
add-change-commands
    ↓
add-spec-commands
```

## 关键依赖关系

### 共享代码依赖
1. **模式**：在add-zod-validation中创建的所有模式，被两个命令实现使用
2. **验证**：在add-zod-validation中创建的验证基础设施，集成到两个命令中
3. **解析器**：在add-zod-validation中创建的Markdown解析工具，被两个命令使用

### 文件依赖
- `src/core/schemas/*.schema.ts`（由add-zod-validation创建）→ 被两个命令导入
- `src/core/validation/validator.ts`（由add-zod-validation创建）→ 被两个命令使用
- `src/core/parsers/markdown-parser.ts`（由add-zod-validation创建）→ 被两个命令使用

## 实施说明

### 对于开发者
1. 在进入下一阶段之前完整完成每个阶段
2. 每个阶段后运行测试以确保稳定性
3. 传统的`list`命令在整个过程中保持功能正常

### 对于CI/CD
1. 每个变更可以独立验证
2. 每个阶段后应运行集成测试
3. 阶段3后需要完整的系统测试

### 并行工作机会
在每个阶段内，以下可以并行完成：
- **阶段1**：模式设计、验证规则和解析器实现
- **阶段2**：变更命令功能和传统兼容性工作
- **阶段3**：规范命令功能和最终集成