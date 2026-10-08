// Turns the FAQ page's `##` question sections into Fumadocs Accordion
// elements, the same mdxJsxFlowElement injection remarkGfmAlert and
// remarkFileSteps use, so the doc stays plain headings on GitHub while the
// site renders a collapsible FAQ.
//
// Applies only to files named `faq` (the synced content/docs/faq.md); every
// other page keeps its headings. Each accordion gets a GitHub-style slug id so
// existing `#heading-anchor` deep links still open the right question.
// getLLMText (lib/source.ts) round-trips the accordions back to `##` headings.

interface Node {
  type: string;
  depth?: number;
  value?: string;
  children?: Node[];
  [key: string]: unknown;
}

function toText(node: Node): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  return (node.children ?? []).map(toText).join('');
}

// Matches github-slugger for plain-text titles, which is what the sync'd
// heading anchors used.
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function accordion(title: string, children: Node[]): Node {
  return {
    type: 'mdxJsxFlowElement',
    name: 'Accordion',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'title', value: title },
      { type: 'mdxJsxAttribute', name: 'id', value: slugify(title) },
    ],
    children,
  };
}

export function remarkFaq() {
  return (tree: Node, file: { stem?: string | null }) => {
    if (file.stem !== 'faq' || !tree.children) return;

    const first = tree.children.findIndex(
      (child) => child.type === 'heading' && child.depth === 2,
    );
    if (first === -1) return;

    const accordions: Node[] = [];
    let title: string | undefined;
    let body: Node[] = [];
    for (const child of tree.children.slice(first)) {
      if (child.type === 'heading' && child.depth === 2) {
        if (title !== undefined) accordions.push(accordion(title, body));
        title = toText(child);
        body = [];
      } else {
        body.push(child);
      }
    }
    if (title !== undefined) accordions.push(accordion(title, body));

    tree.children = [
      ...tree.children.slice(0, first),
      { type: 'mdxJsxFlowElement', name: 'Accordions', attributes: [], children: accordions },
    ];
  };
}
