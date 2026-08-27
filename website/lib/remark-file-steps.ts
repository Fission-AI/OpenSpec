// Turns `file-steps` fences into the interactive <FileSteps> stepper, the
// same mdxJsxFlowElement injection remarkMdxMermaid and remarkGfmAlert use.
// The fence body stays readable on GitHub: `## ` lines start a step, `> `
// lines are the step's caption, and the remaining lines are a file tree
// whose two-character gutter (`+ ` added, `- ` removed, `  ` unchanged)
// reads like a diff.

interface Node {
  type: string;
  lang?: string | null;
  value?: string;
  children?: Node[];
  [key: string]: unknown;
}

function transform(node: Node): void {
  if (!node.children) return;

  node.children.forEach((child, index) => {
    transform(child);
    if (child.type !== 'code' || child.lang !== 'file-steps') return;

    node.children![index] = {
      type: 'mdxJsxFlowElement',
      name: 'FileSteps',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'content', value: child.value ?? '' },
      ],
      children: [],
    };
  });
}

export function remarkFileSteps() {
  return (tree: Node) => {
    transform(tree);
  };
}
