import type { ProjectConfig } from './project-config.js';

/**
 * 将配置序列化为带有有用注释的 YAML 字符串。
 *
 * @param config - 部分配置对象（schema 必填，其他字段可选）
 * @returns 准备好写入文件的 YAML 字符串
 */
export function serializeConfig(config: Partial<ProjectConfig>): string {
  const lines: string[] = [];

  // Schema（必填）
  lines.push(`schema: ${config.schema}`);
  lines.push('');

  if (config.context !== undefined) {
    lines.push('context: |');
    for (const line of config.context.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  } else {
    // 带注释的上下文部分
    lines.push('# 项目上下文（可选）');
    lines.push('# 这会在 AI 创建 artifact 时展示给它。');
    lines.push('# 添加您的技术栈、约定、风格指南、领域知识等。');
    lines.push('# 示例：');
    lines.push('#   context: |');
    lines.push('#     技术栈：TypeScript、React、Node.js');
    lines.push('#     我们使用约定式提交');
    lines.push('#     领域：电商平台');
    lines.push('');
  }

  // 带注释的规则部分
  lines.push('# 按 artifact 划分的规则（可选）');
  lines.push('# 为特定 artifact 添加自定义规则。');
  lines.push('# 示例：');
  lines.push('#   rules:');
  lines.push('#     proposal:');
  lines.push('#       - 提案保持在 500 字以下');
  lines.push('#       - 始终包含"非目标"部分');
  lines.push('#     tasks:');
  lines.push('#       - 将任务拆分为最多 2 小时的块');
  lines.push('');

  // 带注释的操作指南部分
  lines.push('# 按操作划分的指南（可选）');
  lines.push('# 添加关于如何执行 apply 和 archive 操作的建议性指南。');
  lines.push('# 这与上面的 artifact 规则是分开的。');
  lines.push('# 示例：');
  lines.push('#   operations:');
  lines.push('#     apply:');
  lines.push('#       guidance:');
  lines.push('#         - 保持测试摘要简洁');
  lines.push('#     archive:');
  lines.push('#       guidance:');
  lines.push('#         - 完成前总结 archive 结果');

  return lines.join('\n') + '\n';
}
