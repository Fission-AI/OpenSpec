/**
 * 一种 kebab id 语法。Store id、change id 和旧版 initiative id
 * 都共用它。
 */
export const KEBAB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isKebabId(value: string): boolean {
  return KEBAB_ID_REGEX.test(value);
}

/** 语法的人类可读描述，共享以确保措辞永远不会分叉。 */
export const KEBAB_ID_DESCRIPTION =
  '必须为 kebab-case，使用小写字母、数字和单个连字符分隔符';

/** KEBAB_ID_DESCRIPTION 的修复行双胞胎，出于同样的原因共享。 */
export const KEBAB_ID_FIX =
  '使用 kebab-case，使用小写字母、数字和单个连字符分隔符。';

/**
 * 文件夹安全名称语法（store id 在其之上叠加了 kebab 语法；
 * workset 成员标签单独使用它）。返回问题描述，或在有效时返回 null。
 */
export function folderStyleNameProblem(
  value: string,
  label: string
): string | null {
  if (value.length === 0) {
    return `${label} 不能为空`;
  }

  if (value === '.' || value === '..') {
    return `${label} 不能为 '${value}'`;
  }

  if (/[\\/]/u.test(value)) {
    return `${label} 不能包含路径分隔符`;
  }

  return null;
}
