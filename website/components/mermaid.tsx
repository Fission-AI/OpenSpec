import { renderMermaidSVG } from 'beautiful-mermaid';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';

export function Mermaid({ chart }: { chart: string }) {
  try {
    // beautiful-mermaid injects remote font imports; the site already provides Inter.
    const svg = renderMermaidSVG(chart, {
      bg: 'var(--color-fd-background)',
      fg: 'var(--color-fd-foreground)',
      transparent: true,
    }).replace(/^\s*@import url\(['"]https:\/\/fonts\.googleapis\.com\/[^)]*\);\s*$/m, '');

    return (
      <figure>
        <div
          aria-label="Scrollable Mermaid diagram"
          className="overflow-x-auto"
          role="region"
          tabIndex={0}
        >
          <div
            aria-hidden="true"
            className="[&_svg]:h-auto [&_svg]:max-w-full [&_svg]:min-w-[40rem]"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        <figcaption className="sr-only">Mermaid diagram source: {chart}</figcaption>
      </figure>
    );
  } catch {
    return (
      <CodeBlock title="Mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    );
  }
}
