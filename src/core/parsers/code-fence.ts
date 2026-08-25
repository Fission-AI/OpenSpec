/**
 * Markdown 解析器的共享围栏代码块检测。
 *
 * 多个解析器需要忽略出现在围栏代码块内的 Markdown 结构（标题、需求块、
 * 场景、delta 节）。将此逻辑放在一处避免了之前 `requirement-blocks.ts`
 * 在验证和归档时将围栏内的 `### Requirement:` 行当作真实需求处理的问题。
 */

interface ActiveFence {
  marker: '`' | '~';
  length: number;
}

function getFenceMarker(line: string): ActiveFence | null {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
  if (!fenceMatch) {
    return null;
  }

  return {
    marker: fenceMatch[1][0] as '`' | '~',
    length: fenceMatch[1].length,
  };
}

function isClosingFence(line: string, activeFence: ActiveFence): boolean {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return Boolean(
    fenceMatch &&
    fenceMatch[1][0] === activeFence.marker &&
    fenceMatch[1].length >= activeFence.length
  );
}

/**
 * 构建每行的掩码，其中 `true` 标记属于围栏代码块的行
 * （包括开头和结尾的围栏行本身）。
 */
export function buildCodeFenceMask(lines: string[]): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  let activeFence: ActiveFence | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (!activeFence) {
      const fence = getFenceMarker(lines[i]);
      if (fence) {
        activeFence = fence;
        mask[i] = true;
      }
      continue;
    }

    mask[i] = true;
    if (isClosingFence(lines[i], activeFence)) {
      activeFence = null;
    }
  }

  return mask;
}
