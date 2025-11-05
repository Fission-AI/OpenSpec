# OpenSpec CLI Bug Analysis

## Environment Setup ✅

- **Fork创建**: `https://github.com/yha9806/OpenSpec`
- **本地路径**: `I:\OpenSpec-Fix`
- **Node.js版本**: v20.19.4 ✅
- **pnpm版本**: 10.20.0 ✅
- **测试结果**: 265/266 通过 (99.6%) ✅

## Bug #164: Delta Validation Parsing Failure

### 问题描述

用户报告 `openspec validate --strict` 失败并报错 "no deltas found"，但 `openspec show --json --deltas-only` 可以成功解析相同文件。

### 根本原因分析

通过代码审查发现问题出在 **validator.ts** 的 `validateChangeDeltaSpecs()` 方法 (lines 113-272)：

#### 关键发现：

1. **验证逻辑缺陷** (lines 142-145):
```typescript
const hasEntries = plan.added.length + plan.modified.length +
                   plan.removed.length + plan.renamed.length > 0;
if (!hasEntries) {
  if (hasSections) emptySectionSpecs.push({ path: entryPath, sections: sectionNames });
  else missingHeaderSpecs.push(entryPath);
}
```

2. **Delta 解析在 requirement-blocks.ts**:
   - `parseDeltaSpec()` (lines 119-142): 正确解析所有 delta sections
   - `parseRequirementBlocksFromSection()` (lines 172-194): 使用正则 `/^###\s+Requirement:/`

3. **潜在问题**:
   - 正则表达式可能对空格敏感
   - 行尾符处理 (CRLF vs LF) 可能导致解析失败
   - `normalizeLineEndings()` (lines 112-114) 已经处理了行尾符，但可能在某些情况下失效

### Bug #2: 归档 Changes 无法识别

#### 问题描述

CLI 无法识别 `openspec/changes/archive/` 目录下的 changes。

#### 需要调查的文件：

- `src/core/list.ts` - 列表命令实现
- `src/commands/change.ts` 或类似文件 - change 命令实现
- 需要查找目录扫描逻辑

## 修复计划

### Phase 1: Delta 验证 Bug

1. **增强行尾符处理**:
   - 确保所有输入在正则匹配前都经过 `normalizeLineEndings()`
   - 添加调试日志记录解析失败的行

2. **优化正则表达式**:
   - 当前: `/^###\s+Requirement:/`
   - 考虑: `/^###\s*Requirement:\s*/` (允许0个或多个空格)

3. **改进错误消息**:
   - 当找到 section header 但没有解析到 requirements 时，输出具体哪些行被跳过
   - 提供示例格式

### Phase 2: 归档 Changes 识别

1. 定位目录扫描代码
2. 添加对 `archive/` 子目录的支持
3. 可能需要递归扫描或添加 `--include-archived` 标志

### Phase 3: 测试

1. 创建测试用例重现 Issue #164
2. 验证修复对现有测试的影响
3. 添加边界情况测试（CRLF, 额外空格，等）

## 下一步行动

1. 创建新分支 `fix/issue-164-delta-validation`
2. 修复 delta 解析逻辑
3. 运行测试套件验证
4. 提交 PR 到上游

---

**Created**: 2025-11-05
**Author**: yha9806
**Issue Reference**: https://github.com/Fission-AI/OpenSpec/issues/164
