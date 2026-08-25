/**
 * 使用 Node.js 进程的有效本地时区格式化日期。
 *
 * 结果与区域设置无关，适用于纯日期元数据和路径前缀。
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
